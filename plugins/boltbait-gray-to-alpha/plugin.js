// Switch Gray to Alpha by BoltBait. JavaScript port; all credit belongs to the original creator.
(() => {
    const { select } = paintDotJs.controls;

    paintDotJs.registerPlugin({
        workerSafe: true,
        effects: [
            {
                id: "gray-to-alpha",
                name: "Switch Gray to Alpha",
                category: "Object",
                icon: paintDotJs.asset("gray-to-alpha.png"),
                controls: [
                    select("method", "Isolate line art by deleting", "white", [
                        ["white", "White"],
                        ["black", "Black"]
                    ])
                ],
                renderPixel({ r, g, b, a, values }) {
                    // Rec. 601 luminance preserves the perceived brightness in the new alpha channel.
                    const gray = Math.round(r * 0.299 + g * 0.587 + b * 0.114);
                    const alpha = values.method === "white" ? 255 - gray : gray;
                    return [0, 0, 0, Math.round((alpha * a) / 255)];
                }
            }
        ]
    });
})();
