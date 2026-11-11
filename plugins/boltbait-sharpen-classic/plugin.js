// Sharpen Classic UI by BoltBait; original algorithm by Rick Brewster.
(() => {
    const { range } = paintDotJs.controls;

    function clampChannel(value) {
        return Math.max(0, Math.min(255, Math.round(value)));
    }

    paintDotJs.registerPlugin({
        workerSafe: true,
        effects: [
            {
                id: "sharpen-classic",
                name: "Sharpen Classic",
                category: "Photo",
                icon: paintDotJs.asset("sharpen-classic.png"),
                controls: [range("amount", "Sharpen Amount", 1, 20, 2)],
                render({ source, destination, width, height, values }) {
                    const strength = values.amount / 2;

                    for (let y = 0; y < height; ++y) {
                        for (let x = 0; x < width; ++x) {
                            const offset = (y * width + x) * 4;

                            for (let channel = 0; channel < 3; ++channel) {
                                const left = source[(y * width + Math.max(0, x - 1)) * 4 + channel];
                                const right = source[(y * width + Math.min(width - 1, x + 1)) * 4 + channel];
                                const top = source[(Math.max(0, y - 1) * width + x) * 4 + channel];
                                const bottom = source[(Math.min(height - 1, y + 1) * width + x) * 4 + channel];
                                const neighborAverage = (left + right + top + bottom) / 4;
                                const original = source[offset + channel];

                                destination[offset + channel] = clampChannel(
                                    original + strength * (original - neighborAverage)
                                );
                            }

                            destination[offset + 3] = source[offset + 3];
                        }
                    }
                }
            }
        ]
    });
})();
