// Flip by BoltBait. JavaScript port; all plugin credit belongs to the original creator.
(() => {
    // Original 16x16 menu icons embedded in BoltBait's Flip.dll.
    const horizontalIcon = paintDotJs.asset("flip-horizontal.png");
    const verticalIcon = paintDotJs.asset("flip-vertical.png");

    function flip({ source, destination, width, selectionBounds }, horizontal) {
        const bounds = selectionBounds;

        for (let y = bounds.y; y < bounds.y + bounds.height; ++y) {
            for (let x = bounds.x; x < bounds.x + bounds.width; ++x) {
                const sourceX = horizontal ? 2 * bounds.x + bounds.width - 1 - x : x;
                const sourceY = horizontal ? y : 2 * bounds.y + bounds.height - 1 - y;
                const sourceOffset = (sourceY * width + sourceX) * 4;
                const destinationOffset = (y * width + x) * 4;

                destination.set(source.subarray(sourceOffset, sourceOffset + 4), destinationOffset);
            }
        }
    }

    paintDotJs.registerPlugin({
        workerSafe: true,
        effects: [
            {
                id: "horizontal",
                name: "Flip Horizontal",
                category: "Root",
                icon: horizontalIcon,
                render: (context) => flip(context, true)
            },
            {
                id: "vertical",
                name: "Flip Vertical",
                category: "Root",
                icon: verticalIcon,
                render: (context) => flip(context, false)
            }
        ]
    });
})();
