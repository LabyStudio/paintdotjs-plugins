// Vignette+ by BoltBait. JavaScript port; all credit belongs to the original creator.
(() => {
    const { range, color } = paintDotJs.controls;
    const parseColor = (value) => [1, 3, 5].map((index) => Number.parseInt(value.slice(index, index + 2), 16));

    paintDotJs.registerPlugin({
        workerSafe: true,
        effects: [
            {
                id: "vignette-plus",
                name: "Vignette+",
                category: "Photo",
                icon: paintDotJs.asset("vignette-plus.png"),
                controls: [
                    color("color", "", "#000000"),
                    range("radius", "Radius", 0, 100, 50),
                    range("strength", "Strength", 0, 100, 50)
                ],
                render({ source, destination, width, height, values, selectionBounds }) {
                    const bounds = selectionBounds || { x: 0, y: 0, width, height };
                    const centerX = bounds.x + (bounds.width - 1) / 2;
                    const centerY = bounds.y + (bounds.height - 1) / 2;
                    const radius = Math.max(0.001, values.radius / 100);
                    const transitionStart = Math.max(0, 1 - radius);
                    const vignetteColor = parseColor(values.color);
                    const strength = values.strength / 100;

                    for (let y = 0; y < height; ++y) {
                        for (let x = 0; x < width; ++x) {
                            const offset = (y * width + x) * 4;
                            const dx = (x - centerX) / Math.max(1, bounds.width / 2);
                            const dy = (y - centerY) / Math.max(1, bounds.height / 2);
                            const distance = Math.sqrt(dx * dx + dy * dy);
                            const amount = Math.max(0, Math.min(1, (distance - transitionStart) / radius)) * strength;

                            for (let channel = 0; channel < 3; ++channel) {
                                destination[offset + channel] = Math.round(
                                    source[offset + channel] * (1 - amount) + vignetteColor[channel] * amount
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
