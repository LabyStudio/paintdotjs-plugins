// Gaussian Blur+ by BoltBait. JavaScript port; all credit belongs to the original creator.
(() => {
    const { range, checkbox, select } = paintDotJs.controls;

    function gaussianBlur(source, width, height, radius) {
        if (radius <= 0) {
            return new Uint8ClampedArray(source);
        }

        const sigma = Math.max(0.5, radius / 3);
        const reach = Math.max(1, Math.ceil(sigma * 3));
        const kernel = [];
        const horizontalPass = new Float32Array(source.length);
        const result = new Uint8ClampedArray(source.length);
        let total = 0;

        for (let offset = -reach; offset <= reach; ++offset) {
            const weight = Math.exp(-(offset * offset) / (2 * sigma * sigma));
            kernel.push(weight);
            total += weight;
        }

        for (let index = 0; index < kernel.length; ++index) {
            kernel[index] /= total;
        }

        // Process the Gaussian kernel in two one-dimensional passes.
        for (let y = 0; y < height; ++y) {
            for (let x = 0; x < width; ++x) {
                for (let channel = 0; channel < 4; ++channel) {
                    let sum = 0;
                    for (let offset = -reach; offset <= reach; ++offset) {
                        const sampleX = Math.max(0, Math.min(width - 1, x + offset));
                        sum += source[(y * width + sampleX) * 4 + channel] * kernel[offset + reach];
                    }
                    horizontalPass[(y * width + x) * 4 + channel] = sum;
                }
            }
        }

        for (let y = 0; y < height; ++y) {
            for (let x = 0; x < width; ++x) {
                for (let channel = 0; channel < 4; ++channel) {
                    let sum = 0;
                    for (let offset = -reach; offset <= reach; ++offset) {
                        const sampleY = Math.max(0, Math.min(height - 1, y + offset));
                        sum += horizontalPass[(sampleY * width + x) * 4 + channel] * kernel[offset + reach];
                    }
                    result[(y * width + x) * 4 + channel] = sum;
                }
            }
        }

        return result;
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
            default:
                return top;
        }
    }
    paintDotJs.registerPlugin({
        workerSafe: true,
        effects: [
            {
                id: "gaussian-blur-plus",
                name: "Gaussian Blur+",
                category: "Blurs",
                icon: paintDotJs.asset("gaussian-blur-plus.png"),
                controls: [
                    range("radius", "Radius", 0, 100, 2),
                    checkbox("red", "Red", true),
                    checkbox("green", "Green", true),
                    checkbox("blue", "Blue", true),
                    checkbox("alpha", "Alpha", true),
                    checkbox("opaque-alpha", "Use most opaque alpha", false),
                    select("blend", "Blending Mode", "normal", [
                        ["normal", "Normal"],
                        ["multiply", "Multiply"],
                        ["screen", "Screen"],
                        ["overlay", "Overlay"],
                        ["darken", "Darken"],
                        ["lighten", "Lighten"]
                    ])
                ],
                render({ source, destination, width, height, values }) {
                    const blurred = gaussianBlur(source, width, height, values.radius);
                    const enabledChannels = [values.red, values.green, values.blue];

                    for (let offset = 0; offset < source.length; offset += 4) {
                        for (let channel = 0; channel < 3; ++channel) {
                            destination[offset + channel] = blendChannel(
                                source[offset + channel],
                                enabledChannels[channel] ? blurred[offset + channel] : source[offset + channel],
                                values.blend
                            );
                        }

                        let alpha = values.alpha ? blurred[offset + 3] : source[offset + 3];
                        if (values["opaque-alpha"]) {
                            alpha = Math.max(alpha, source[offset + 3]);
                        }
                        destination[offset + 3] = alpha;
                    }
                }
            }
        ]
    });
})();
