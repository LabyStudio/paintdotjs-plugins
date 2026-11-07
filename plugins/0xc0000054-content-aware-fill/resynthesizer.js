/*
 * JavaScript port of the Resynthesizer-based algorithm used by Nicholas
 * Hayes' Content Aware Fill plugin for Paint.NET.
 *
 * The original implementation and this port are distributed under the
 * GNU General Public License, version 2 or later. See assets/LICENSE.txt.
 */

const DEFAULT_SEED = 1198472;
const MAX_NEIGHBORS = 16;
const MAX_PASSES = 6;
const MAX_RANDOM_TRIES = 500;
const MAX_WEIGHT = 65535;
const SENSITIVITY_TO_OUTLIERS = 0.117;
const TERMINATE_FRACTION = 0.1;

const differenceWeights = createDifferenceWeights();

function createDifferenceWeights() {
    const weights = new Uint16Array(512);
    const divisor = negativeLogCauchy(1 / SENSITIVITY_TO_OUTLIERS);

    for (let difference = -256; difference < 256; ++difference) {
        const normalized = difference / 256 / SENSITIVITY_TO_OUTLIERS;
        weights[256 + difference] = Math.min(
            MAX_WEIGHT,
            Math.floor((negativeLogCauchy(normalized) / divisor) * MAX_WEIGHT)
        );
    }

    return weights;
}

function negativeLogCauchy(value) {
    return Math.log(value * value + 1);
}

function createRandom(seed) {
    // A deterministic 32-bit generator keeps previews stable for a given seed.
    let state = Number(seed) >>> 0 || DEFAULT_SEED;

    return (maximum) => {
        state = (state + 0x6d2b79f5) >>> 0;
        let value = state;
        value = Math.imul(value ^ (value >>> 15), value | 1);
        value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
        value = (value ^ (value >>> 14)) >>> 0;
        return Math.floor((value / 0x100000000) * maximum);
    };
}

function findSelectionBounds(selection, width, height) {
    let left = width;
    let top = height;
    let right = -1;
    let bottom = -1;
    let count = 0;

    for (let y = 0; y < height; ++y) {
        for (let x = 0; x < width; ++x) {
            if (selection[y * width + x] === 0) {
                continue;
            }

            left = Math.min(left, x);
            top = Math.min(top, y);
            right = Math.max(right, x);
            bottom = Math.max(bottom, y);
            ++count;
        }
    }

    return count === 0 ? null : { left, top, right, bottom, count };
}

function dilateSelection(selection, width, height, radius) {
    const horizontal = new Uint8Array(width * height);
    const dilated = new Uint8Array(width * height);

    // Two sliding-window passes produce the same square expansion Paint.NET
    // obtains by inflating each selection scan rectangle.
    for (let y = 0; y < height; ++y) {
        let selected = 0;
        for (let x = -radius; x < width + radius; ++x) {
            const addedX = x + radius;
            const removedX = x - radius - 1;

            if (addedX >= 0 && addedX < width && selection[y * width + addedX] !== 0) {
                ++selected;
            }
            if (removedX >= 0 && removedX < width && selection[y * width + removedX] !== 0) {
                --selected;
            }
            if (x >= 0 && x < width && selected > 0) {
                horizontal[y * width + x] = 1;
            }
        }
    }

    for (let x = 0; x < width; ++x) {
        let selected = 0;
        for (let y = -radius; y < height + radius; ++y) {
            const addedY = y + radius;
            const removedY = y - radius - 1;

            if (addedY >= 0 && addedY < height && horizontal[addedY * width + x] !== 0) {
                ++selected;
            }
            if (removedY >= 0 && removedY < height && horizontal[removedY * width + x] !== 0) {
                --selected;
            }
            if (y >= 0 && y < height && selected > 0) {
                dilated[y * width + x] = 1;
            }
        }
    }

    return dilated;
}

function createSourcePoints(source, selection, bounds, width, height, sampleSize, sampleFrom) {
    const sampleMask = dilateSelection(selection, width, height, sampleSize);
    const available = new Uint8Array(width * height);
    const points = [];

    for (let y = 0; y < height; ++y) {
        for (let x = 0; x < width; ++x) {
            const index = y * width + x;
            if (sampleMask[index] === 0 || selection[index] !== 0 || source[index * 4 + 3] === 0) {
                continue;
            }

            if (sampleFrom === "sides" && (y < bounds.top || y > bounds.bottom)) {
                continue;
            }
            if (sampleFrom === "top-bottom" && (x < bounds.left || x > bounds.right)) {
                continue;
            }

            available[index] = 1;
            points.push(index);
        }
    }

    if (points.length === 0) {
        throw new Error("Content Aware Fill could not find any visible pixels to sample.");
    }

    return { available, points };
}

function createTargetPoints(selection, bounds, width, height, fillDirection, sampleFrom, random) {
    const points = [];
    const centerX = (bounds.left + bounds.right) / 2;
    const centerY = (bounds.top + bounds.bottom) / 2;

    for (let index = 0; index < selection.length; ++index) {
        if (selection[index] !== 0) {
            points.push(index);
        }
    }

    if (fillDirection === "random") {
        shuffle(points, random);
        return points;
    }

    const outward = fillDirection === "outward";
    const score = (index) => {
        const x = (index % width) - centerX;
        const y = Math.floor(index / width) - centerY;

        if (sampleFrom === "sides") {
            return x * x;
        }
        if (sampleFrom === "top-bottom") {
            return y * y;
        }
        return x * x + y * y;
    };

    points.sort((left, right) => {
        const difference = score(left) - score(right);
        return outward ? -difference : difference;
    });

    // Randomizing a narrow band avoids obvious scan patterns while retaining
    // the requested overall fill direction.
    const halfBand = Math.max(1, Math.floor(points.length * 0.1));
    for (let index = 0; index < points.length; ++index) {
        const start = Math.max(0, index - halfBand);
        const end = Math.min(points.length, index + halfBand + 1);
        const other = start + random(end - start);
        [points[index], points[other]] = [points[other], points[index]];
    }

    return points;
}

function shuffle(values, random) {
    for (let index = values.length - 1; index > 0; --index) {
        const other = random(index + 1);
        [values[index], values[other]] = [values[other], values[index]];
    }
}

function findNeighbors(position, hasValue, sourceOf, destination, width, height) {
    const neighbors = [];
    const x = position % width;
    const y = Math.floor(position / width);
    const maximumRadius = Math.max(width, height);

    for (let radius = 1; radius < maximumRadius && neighbors.length < MAX_NEIGHBORS; ++radius) {
        const left = x - radius;
        const right = x + radius;
        const top = y - radius;
        const bottom = y + radius;

        for (let nx = left; nx <= right && neighbors.length < MAX_NEIGHBORS; ++nx) {
            addNeighbor(nx, top);
            if (bottom !== top && neighbors.length < MAX_NEIGHBORS) {
                addNeighbor(nx, bottom);
            }
        }
        for (let ny = top + 1; ny < bottom && neighbors.length < MAX_NEIGHBORS; ++ny) {
            addNeighbor(left, ny);
            if (right !== left && neighbors.length < MAX_NEIGHBORS) {
                addNeighbor(right, ny);
            }
        }
    }

    return neighbors;

    function addNeighbor(nx, ny) {
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) {
            return;
        }

        const index = ny * width + nx;
        if (hasValue[index] === 0) {
            return;
        }

        neighbors.push({
            dx: nx - x,
            dy: ny - y,
            pixelOffset: index * 4,
            sourceIndex: sourceOf[index]
        });
    }
}

function candidateScore(candidate, neighbors, source, target, available, width, height, bestScore) {
    const candidateX = candidate % width;
    const candidateY = Math.floor(candidate / width);
    let score = 0;

    for (const neighbor of neighbors) {
        const sampleX = candidateX + neighbor.dx;
        const sampleY = candidateY + neighbor.dy;

        if (sampleX < 0 || sampleY < 0 || sampleX >= width || sampleY >= height) {
            score += MAX_WEIGHT * 3;
        } else {
            const sampleIndex = sampleY * width + sampleX;
            if (available[sampleIndex] === 0) {
                score += MAX_WEIGHT * 3;
            } else {
                const sourceOffset = sampleIndex * 4;
                const targetOffset = neighbor.pixelOffset;
                score += differenceWeights[256 + target[targetOffset] - source[sourceOffset]];
                score += differenceWeights[256 + target[targetOffset + 1] - source[sourceOffset + 1]];
                score += differenceWeights[256 + target[targetOffset + 2] - source[sourceOffset + 2]];
            }
        }

        if (score >= bestScore) {
            return score;
        }
    }

    return score;
}

function synthesizePass(options, endIndex) {
    const { targetPoints, sourcePoints, available, source, destination, hasValue, sourceOf, width, height, random } =
        options;
    let changed = 0;

    for (let targetIndex = 0; targetIndex < endIndex; ++targetIndex) {
        const position = targetPoints[targetIndex];
        const neighbors = findNeighbors(position, hasValue, sourceOf, destination, width, height);
        hasValue[position] = 1;

        let bestPoint = -1;
        let bestScore = Number.POSITIVE_INFINITY;
        const tried = new Set();

        // Continue coherent source patches suggested by already-filled neighbors.
        for (const neighbor of neighbors) {
            if (neighbor.sourceIndex < 0) {
                continue;
            }

            const neighborSourceX = neighbor.sourceIndex % width;
            const neighborSourceY = Math.floor(neighbor.sourceIndex / width);
            const candidateX = neighborSourceX - neighbor.dx;
            const candidateY = neighborSourceY - neighbor.dy;
            if (candidateX < 0 || candidateY < 0 || candidateX >= width || candidateY >= height) {
                continue;
            }

            const candidate = candidateY * width + candidateX;
            if (available[candidate] === 0 || tried.has(candidate)) {
                continue;
            }

            tried.add(candidate);
            const score = candidateScore(
                candidate,
                neighbors,
                source,
                destination,
                available,
                width,
                height,
                bestScore
            );
            if (score < bestScore) {
                bestScore = score;
                bestPoint = candidate;
            }
            if (score === 0) {
                break;
            }
        }

        const randomTries = Math.min(
            MAX_RANDOM_TRIES,
            Math.max(80, Math.floor(2000000 / Math.max(1, targetPoints.length)))
        );
        for (let attempt = 0; attempt < randomTries && bestScore !== 0; ++attempt) {
            const candidate = sourcePoints[random(sourcePoints.length)];
            if (tried.has(candidate)) {
                continue;
            }

            tried.add(candidate);
            const score = candidateScore(
                candidate,
                neighbors,
                source,
                destination,
                available,
                width,
                height,
                bestScore
            );
            if (score < bestScore) {
                bestScore = score;
                bestPoint = candidate;
            }
        }

        if (bestPoint < 0) {
            bestPoint = sourcePoints[random(sourcePoints.length)];
        }

        if (sourceOf[position] !== bestPoint) {
            ++changed;
            sourceOf[position] = bestPoint;
            const from = bestPoint * 4;
            const to = position * 4;
            destination[to] = source[from];
            destination[to + 1] = source[from + 1];
            destination[to + 2] = source[from + 2];
            destination[to + 3] = source[from + 3];
        }
    }

    return changed;
}

export function contentAwareFill({
    source,
    destination,
    width,
    height,
    selection,
    sampleSize = 50,
    sampleFrom = "sides",
    fillDirection = "inward",
    seed = DEFAULT_SEED
}) {
    if (!(selection instanceof Uint8Array) || selection.length !== width * height) {
        throw new Error("Content Aware Fill requires an active selection.");
    }

    const bounds = findSelectionBounds(selection, width, height);
    if (bounds === null || bounds.count === width * height) {
        throw new Error("Content Aware Fill requires both selected and unselected pixels.");
    }

    const random = createRandom(seed);
    const { available, points: sourcePoints } = createSourcePoints(
        source,
        selection,
        bounds,
        width,
        height,
        Math.max(1, Math.min(100, Math.round(sampleSize))),
        sampleFrom
    );
    const targetPoints = createTargetPoints(selection, bounds, width, height, fillDirection, sampleFrom, random);
    const hasValue = new Uint8Array(width * height);
    const sourceOf = new Int32Array(width * height);
    sourceOf.fill(-1);

    for (let index = 0; index < hasValue.length; ++index) {
        if (selection[index] === 0 && source[index * 4 + 3] !== 0) {
            hasValue[index] = 1;
        }
    }

    const options = {
        targetPoints,
        sourcePoints,
        available,
        source,
        destination,
        hasValue,
        sourceOf,
        width,
        height,
        random
    };
    let count = targetPoints.length;

    for (let pass = 0; pass < MAX_PASSES && count > 0; ++pass) {
        const changed = synthesizePass(options, count);
        if (changed / count < TERMINATE_FRACTION) {
            break;
        }
        count = Math.floor(count * 0.75);
    }

    return destination;
}

export { DEFAULT_SEED };
