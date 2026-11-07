import { contentAwareFill, DEFAULT_SEED } from "./resynthesizer.js";

const { range, select, text } = paintDotJs.controls;

const SAMPLE_CHOICES = [
    ["all-around", "All Around"],
    ["sides", "Sides"],
    ["top-bottom", "Top and Bottom"]
];

const DIRECTION_CHOICES = [
    ["random", "Random"],
    ["inward", "Inwards towards center"],
    ["outward", "Outwards from center"]
];

function showSelectionError(context) {
    return paintDotJs.dialogs.alert({
        title: context.title,
        icon: context.icon,
        message:
            "There is no active selection or the entire image is selected.\n\n" +
            "This plugin requires that a portion of the image remain unselected so that it can " +
            "replace the contents of the selection with pixels that are the closest match in the " +
            "unselected area."
    }).then(() => null);
}

function createHeader(parent, text) {
    const header = document.createElement("div");
    header.textContent = text;
    header.style.cssText = "border-bottom:1px solid var(--color-border,#888);font-size:12px;line-height:18px";
    parent.appendChild(header);
    return header;
}

function createSelect(parent, values, key, choices, requestPreview) {
    const select = document.createElement("select");
    select.style.cssText = "box-sizing:border-box;width:152px;height:23px;font-size:12px";
    parent.appendChild(select);
    for (const [value, label] of choices) {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = label;
        select.appendChild(option);
    }
    select.value = values[key];
    select.onchange = () => {
        values[key] = select.value;
        requestPreview();
    };
    return select;
}

function createResetButton(parent, title, reset) {
    const button = document.createElement("button");
    button.type = "button";
    button.title = title;
    button.style.cssText = "box-sizing:border-box;width:24px;height:23px;padding:2px";
    button.onclick = reset;
    parent.appendChild(button);
    {
        const icon = document.createElement("img");
        icon.src = paintDotJs.asset("reset.png");
        icon.alt = "";
        icon.style.cssText = "width:16px;height:16px";
        button.appendChild(icon);
    }
    return button;
}

function configure(context) {
    if (context.selection === null) {
        return showSelectionError(context);
    }

    return new Promise((resolve) => {
        const values =
            typeof structuredClone === "function"
                ? structuredClone(context.values)
                : JSON.parse(JSON.stringify(context.values));
        const window = paintDotJs.dialogs.create({
            title: context.title,
            icon: context.icon,
            className: "content-aware-fill-dialog",
            contentClassName: "content-aware-fill-content"
        });
        window.dialog.style.cssText = "width:337px;font-size:12px";
        window.content.style.cssText = "display:grid;gap:4px;padding:7px 12px 4px";

        let renderAutomatically = true;
        let renderGeneration = 0;
        let finished = false;
        let applyButton;
        let statusText;
        let progress;
        const requestPreview = async () => {
            if (!renderAutomatically || finished) {
                return;
            }
            const generation = ++renderGeneration;
            statusText.textContent = "Rendering...";
            progress.removeAttribute("value");
            try {
                await context.preview({ ...values });
            } catch (error) {
                console.error("Content Aware Fill preview failed", error);
                if (generation === renderGeneration && !finished) {
                    statusText.textContent = "Preview failed";
                }
            } finally {
                if (generation === renderGeneration && !finished) {
                    if (statusText.textContent !== "Preview failed") {
                        statusText.textContent = "Ready";
                    }
                    progress.value = 0;
                }
            }
        };

        // Sample area size
        createHeader(window.content, "Sample area size (in pixels):");
        const sampleRow = document.createElement("div");
        sampleRow.style.cssText = "display:grid;grid-template-columns:1fr 61px 24px;gap:6px;align-items:center";
        window.content.appendChild(sampleRow);
        let sampleRange;
        let sampleNumber;
        const setSampleSize = (value) => {
            const numeric = Math.max(1, Math.min(100, Number(value)));
            values["sample-size"] = numeric;
            sampleRange.value = numeric;
            sampleNumber.value = numeric;
            sampleRange.style.setProperty("--effect-value", `${numeric}%`);
        };
        {
            sampleRange = document.createElement("input");
            sampleRange.type = "range";
            sampleRange.min = "1";
            sampleRange.max = "100";
            sampleRange.step = "1";
            sampleRange.style.width = "100%";
            sampleRange.oninput = () => {
                setSampleSize(sampleRange.value);
                void requestPreview();
            };
            sampleRow.appendChild(sampleRange);

            sampleNumber = document.createElement("input");
            sampleNumber.type = "number";
            sampleNumber.min = "1";
            sampleNumber.max = "100";
            sampleNumber.step = "1";
            sampleNumber.style.textAlign = "right";
            sampleNumber.oninput = () => {
                setSampleSize(sampleNumber.value);
                void requestPreview();
            };
            const sampleNumberControl = paintDotJs.dialogs.wrapNumberInput(sampleNumber);
            sampleNumberControl.style.cssText = "width:61px;height:23px";
            sampleRow.appendChild(sampleNumberControl);

            createResetButton(sampleRow, "Reset sample area size", () => {
                setSampleSize(50);
                void requestPreview();
            });
        }
        setSampleSize(values["sample-size"]);

        // Sampling and fill direction
        createHeader(window.content, "Sample from:");
        createSelect(window.content, values, "sample-from", SAMPLE_CHOICES, requestPreview);
        createHeader(window.content, "Fill direction:");
        createSelect(window.content, values, "fill-direction", DIRECTION_CHOICES, requestPreview);

        // Random seed
        createHeader(window.content, "Seed");
        const seedRow = document.createElement("div");
        seedRow.style.cssText = "display:grid;grid-template-columns:152px 24px 1fr 75px;gap:6px;align-items:center";
        window.content.appendChild(seedRow);
        let seedInput;
        const setSeed = (value) => {
            values.seed = String(Math.max(0, Math.min(2147483647, Math.trunc(Number(value)))));
            seedInput.value = values.seed;
        };
        {
            seedInput = document.createElement("input");
            seedInput.type = "number";
            seedInput.min = "0";
            seedInput.max = "2147483647";
            seedInput.step = "1";
            seedInput.style.textAlign = "right";
            seedInput.oninput = () => {
                setSeed(seedInput.value);
                void requestPreview();
            };
            const seedInputControl = paintDotJs.dialogs.wrapNumberInput(seedInput);
            seedInputControl.style.cssText = "width:152px;height:23px";
            seedRow.appendChild(seedInputControl);

            createResetButton(seedRow, "Reset seed", () => {
                setSeed(DEFAULT_SEED);
                void requestPreview();
            });

            const spacer = document.createElement("span");
            seedRow.appendChild(spacer);

            const randomize = document.createElement("button");
            randomize.type = "button";
            randomize.textContent = "Randomize";
            randomize.style.cssText =
                "box-sizing:border-box;width:75px;height:23px;padding:2px 6px;font-size:12px";
            randomize.onclick = () => {
                setSeed(Math.floor(Math.random() * 2147483648));
                void requestPreview();
            };
            seedRow.appendChild(randomize);
        }
        setSeed(values.seed);

        // Render controls
        const renderRow = document.createElement("div");
        renderRow.style.cssText = "display:grid;grid-template-columns:1fr 75px;align-items:center;margin-top:8px";
        window.content.appendChild(renderRow);
        {
            const autoRender = document.createElement("label");
            autoRender.style.cssText =
                "display:flex;align-items:center;gap:4px;height:23px;line-height:1";
            renderRow.appendChild(autoRender);
            {
                const checkbox = document.createElement("input");
                checkbox.type = "checkbox";
                checkbox.checked = true;
                checkbox.style.margin = "0";
                checkbox.onchange = () => {
                    renderAutomatically = checkbox.checked;
                    applyButton.disabled = renderAutomatically;
                    if (renderAutomatically) {
                        void requestPreview();
                    }
                };
                autoRender.append(checkbox, document.createTextNode("Render automatically"));
            }

            applyButton = document.createElement("button");
            applyButton.type = "button";
            applyButton.textContent = "Apply";
            applyButton.style.cssText =
                "box-sizing:border-box;width:75px;height:23px;padding:2px 6px;font-size:12px";
            applyButton.disabled = true;
            applyButton.onclick = () => {
                const previous = renderAutomatically;
                renderAutomatically = true;
                void requestPreview().finally(() => {
                    renderAutomatically = previous;
                });
            };
            renderRow.appendChild(applyButton);
        }

        const actionsRow = document.createElement("div");
        actionsRow.style.cssText = "display:grid;grid-template-columns:1fr 75px 75px;gap:6px;align-items:center";
        window.content.appendChild(actionsRow);
        {
            const donate = document.createElement("a");
            donate.href = "https://forums.getpaint.net/index.php?showtopic=112730";
            donate.target = "_blank";
            donate.rel = "noopener noreferrer";
            donate.textContent = "Donate!";
            actionsRow.appendChild(donate);

            const okay = document.createElement("button");
            okay.type = "submit";
            okay.textContent = "OK";
            okay.style.cssText =
                "box-sizing:border-box;width:75px;height:23px;padding:2px 6px;font-size:12px";
            actionsRow.appendChild(okay);

            const cancel = document.createElement("button");
            cancel.type = "button";
            cancel.textContent = "Cancel";
            cancel.style.cssText =
                "box-sizing:border-box;width:75px;height:23px;padding:2px 6px;font-size:12px";
            actionsRow.appendChild(cancel);

            const finish = (result) => {
                if (finished) {
                    return;
                }
                finished = true;
                ++renderGeneration;
                document.removeEventListener("keydown", onKeyDown, true);
                window.destroy();
                if (result === null) {
                    void context.showOriginal();
                }
                resolve(result);
            };
            const onKeyDown = (event) => {
                if (event.key === "Escape") {
                    event.preventDefault();
                    finish(null);
                }
            };
            window.dialog.onsubmit = (event) => {
                event.preventDefault();
                finish({ ...values });
            };
            cancel.onclick = () => finish(null);
            window.closeButton.onclick = () => finish(null);
            window.backdrop.onclick = (event) => {
                if (event.target === window.backdrop) {
                    finish(null);
                }
            };
            document.addEventListener("keydown", onKeyDown, true);
        }

        // Status and progress
        const status = document.createElement("div");
        status.style.cssText =
            "box-sizing:border-box;display:flex;align-items:center;gap:6px;height:22px;" +
            "border-top:1px solid var(--color-border,#888);padding:2px 4px";
        window.dialog.appendChild(status);
        {
            statusText = document.createElement("span");
            statusText.textContent = "Ready";
            status.appendChild(statusText);

            progress = document.createElement("progress");
            progress.max = 100;
            progress.value = 0;
            progress.style.cssText = "width:100px;height:16px";
            status.appendChild(progress);
        }

        void requestPreview();
    });
}

paintDotJs.registerPlugin({
    workerSafe: true,
    effects: [
        {
            id: "content-aware-fill",
            name: "Content Aware Fill",
            category: "Selection",
            icon: paintDotJs.asset("icon.png"),
            controls: [
                range("sample-size", "Sample area size (in pixels)", 1, 100, 50, 1),
                select("sample-from", "Sample from", "sides", SAMPLE_CHOICES),
                select("fill-direction", "Fill direction", "inward", DIRECTION_CHOICES),
                text("seed", "Seed", String(DEFAULT_SEED))
            ],
            configure,

            render({ source, destination, width, height, selection, values }) {
                const seed = Number.parseInt(values.seed, 10);
                if (!Number.isInteger(seed) || seed < 0 || seed > 2147483647) {
                    throw new Error("Content Aware Fill seed must be an integer from 0 to 2147483647.");
                }

                return contentAwareFill({
                    source,
                    destination,
                    width,
                    height,
                    selection,
                    sampleSize: values["sample-size"],
                    sampleFrom: values["sample-from"],
                    fillDirection: values["fill-direction"],
                    seed
                });
            }
        }
    ]
});
