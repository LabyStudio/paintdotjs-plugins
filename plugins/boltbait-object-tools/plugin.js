// Object Tools by BoltBait. JavaScript port; all credit belongs to the original creator.
(() => {
    const { range, checkbox, color } = paintDotJs.controls;
    const parseColor = (value) => [1, 3, 5].map((index) => Number.parseInt(value.slice(index, index + 2), 16));
    const sampleAlpha = (source, width, height, x, y) =>
        source[
            (Math.max(0, Math.min(height - 1, Math.round(y))) * width +
                Math.max(0, Math.min(width - 1, Math.round(x)))) *
                4 +
                3
        ];

    function boxBlurAlpha(source, width, height, radius) {
        const output = new Float32Array(width * height);
        const horizontalPass = new Float32Array(width * height);
        const kernelSize = radius * 2 + 1;

        for (let y = 0; y < height; ++y) {
            for (let x = 0; x < width; ++x) {
                let sum = 0;
                for (let offsetX = -radius; offsetX <= radius; ++offsetX) {
                    sum += sampleAlpha(source, width, height, x + offsetX, y);
                }
                horizontalPass[y * width + x] = sum / kernelSize;
            }
        }

        for (let y = 0; y < height; ++y) {
            for (let x = 0; x < width; ++x) {
                let sum = 0;
                for (let offsetY = -radius; offsetY <= radius; ++offsetY) {
                    const sampleY = Math.max(0, Math.min(height - 1, y + offsetY));
                    sum += horizontalPass[sampleY * width + x];
                }
                output[y * width + x] = sum / kernelSize;
            }
        }

        return output;
    }

    function composite(destination, offset, color, alpha) {
        const baseAlpha = destination[offset + 3] / 255;
        const topAlpha = alpha / 255;
        const outputAlpha = topAlpha + baseAlpha * (1 - topAlpha);
        if (outputAlpha <= 0) {
            return;
        }

        for (let channel = 0; channel < 3; ++channel) {
            destination[offset + channel] =
                (color[channel] * topAlpha + destination[offset + channel] * baseAlpha * (1 - topAlpha)) / outputAlpha;
        }
        destination[offset + 3] = outputAlpha * 255;
    }
    paintDotJs.registerPlugin({
        workerSafe: true,
        effects: [
            {
                id: "bevel-object",
                name: "Bevel Object",
                category: "Object",
                dialogTitle: "BoltBait's Bevel Object v6.0",
                icon: paintDotJs.asset("bevel-object.png"),
                controls: [
                    range("angle", "Angle", 0, 360, 315),
                    range("depth", "Depth", 1, 50, 5),
                    range("strength", "Strength", 0, 200, 100),
                    checkbox("hard", "Hard edges", false),
                    checkbox("drop-shadow", "Drop shadow", false),
                    checkbox("keep", "Keep original", true),
                    color("light", "Light color", "#ffffff"),
                    color("dark", "Dark color", "#000000")
                ],
                render({ source, destination, width, height, values }) {
                    const angle = (values.angle * Math.PI) / 180;
                    const offsetX = Math.cos(angle) * values.depth;
                    const offsetY = Math.sin(angle) * values.depth;
                    const lightColor = parseColor(values.light);
                    const darkColor = parseColor(values.dark);
                    const strength = values.strength / 100;

                    if (!values.keep) {
                        destination.fill(0);
                    }

                    for (let y = 0; y < height; ++y) {
                        for (let x = 0; x < width; ++x) {
                            const pixelOffset = (y * width + x) * 4;
                            const alpha = source[pixelOffset + 3];
                            if (!alpha) {
                                continue;
                            }

                            const difference =
                                (sampleAlpha(source, width, height, x - offsetX, y - offsetY) -
                                    sampleAlpha(source, width, height, x + offsetX, y + offsetY)) /
                                255;
                            const tint = difference >= 0 ? lightColor : darkColor;
                            const amount = Math.min(1, Math.abs(difference) * strength);

                            if (values.keep) {
                                for (let channel = 0; channel < 3; ++channel) {
                                    destination[pixelOffset + channel] =
                                        source[pixelOffset + channel] * (1 - amount) + tint[channel] * amount;
                                }
                                destination[pixelOffset + 3] = alpha;
                            } else {
                                destination.set([...tint, Math.round(alpha * amount)], pixelOffset);
                            }
                        }
                    }

                    if (values["drop-shadow"]) {
                        for (let y = height - 1; y >= 0; --y) {
                            for (let x = width - 1; x >= 0; --x) {
                                const shadowAlpha = sampleAlpha(source, width, height, x - offsetX, y - offsetY) * 0.45;
                                const pixelOffset = (y * width + x) * 4;
                                if (shadowAlpha && !source[pixelOffset + 3]) {
                                    composite(destination, pixelOffset, darkColor, shadowAlpha);
                                }
                            }
                        }
                    }
                }
            },
            {
                id: "feather-object",
                name: "Feather Object",
                category: "Object",
                dialogTitle: "BoltBait's Feather Object v6.0",
                icon: paintDotJs.asset("feather-object.png"),
                controls: [range("radius", "Radius", 0, 20, 1)],
                render({ source, destination, width, height, values }) {
                    const blurred = boxBlurAlpha(source, width, height, values.radius);
                    for (let offset = 0, pixel = 0; offset < source.length; offset += 4, ++pixel) {
                        destination[offset] = source[offset];
                        destination[offset + 1] = source[offset + 1];
                        destination[offset + 2] = source[offset + 2];
                        destination[offset + 3] = Math.min(source[offset + 3], blurred[pixel]);
                    }
                }
            },
            {
                id: "inner-shadow",
                name: "Inner Shadow",
                category: "Object",
                dialogTitle: "BoltBait's Object Inner Shadow v6.0",
                icon: paintDotJs.asset("inner-shadow.png"),
                controls: [
                    range("angle", "Angle", -180, 180, -45),
                    range("length", "Length", 1, 100, 10),
                    range("strength", "Strength", 0, 100, 75),
                    color("color", "Color", "#000000"),
                    checkbox("keep", "Keep background", true)
                ],
                render({ source, destination, width, height, values }) {
                    const angle = (values.angle * Math.PI) / 180;
                    const offsetX = Math.cos(angle) * values.length;
                    const offsetY = Math.sin(angle) * values.length;
                    const tint = parseColor(values.color);
                    const strength = values.strength / 100;

                    if (!values.keep) {
                        destination.fill(0);
                    }

                    for (let y = 0; y < height; ++y) {
                        for (let x = 0; x < width; ++x) {
                            const pixelOffset = (y * width + x) * 4;
                            const alpha = source[pixelOffset + 3];
                            if (!alpha) {
                                continue;
                            }

                            const shadowAlpha =
                                (1 - sampleAlpha(source, width, height, x - offsetX, y - offsetY) / 255) *
                                strength *
                                alpha;
                            if (values.keep) {
                                const amount = shadowAlpha / 255;
                                for (let channel = 0; channel < 3; ++channel) {
                                    destination[pixelOffset + channel] =
                                        source[pixelOffset + channel] * (1 - amount) + tint[channel] * amount;
                                }
                                destination[pixelOffset + 3] = alpha;
                            } else {
                                destination.set([...tint, shadowAlpha], pixelOffset);
                            }
                        }
                    }
                }
            },
            {
                id: "outline-object",
                name: "Outline Object",
                category: "Object",
                dialogTitle: "BoltBait's Outline Object v6.0",
                icon: paintDotJs.asset("outline-object.png"),
                controls: [
                    range("width", "Width", 1, 100, 10),
                    color("color", "Color", "#000000"),
                    checkbox("antialias", "Anti-Alias outline", true),
                    range("blur", "Blur radius", 0, 100, 0)
                ],
                render({ source, destination, width, height, values }) {
                    const tint = parseColor(values.color);
                    const radius = Math.min(values.width, 50);
                    const antialiasMargin = values.antialias ? 1 : 0;

                    for (let y = 0; y < height; ++y) {
                        for (let x = 0; x < width; ++x) {
                            const pixelOffset = (y * width + x) * 4;
                            if (source[pixelOffset + 3]) {
                                continue;
                            }

                            let maximumAlpha = 0;
                            for (let offsetY = -radius; offsetY <= radius; ++offsetY) {
                                for (let offsetX = -radius; offsetX <= radius; ++offsetX) {
                                    const distance = Math.hypot(offsetX, offsetY);
                                    if (distance <= radius + antialiasMargin) {
                                        const edgeCoverage = antialiasMargin ? Math.min(1, radius + 1 - distance) : 1;
                                        maximumAlpha = Math.max(
                                            maximumAlpha,
                                            sampleAlpha(source, width, height, x + offsetX, y + offsetY) * edgeCoverage
                                        );
                                    }
                                }
                            }

                            if (maximumAlpha) {
                                destination.set([...tint, maximumAlpha], pixelOffset);
                            }
                        }
                    }

                    if (values.blur > 0) {
                        const blurred = boxBlurAlpha(destination, width, height, Math.min(30, values.blur));
                        for (
                            let alphaOffset = 3, pixel = 0;
                            alphaOffset < destination.length;
                            alphaOffset += 4, ++pixel
                        ) {
                            if (!source[alphaOffset]) {
                                destination[alphaOffset] = blurred[pixel];
                            }
                        }
                    }
                }
            }
        ]
    });
})();
