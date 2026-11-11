// Dream by BoltBait. JavaScript port; all credit belongs to the original creator.
(() => {
    const { range, checkbox } = paintDotJs.controls;

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
            const value = Math.exp(-(offset * offset) / (2 * sigma * sigma));
            kernel.push(value);
            total += value;
        }

        for (let index = 0; index < kernel.length; ++index) {
            kernel[index] /= total;
        }

        // The separable horizontal and vertical passes are equivalent to a full 2D Gaussian kernel.
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
    paintDotJs.registerPlugin({
        workerSafe: true,
        effects: [
            {
                id: "dream",
                name: "Dream",
                category: "Artistic",
                icon: paintDotJs.asset("dream.png"),
                controls: [range("radius", "Radius", 0, 200, 10), checkbox("vignette", "Include vignette", true)],
                render({ source, destination, width, height, values, selectionBounds }) {
                    const blurred = gaussianBlur(source, width, height, values.radius);
                    const bounds = selectionBounds || { x: 0, y: 0, width, height };
                    const centerX = bounds.x + bounds.width / 2;
                    const centerY = bounds.y + bounds.height / 2;

                    for (let y = 0; y < height; ++y) {
                        for (let x = 0; x < width; ++x) {
                            const offset = (y * width + x) * 4;
                            let vignette = 0;

                            if (values.vignette) {
                                const dx = (x - centerX) / Math.max(1, bounds.width / 2);
                                const dy = (y - centerY) / Math.max(1, bounds.height / 2);
                                vignette = Math.max(0, Math.min(1, (Math.sqrt(dx * dx + dy * dy) - 0.2) / 0.8)) * 0.3;
                            }

                            for (let channel = 0; channel < 3; ++channel) {
                                destination[offset + channel] =
                                    Math.min(source[offset + channel], blurred[offset + channel]) * (1 - vignette);
                            }
                            destination[offset + 3] = source[offset + 3];
                        }
                    }
                }
            }
        ]
    });
})();
