// Hue/Saturation+ by BoltBait. JavaScript port; all plugin credit belongs to the original creator.
// Local prototype: upstream licensing review is required before publication.
(() => {
    const { range, checkbox } = paintDotJs.controls;
    const clampChannel = (value) => Math.max(0, Math.min(255, value));

    function isWithinWrappedRange(value, start, end) {
        return start <= end ? value >= start && value <= end : value < end || value > start;
    }

    function adjustColor(red, green, blue, hue, saturation, lightness) {
        let rgb = [red, green, blue];
        if (saturation !== 0) {
            const intensity = 19595 * red + 38470 * green + 7471 * blue;
            const factor = Math.trunc(((saturation + 100) * 65536) / 100);
            rgb = rgb.map((channel) => clampChannel((intensity + (channel - (intensity >> 16)) * factor) >> 16));
        }

        const maximum = Math.max(...rgb);
        const minimum = Math.min(...rgb);
        const delta = maximum - minimum;
        if (hue !== 0 && delta > 0) {
            const [adjustedRed, adjustedGreen, adjustedBlue] = rgb;
            let sector =
                maximum === adjustedRed
                    ? (adjustedGreen - adjustedBlue) / delta
                    : maximum === adjustedGreen
                      ? (adjustedBlue - adjustedRed) / delta + 2
                      : (adjustedRed - adjustedGreen) / delta + 4;
            sector += (hue * 6) / 360;
            while (sector < 0) {
                sector += 6;
            }
            while (sector >= 6) {
                sector -= 6;
            }
            const fraction = sector - Math.floor(sector);
            const rising = Math.trunc(maximum - delta * (1 - fraction) + 0.5);
            const falling = Math.trunc(maximum - delta * fraction + 0.5);
            rgb = [
                [maximum, rising, minimum],
                [falling, maximum, minimum],
                [minimum, maximum, rising],
                [minimum, falling, maximum],
                [rising, minimum, maximum],
                [maximum, minimum, falling]
            ][Math.floor(sector)];
        }
        if (lightness !== 0) {
            const target = lightness > 0 ? 1 : 0;
            const amount = Math.abs(lightness) / 100;
            rgb = rgb.map((channel) => Math.trunc(0.5 + 255 * (channel / 255 + (target - channel / 255) * amount)));
        }
        return rgb;
    }
    paintDotJs.registerPlugin({
        workerSafe: true,
        effects: [
            {
                id: "hue-saturation-plus",
                name: "Hue / Saturation+",
                menu: "Adjustments",
                category: "Root",
                icon: paintDotJs.asset("hue-saturation-plus.png"),
                controls: [
                    range("from-hue", "From Hue", 0, 360, 0, 1, { track: "hue" }),
                    range("to-hue", "To Hue", 0, 360, 360, 1, { track: "hue" }),
                    checkbox("gray", "Also select gray pixels (only adjust Lightness/alpha)", true),
                    range("from-saturation", "From Saturation", 0, 100, 0, 1, {
                        track: "saturation"
                    }),
                    range("to-saturation", "To Saturation", 0, 100, 100, 1, {
                        track: "saturation"
                    }),
                    range("hue", "Hue Adjustment", -180, 180, 0, 1, {
                        track: "hue-shift"
                    }),
                    range("saturation", "Saturation Adjustment", -100, 100, 0, 1, {
                        track: "saturation-adjustment"
                    }),
                    range("lightness", "Lightness Adjustment", -100, 100, 0, 1, {
                        track: "lightness"
                    }),
                    range("alpha", "Alpha Adjustment", -100, 100, 0, 1, {
                        track: "alpha"
                    }),
                    checkbox("original", "Preview original image", false)
                ],
                render({ source, destination, values }) {
                    if (values.original) {
                        return;
                    }
                    for (let offset = 0; offset < source.length; offset += 4) {
                        const [red, green, blue, sourceAlpha] = source.subarray(offset, offset + 4);
                        if (sourceAlpha === 0) {
                            continue;
                        }

                        const gray = red === green && green === blue;
                        const [hue, saturation] = paintDotJs.pixels.rgbToHsv(red, green, blue);
                        if (
                            gray
                                ? !values.gray
                                : !isWithinWrappedRange(Math.trunc(hue), values["from-hue"], values["to-hue"]) ||
                                  !isWithinWrappedRange(
                                      Math.trunc(saturation * 100),
                                      values["from-saturation"],
                                      values["to-saturation"]
                                  )
                        ) {
                            continue;
                        }

                        const color = adjustColor(
                            red,
                            green,
                            blue,
                            gray ? 0 : values.hue,
                            gray ? 0 : values.saturation,
                            values.lightness
                        );
                        const alpha =
                            values.alpha < 0
                                ? sourceAlpha + sourceAlpha * (values.alpha / 100)
                                : sourceAlpha + ((255 - sourceAlpha) * values.alpha) / 100;
                        destination.set([...color, Math.trunc(clampChannel(alpha))], offset);
                    }
                }
            }
        ]
    });
})();
