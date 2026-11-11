// Transparency by BoltBait. JavaScript port; all credit belongs to the original creator.
(() => {
    const { range, checkbox, color } = paintDotJs.controls;
    const parseColor = (value) => [1, 3, 5].map((index) => Number.parseInt(value.slice(index, index + 2), 16));

    function clampChannel(value) {
        return Math.max(0, Math.min(255, Math.round(value)));
    }

    paintDotJs.registerPlugin({
        workerSafe: true,
        effects: [
            {
                id: "transparency",
                name: "Transparency",
                menu: "Adjustments",
                category: "Root",
                icon: paintDotJs.asset("transparency.png"),
                controls: [
                    range("alpha", "Transparent                                    Opaque", -100, 100, 0, 1, {
                        track: "alpha"
                    }),
                    checkbox("ignore", "Ignore transparent pixels", false),
                    checkbox("replace", "Replace transparent pixels with the selected color", false),
                    color("replacement", "Replacement color", "#ffffff")
                ],
                renderPixel({ r, g, b, a, values }) {
                    if (values.ignore && a === 0) {
                        return [r, g, b, a];
                    }

                    if (values.replace && a === 0) {
                        [r, g, b] = parseColor(values.replacement);
                    }

                    const alphaAdjustment = values.alpha;
                    const adjustedAlpha =
                        alphaAdjustment > 0 ? a + ((255 - a) * alphaAdjustment) / 100 : a + (a * alphaAdjustment) / 100;

                    return [r, g, b, clampChannel(adjustedAlpha)];
                }
            }
        ]
    });
})();
