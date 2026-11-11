// Floyd-Steinberg Dithering by BoltBait. JavaScript port; all credit belongs to the original creator.
(() => {
    const { select, range, color } = paintDotJs.controls;
    const parseColor = (value) => [1, 3, 5].map((index) => Number.parseInt(value.slice(index, index + 2), 16));
    const createGrayPalette = (count) =>
        Array.from({ length: count }, (_, index) => {
            const value = Math.round((index * 255) / (count - 1));
            return [value, value, value];
        });
    const WINDOWS_PALETTE = [
        [0, 0, 0],
        [128, 0, 0],
        [0, 128, 0],
        [128, 128, 0],
        [0, 0, 128],
        [128, 0, 128],
        [0, 128, 128],
        [192, 192, 192],
        [128, 128, 128],
        [255, 0, 0],
        [0, 255, 0],
        [255, 255, 0],
        [0, 0, 255],
        [255, 0, 255],
        [0, 255, 255],
        [255, 255, 255]
    ];
    function findNearestColor(red, green, blue, palette) {
        let nearestColor = palette[0];
        let shortestDistance = Infinity;

        for (const color of palette) {
            const redDistance = red - color[0];
            const greenDistance = green - color[1];
            const blueDistance = blue - color[2];
            const distance = redDistance ** 2 + greenDistance ** 2 + blueDistance ** 2;
            if (distance < shortestDistance) {
                shortestDistance = distance;
                nearestColor = color;
            }
        }

        return nearestColor;
    }

    function createPalette(values) {
        switch (values.palette) {
            case "gray4":
                return createGrayPalette(4);
            case "gray8":
                return createGrayPalette(8);
            case "cmyk":
                return [
                    [0, 255, 255],
                    [255, 0, 255],
                    [255, 255, 0],
                    [0, 0, 0]
                ];
            case "windows":
            case "custom16":
                return WINDOWS_PALETTE;
            case "pebble":
                return Array.from({ length: 64 }, (_, index) => [
                    (index >> 4) * 85,
                    ((index >> 2) & 3) * 85,
                    (index & 3) * 85
                ]);
            case "plus":
                return [[0, 0, 0], parseColor(values.custom), [255, 255, 255]];
            case "adaptive": {
                // Approximate the requested palette size with a uniform RGB cube.
                const levels = Math.max(2, Math.round(Math.cbrt(values.colors)));
                const palette = [];
                for (let red = 0; red < levels; ++red) {
                    for (let green = 0; green < levels; ++green) {
                        for (let blue = 0; blue < levels; ++blue) {
                            palette.push([
                                (red * 255) / (levels - 1),
                                (green * 255) / (levels - 1),
                                (blue * 255) / (levels - 1)
                            ]);
                        }
                    }
                }
                return palette;
            }
            default:
                return createGrayPalette(2);
        }
    }
    paintDotJs.registerPlugin({
        workerSafe: true,
        effects: [
            {
                id: "floyd-steinberg-dithering",
                name: "Floyd-Steinberg Dithering",
                category: "Stylize",
                icon: paintDotJs.asset("floyd-steinberg-dithering.png"),
                controls: [
                    select("palette", "", "bw", [
                        ["bw", "Black & White Palette"],
                        ["gray4", "4 Shades of Gray Palette"],
                        ["gray8", "8 Shades of Gray Palette"],
                        ["cmyk", "4 Colors CMYK Palette"],
                        ["windows", "16 Color Original Windows Palette"],
                        ["custom16", "16 Color Custom Palette"],
                        ["pebble", "Pebble Time 64 Color Palette"],
                        ["plus", "Black & White Plus One Color"],
                        ["adaptive", "Use Current Palette"]
                    ]),
                    select("method", "", "standard", [
                        ["standard", "Floyd-Steinberg Dithering Method (1/16)"],
                        ["custom", "Custom Dithering Method (1/32)"]
                    ]),
                    range("brightness", "Brightness/Contrast", -100, 100, 0),
                    range("contrast", "", -100, 100, 0),
                    color("custom", "Custom Color", "#ff0000"),
                    range("colors", "Number of colors to use from current palette", 2, 96, 4)
                ],
                render({ source, destination, width, height, values }) {
                    const palette = createPalette(values);
                    const work = new Float32Array(source.length);
                    const contrast = (100 + values.contrast) / 100;

                    for (let offset = 0; offset < source.length; offset += 4) {
                        for (let channel = 0; channel < 3; ++channel) {
                            work[offset + channel] = Math.max(
                                0,
                                Math.min(
                                    255,
                                    (source[offset + channel] - 127.5) * contrast + 127.5 + values.brightness * 2.55
                                )
                            );
                        }
                        work[offset + 3] = source[offset + 3];
                    }

                    const diffuseError = (x, y, channel, error, factor) => {
                        if (x >= 0 && x < width && y >= 0 && y < height) {
                            work[(y * width + x) * 4 + channel] += error * factor;
                        }
                    };

                    for (let y = 0; y < height; ++y) {
                        for (let x = 0; x < width; ++x) {
                            const offset = (y * width + x) * 4;
                            const chosen = findNearestColor(work[offset], work[offset + 1], work[offset + 2], palette);

                            for (let channel = 0; channel < 3; ++channel) {
                                destination[offset + channel] = chosen[channel];
                                const error = work[offset + channel] - chosen[channel];
                                if (values.method === "standard") {
                                    diffuseError(x + 1, y, channel, error, 7 / 16);
                                    diffuseError(x - 1, y + 1, channel, error, 3 / 16);
                                    diffuseError(x, y + 1, channel, error, 5 / 16);
                                    diffuseError(x + 1, y + 1, channel, error, 1 / 16);
                                } else {
                                    diffuseError(x + 1, y, channel, error, 8 / 32);
                                    diffuseError(x + 2, y, channel, error, 4 / 32);
                                    diffuseError(x - 2, y + 1, channel, error, 2 / 32);
                                    diffuseError(x - 1, y + 1, channel, error, 4 / 32);
                                    diffuseError(x, y + 1, channel, error, 8 / 32);
                                    diffuseError(x + 1, y + 1, channel, error, 4 / 32);
                                    diffuseError(x + 2, y + 1, channel, error, 2 / 32);
                                }
                            }
                            destination[offset + 3] = source[offset + 3];
                        }
                    }
                }
            }
        ]
    });
})();
