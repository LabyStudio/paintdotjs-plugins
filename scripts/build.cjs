const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const {buildPluginPackage} = require("./lib/plugin-package.cjs");

const root = path.resolve(__dirname, "..");
const outputDirectory = path.join(root, "dist");
let plugins = [];
let ids = new Set();

fs.rmSync(outputDirectory, { recursive: true, force: true });
fs.mkdirSync(outputDirectory, { recursive: true });

function buildPackage(directory, metadataText) {
    let pluginDirectory = path.join(root, "plugins", directory);
    let output = buildPluginPackage(pluginDirectory, metadataText);
    fs.writeFileSync(path.join(outputDirectory, `${directory}.paintjs`), output);
    return output;
}

for (let directory of fs.readdirSync(path.join(root, "plugins")).sort()) {
    let metadataPath = path.join(root, "plugins", directory, "plugin.json");
    let metadataText = fs.readFileSync(metadataPath, "utf8");
    let metadata = JSON.parse(metadataText);
    if (!/^[a-z0-9][a-z0-9._-]{0,63}$/.test(metadata.id) || ids.has(metadata.id) || metadata.apiVersion !== 1) {
        throw new Error(`Invalid or duplicate package ID / API version: ${directory}`);
    }
    ids.add(metadata.id);
    for (let key of ["name", "version", "author", "description", "category", "license", "website"]) {
        if (typeof metadata[key] !== "string" || !metadata[key].trim()) {
            throw new Error(`${directory} requires ${key}; preserve original creator credits.`);
        }
    }
    if (new URL(metadata.website).protocol !== "https:") {
        throw new Error(`${directory} requires an HTTPS original creator link.`);
    }

    let packageBytes = buildPackage(directory, metadataText);
    let file = `${directory}.paintjs`;
    let sha256 = crypto.createHash("sha256").update(packageBytes).digest("hex");
    let source = `https://github.com/LabyStudio/paintdotjs-plugins/tree/main/plugins/${directory}`;
    plugins.push({ ...metadata, file, source, sha256 });
}

let output = JSON.stringify({ schemaVersion: 1, plugins }, null, 2) + "\n";
fs.writeFileSync(path.join(outputDirectory, "catalog.json"), output);
console.log(`Validated catalog with ${plugins.length} plugins.`);
