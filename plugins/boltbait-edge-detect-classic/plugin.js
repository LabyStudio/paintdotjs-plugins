// Edge Detect Classic UI by BoltBait; original algorithm by Chris Crosetto.
(() => {
    const { range } = paintDotJs.controls;
    paintDotJs.registerPlugin({
        workerSafe: true,
        effects: [
            {
                id: "edge-detect-classic",
                name: "Edge Detect Classic",
                category: "Stylize",
                icon: paintDotJs.asset("edge-detect-classic.png"),
                controls: [range("angle", "Edge Detect Angle", -180, 180, 45)],
                render({ source, destination, width, height, values }) {
                    const angle = (values.angle * Math.PI) / 180;
                    const cosine = Math.cos(angle);
                    const sine = Math.sin(angle);
                    // Rotating the classic 3×3 kernel changes the detected edge direction.
                    const kernel = [
                        -cosine - sine,
                        -2 * sine,
                        cosine - sine,
                        -2 * cosine,
                        0,
                        2 * cosine,
                        -cosine + sine,
                        2 * sine,
                        cosine + sine
                    ];
                    for (let y = 0; y < height; ++y) {
                        for (let x = 0; x < width; ++x) {
                            const offset = (y * width + x) * 4;
                            for (let channel = 0; channel < 3; ++channel) {
                                let sum = 0;
                                let kernelIndex = 0;

                                for (let dy = -1; dy <= 1; ++dy) {
                                    for (let dx = -1; dx <= 1; ++dx) {
                                        const sampleX = Math.max(0, Math.min(width - 1, x + dx));
                                        const sampleY = Math.max(0, Math.min(height - 1, y + dy));
                                        sum +=
                                            source[(sampleY * width + sampleX) * 4 + channel] * kernel[kernelIndex++];
                                    }
                                }
                                destination[offset + channel] = Math.max(0, Math.min(255, Math.abs(sum)));
                            }
                            destination[offset + 3] = source[offset + 3];
                        }
                    }
                }
            }
        ]
    });
})();
