// Black and White+ by BoltBait. JavaScript port; all credit belongs to the original creator.
(() => {
    const { select, range, color, checkbox } = paintDotJs.controls;
    const clampChannel = (value) => Math.max(0, Math.min(255, Math.round(value)));
    const parseColor = (value) => [1, 3, 5].map((index) => Number.parseInt(value.slice(index, index + 2), 16));
    function calculateGray(red, green, blue, method) {
        switch (method) {
            case "luminosity":
                return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
            case "average":
                return (red + green + blue) / 3;
            case "lightness":
                return (Math.max(red, green, blue) + Math.min(red, green, blue)) / 2;
            case "maximum":
                return Math.max(red, green, blue);
            case "minimum":
                return Math.min(red, green, blue);
            default:
                return 0.299 * red + 0.587 * green + 0.114 * blue;
        }
    }

    function applyBrightnessAndContrast(value, brightness, contrast) {
        const shifted = value + brightness * 2.55;
        const factor = contrast >= 100 ? 255 : (100 + contrast) / Math.max(1, 100 - contrast);
        return clampChannel((shifted - 127.5) * factor + 127.5);
    }

    function blendChannel(base, top, mode) {
        switch (mode) {
            case "multiply":
                return (base * top) / 255;
            case "screen":
                return 255 - ((255 - base) * (255 - top)) / 255;
            case "overlay":
                return base < 128 ? (2 * base * top) / 255 : 255 - (2 * (255 - base) * (255 - top)) / 255;
            case "darken":
                return Math.min(base, top);
            case "lighten":
                return Math.max(base, top);
            case "add":
                return Math.min(255, base + top);
            default:
                return base;
        }
    }
    paintDotJs.registerPlugin({
        workerSafe: true,
        effects: [
            {
                id: "black-and-white-plus",
                name: "Black and White+",
                menu: "Adjustments",
                category: "Root",
                icon: paintDotJs.asset("black-and-white-plus.png"),
                controls: [
                    select("method", "", "pdn", [
                        ["pdn", "Paint.NET Method"],
                        ["luminosity", "Luminosity Method"],
                        ["average", "Average Method"],
                        ["lightness", "Lightness Method"],
                        ["maximum", "Maximum Method"],
                        ["minimum", "Minimum Method"]
                    ]),
                    range("brightness", "Brightness", -100, 100, 0, 1, {
                        track: "lightness"
                    }),
                    range("contrast", "Contrast", -100, 100, 0, 1, { track: "contrast" }),
                    select("blend", "Blend mode", "none", [
                        ["none", "None"],
                        ["multiply", "Multiply"],
                        ["screen", "Screen"],
                        ["overlay", "Overlay"],
                        ["darken", "Darken"],
                        ["lighten", "Lighten"],
                        ["add", "Additive"]
                    ]),
                    color("blend-color", "", "#ff8c00"),
                    checkbox("swap", "Swap order", false)
                ],
                renderPixel({ r, g, b, a, values }) {
                    const grayscale = calculateGray(r, g, b, values.method);
                    const adjusted = applyBrightnessAndContrast(grayscale, values.brightness, values.contrast);
                    let result = [adjusted, adjusted, adjusted];

                    if (values.blend !== "none") {
                        const tint = parseColor(values["blend-color"]);
                        result = result.map((channel, index) =>
                            values.swap
                                ? blendChannel(tint[index], channel, values.blend)
                                : blendChannel(channel, tint[index], values.blend)
                        );
                    }

                    return [...result.map(clampChannel), a];
                }
            }
        ]
    });
})();
