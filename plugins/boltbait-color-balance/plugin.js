// Color Balance by BoltBait. JavaScript port; all credit belongs to the original creator.
(() => {
    const { range } = paintDotJs.controls;
    const clamp = (value) => Math.max(0, Math.min(255, Math.round(value)));
    function brightnessContrast(value, brightness, contrast) {
        const bright = value + brightness * 2.55;
        const factor = contrast >= 100 ? 255 : (100 + contrast) / Math.max(1, 100 - contrast);
        return clamp((bright - 127.5) * factor + 127.5);
    }
    paintDotJs.registerPlugin({
        workerSafe: true,
        effects: [
            {
                id: "color-balance",
                name: "Color Balance",
                menu: "Adjustments",
                category: "Root",
                icon: paintDotJs.asset("color-balance.png"),
                controls: [
                    // Padding keeps the opposing color names aligned with the ends of each track.
                    range(
                        "cyan-red",
                        "Cyan                                                      Red",
                        -100,
                        100,
                        0,
                        1,
                        { track: "cyan-red" }
                    ),
                    range(
                        "magenta-green",
                        "Magenta                                            Green",
                        -100,
                        100,
                        0,
                        1,
                        { track: "magenta-green" }
                    ),
                    range(
                        "yellow-blue",
                        "Yellow                                                  Blue",
                        -100,
                        100,
                        0,
                        1,
                        { track: "yellow-blue" }
                    ),
                    range("brightness", "Brightness", -100, 100, 0, 1, {
                        track: "lightness"
                    }),
                    range("contrast", "Contrast", -100, 100, 0, 1, { track: "contrast" })
                ],
                renderPixel({ r, g, b, a, values }) {
                    const red = brightnessContrast(r, values.brightness, values.contrast);
                    const green = brightnessContrast(g, values.brightness, values.contrast);
                    const blue = brightnessContrast(b, values.brightness, values.contrast);
                    const cyanRed = values["cyan-red"];
                    const magentaGreen = values["magenta-green"];
                    const yellowBlue = values["yellow-blue"];

                    return [
                        clamp(red + cyanRed + (-magentaGreen - yellowBlue) / 2),
                        clamp(green + magentaGreen + (-cyanRed - yellowBlue) / 2),
                        clamp(blue + yellowBlue + (-cyanRed - magentaGreen) / 2),
                        a
                    ];
                }
            }
        ]
    });
})();
