// Combined Adjustments by BoltBait. JavaScript port; all credit belongs to the original creator.
(() => {
    const { range, select, checkbox } = paintDotJs.controls;
    const clampChannel = (value) => Math.max(0, Math.min(255, Math.round(value)));

    function adjustBrightnessAndContrast(value, brightness, contrast) {
        const shifted = value + brightness * 2.55;
        const factor = contrast >= 100 ? 255 : (100 + contrast) / Math.max(1, 100 - contrast);
        return clampChannel((shifted - 127.5) * factor + 127.5);
    }
    paintDotJs.registerPlugin({
        workerSafe: true,
        effects: [
            {
                id: "combined-adjustments",
                name: "Combined Adjustments",
                menu: "Adjustments",
                category: "Root",
                icon: paintDotJs.asset("combined-adjustments.png"),
                controls: [
                    range("brightness", "Brightness / Contrast", -100, 100, 0, 1, {
                        track: "lightness"
                    }),
                    range("contrast", "", -100, 100, 0, 1, { track: "contrast" }),
                    range("hue", "Hue / Saturation / Lightness", -180, 180, 0, 1, {
                        track: "hue-shift"
                    }),
                    range("saturation", "", 0, 200, 100, 1, { track: "saturation" }),
                    range("lightness", "", -100, 100, 0, 1, { track: "lightness" }),
                    range("temperature", "Temperature / Tint", -100, 100, 0, 1, {
                        track: "temperature"
                    }),
                    range("tint", "", -100, 100, 0, 1, { track: "tint" }),
                    select("conversion", "", "color", [
                        ["color", "Color (no conversion)"],
                        ["sepia", "Sepia"],
                        ["bw", "Black and White"]
                    ]),
                    checkbox("invert", "Invert", false),
                    checkbox("original", "Preview original image", false)
                ],
                renderPixel({ r, g, b, a, values }) {
                    if (values.original) {
                        return [r, g, b, a];
                    }

                    if (values.conversion === "sepia") {
                        const originalRed = r;
                        const originalGreen = g;
                        const originalBlue = b;
                        r = clampChannel(0.393 * originalRed + 0.769 * originalGreen + 0.189 * originalBlue);
                        g = clampChannel(0.349 * originalRed + 0.686 * originalGreen + 0.168 * originalBlue);
                        b = clampChannel(0.272 * originalRed + 0.534 * originalGreen + 0.131 * originalBlue);
                    } else if (values.conversion === "bw") {
                        const gray = clampChannel(0.299 * r + 0.587 * g + 0.114 * b);
                        r = gray;
                        g = gray;
                        b = gray;
                    }

                    r = adjustBrightnessAndContrast(r, values.brightness, values.contrast);
                    g = adjustBrightnessAndContrast(g, values.brightness, values.contrast);
                    b = adjustBrightnessAndContrast(b, values.brightness, values.contrast);

                    let [hue, saturation, value] = paintDotJs.pixels.rgbToHsv(r, g, b);
                    hue += values.hue;
                    saturation = Math.max(0, Math.min(1, (saturation * values.saturation) / 100));
                    [r, g, b] = paintDotJs.pixels.hsvToRgb(hue, saturation, value);

                    const lightness = values.lightness / 100;
                    const lightnessAmount = Math.abs(lightness);
                    r = clampChannel(r + (lightness >= 0 ? 255 - r : r) * lightnessAmount);
                    g = clampChannel(g + (lightness >= 0 ? 255 - g : g) * lightnessAmount);
                    b = clampChannel(b + (lightness >= 0 ? 255 - b : b) * lightnessAmount);

                    const temperature = values.temperature * 1.28;
                    const tint = values.tint * 1.28;
                    r = clampChannel(r + temperature + tint / 2);
                    g = clampChannel(g - tint);
                    b = clampChannel(b - temperature + tint / 2);

                    if (values.invert) {
                        r = 255 - r;
                        g = 255 - g;
                        b = 255 - b;
                    }
                    return [r, g, b, a];
                }
            }
        ]
    });
})();
