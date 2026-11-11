// Gradient by BoltBait. JavaScript port; all credit belongs to the original creator.
(() => {
    const { color, range, checkbox, select } = paintDotJs.controls;
    const parseColor = (value) => [1, 3, 5].map((index) => Number.parseInt(value.slice(index, index + 2), 16));
    const mix = (from, to, amount) => from + (to - from) * amount;

    function calculateGradientAmount(style, x, y, bounds) {
        const normalizedX = (x - bounds.x) / Math.max(1, bounds.width - 1);
        const normalizedY = (y - bounds.y) / Math.max(1, bounds.height - 1);
        const centerX = bounds.x + bounds.width / 2;
        const centerY = bounds.y + bounds.height / 2;

        switch (style) {
            case "horizontal":
                return normalizedX;
            case "diagonal":
                return (normalizedX + normalizedY) / 2;
            case "diagonal-other":
                return (1 - normalizedX + normalizedY) / 2;
            case "radial-corner": {
                const radius = Math.hypot(bounds.width / 2, bounds.height / 2);
                return Math.min(1, Math.hypot(x - centerX, y - centerY) / Math.max(1, radius));
            }
            case "radial-side": {
                const radius = Math.min(bounds.width, bounds.height) / 2;
                return Math.min(1, Math.hypot(x - centerX, y - centerY) / Math.max(1, radius));
            }
            case "square":
                return Math.max(
                    0,
                    Math.min(1, Math.min(normalizedX, 1 - normalizedX, normalizedY, 1 - normalizedY) * 2)
                );
            case "conical":
                return (Math.atan2(y - centerY, x - centerX) + Math.PI) / (2 * Math.PI);
            default:
                return normalizedY;
        }
    }

    paintDotJs.registerPlugin({
        workerSafe: true,
        effects: [
            {
                id: "hsv-gradient",
                name: "Gradient",
                category: "Render",
                icon: paintDotJs.asset("hsv-gradient.png"),
                controls: [
                    color("from", "From Color", "#000000"),
                    range("from-alpha", "From Alpha", 0, 255, 255, 1, { track: "alpha" }),
                    color("to", "To Color", "#ffffff"),
                    range("to-alpha", "To Alpha", 0, 255, 255, 1, { track: "alpha" }),
                    checkbox("alpha-only", "Alpha Only", false),
                    select("style", "", "vertical", [
                        ["vertical", "Vertical Style"],
                        ["horizontal", "Horizontal Style"],
                        ["diagonal", "Diagonal Style"],
                        ["diagonal-other", "Diagonal (other) Style"],
                        ["radial-corner", "Radial Corner Style"],
                        ["radial-side", "Radial Side Style"],
                        ["square", "Square Style"],
                        ["conical", "Conical Style"]
                    ]),
                    select("type", "", "rgb", [
                        ["rgb", "RGB type"],
                        ["hsv-short", "HSV (short) type"],
                        ["hsv-long", "HSV (long) type"]
                    ])
                ],
                render({ source, destination, width, height, values, selectionBounds }) {
                    const bounds = selectionBounds || { x: 0, y: 0, width, height };
                    const from = parseColor(values.from);
                    const to = parseColor(values.to);
                    const fromHsv = paintDotJs.pixels.rgbToHsv(...from);
                    const toHsv = paintDotJs.pixels.rgbToHsv(...to);
                    let hueDelta = ((toHsv[0] - fromHsv[0] + 540) % 360) - 180;

                    if (values.type === "hsv-long") {
                        hueDelta = hueDelta <= 0 ? hueDelta + 360 : hueDelta - 360;
                    }

                    for (let y = 0; y < height; ++y) {
                        for (let x = 0; x < width; ++x) {
                            const amount = calculateGradientAmount(values.style, x, y, bounds);
                            const offset = (y * width + x) * 4;
                            let rgb = from.map((value, channel) => mix(value, to[channel], amount));

                            if (
                                values.type !== "rgb" &&
                                !(from[0] === from[1] && from[1] === from[2]) &&
                                !(to[0] === to[1] && to[1] === to[2])
                            ) {
                                rgb = paintDotJs.pixels.hsvToRgb(
                                    fromHsv[0] + hueDelta * amount,
                                    mix(fromHsv[1], toHsv[1], amount),
                                    mix(fromHsv[2], toHsv[2], amount)
                                );
                            }
                            if (!values["alpha-only"]) {
                                for (let channel = 0; channel < 3; ++channel) {
                                    destination[offset + channel] = rgb[channel];
                                }
                            }
                            destination[offset + 3] = mix(values["from-alpha"], values["to-alpha"], amount);
                        }
                    }
                }
            }
        ]
    });
})();
