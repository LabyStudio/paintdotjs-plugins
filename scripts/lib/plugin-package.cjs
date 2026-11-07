const fs = require("node:fs");
const path = require("node:path");
const { buildSync } = require("esbuild");
const { strToU8, zipSync } = require("fflate");

const archiveDate = new Date("1980-01-01T00:00:00.000Z");

function archiveEntry(data) {
    return [data, { mtime: archiveDate }];
}

function buildPluginPackage(pluginDirectory, metadataText, options = {}) {
    const sourcePath = path.join(pluginDirectory, "plugin.js");
    if (!fs.existsSync(sourcePath)) {
        throw new Error(`${path.basename(pluginDirectory)} requires plugin.js.`);
    }

    const result = buildSync({
        entryPoints: [sourcePath],
        bundle: true,
        write: false,
        format: "iife",
        platform: "browser",
        target: ["es2020"],
        minify: options.minify !== false,
        sourcemap: options.sourceMap === true ? "inline" : false,
        sourcesContent: options.sourceMap === true,
        legalComments: "none",
        banner: {
            js: "/*! Third-party license texts are packaged in assets/THIRD-PARTY-NOTICES.txt. */"
        }
    });
    const source = Buffer.from(result.outputFiles[0].contents);
    const files = {
        "plugin.json": archiveEntry(strToU8(metadataText)),
        "plugin.js": archiveEntry(new Uint8Array(source))
    };
    const assetsDirectory = path.join(pluginDirectory, "assets");
    if (fs.existsSync(assetsDirectory)) {
        for (const assetName of fs.readdirSync(assetsDirectory).sort()) {
            const assetPath = path.join(assetsDirectory, assetName);
            if (!fs.statSync(assetPath).isFile() || !/^[A-Za-z0-9_.-]+$/.test(assetName)) {
                throw new Error(`${path.basename(pluginDirectory)} contains an invalid asset: ${assetName}`);
            }
            files[`assets/${assetName}`] = archiveEntry(new Uint8Array(fs.readFileSync(assetPath)));
        }
    }

    return Buffer.from(zipSync(files, { level: options.compressionLevel ?? 9 }));
}

module.exports = { buildPluginPackage };
