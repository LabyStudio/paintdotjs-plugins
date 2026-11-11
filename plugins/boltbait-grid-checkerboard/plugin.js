// Grid / Checkerboard by BoltBait. JavaScript port; all credit belongs to the original creator.
(() => {
    const { select, range, color, checkbox } = paintDotJs.controls;
    const parseColor = (value) => [1, 3, 5].map((index) => Number.parseInt(value.slice(index, index + 2), 16));
    paintDotJs.registerPlugin({
        workerSafe: true,
        effects: [
            {
                id: "grid-checkerboard",
                name: "Grid / Checkerboard",
                category: "Render",
                icon: paintDotJs.asset("grid-checkerboard.png"),
                controls: [
                    select("mode", "", "grid", [
                        ["grid", "Draw a grid"],
                        ["checkerboard", "Draw a checkerboard"]
                    ]),
                    range("size", "Size", 1, 1000, 33),
                    range("line-width", "Line width", 1, 100, 1),
                    color("primary", "Primary color", "#000000"),
                    select("secondary-mode", "", "source", [
                        ["source", "Use source canvas for secondary color"],
                        ["custom", "Use custom secondary color:"]
                    ]),
                    color("secondary", "Secondary color", "#ffffff"),
                    checkbox("swap", "Swap colors", false)
                ],
                render({ source, destination, width, height, values }) {
                    const primary = parseColor(values.primary);
                    const secondary = parseColor(values.secondary);
                    const size = Math.max(1, values.size);
                    const lineWidth = Math.min(size, values["line-width"]);

                    for (let y = 0; y < height; ++y) {
                        for (let x = 0; x < width; ++x) {
                            const offset = (y * width + x) * 4;
                            let usePrimary =
                                values.mode === "grid"
                                    ? x % size < lineWidth || y % size < lineWidth
                                    : ((Math.floor(x / size) + Math.floor(y / size)) & 1) === 1;

                            if (values.swap) {
                                usePrimary = !usePrimary;
                            }
                            if (usePrimary) {
                                destination.set([...primary, 255], offset);
                            } else if (values["secondary-mode"] === "custom") {
                                destination.set([...secondary, 255], offset);
                            } else {
                                destination.set(source.subarray(offset, offset + 4), offset);
                            }
                        }
                    }
                }
            }
        ]
    });
})();
