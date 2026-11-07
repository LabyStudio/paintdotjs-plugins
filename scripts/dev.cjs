const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const {spawn, spawnSync} = require("node:child_process");
const {createHash} = require("node:crypto");

const root = path.resolve(__dirname, "..");
const arguments_ = process.argv.slice(2);
const pluginArgument = arguments_.find(argument => !argument.startsWith("--"));
const skipHostBuild = arguments_.includes("--no-build");
const showHelp = arguments_.includes("--help");

if (!pluginArgument || showHelp) {
    const available = fs.readdirSync(path.join(root, "plugins")).sort().join("\n  ");
    console.log("Usage: npm run dev -- <plugin-folder> [--no-build]");
    console.log("\nAvailable plugin folders:\n  " + available);
    process.exit(showHelp ? 0 : 1);
}

const pluginDirectory = fs.existsSync(path.resolve(pluginArgument))
    ? path.resolve(pluginArgument)
    : path.join(root, "plugins", pluginArgument);
if (!fs.statSync(pluginDirectory, {throwIfNoEntry: false})?.isDirectory()) {
    throw new Error(`Plugin directory not found: ${pluginArgument}`);
}

const paintDotJsDirectory = path.resolve(
    process.env.PAINTDOTJS_PATH || path.join(root, "..", "paintdotjs")
);
if (!fs.existsSync(path.join(paintDotJsDirectory, "package.json"))) {
    throw new Error(
        `paint.js was not found at ${paintDotJsDirectory}. Set PAINTDOTJS_PATH to its checkout.`
    );
}

if (!skipHostBuild) {
    console.log("[plugin-dev] Building paint.js...");
    const npm = process.platform === "win32" ? "npm.cmd" : "npm";
    const result = spawnSync(npm, ["run", "desktop:build"], {
        cwd: paintDotJsDirectory,
        stdio: "inherit"
    });
    if (result.status !== 0) {
        process.exit(result.status || 1);
    }
}

const electron = path.join(
    paintDotJsDirectory,
    "node_modules",
    ".bin",
    process.platform === "win32" ? "electron.cmd" : "electron"
);
if (!fs.existsSync(electron)) {
    throw new Error(`Electron is not installed in ${paintDotJsDirectory}. Run npm ci there first.`);
}

const profileId = createHash("sha256").update(pluginDirectory).digest("hex").slice(0, 12);
const profile = path.join(os.tmpdir(), `paintdotjs-plugin-dev-${profileId}`);
fs.rmSync(profile, {recursive: true, force: true});
fs.mkdirSync(profile, {recursive: true});
const child = spawn(
    electron,
    [paintDotJsDirectory, `--user-data-dir=${profile}`, `--dev-plugin=${pluginDirectory}`],
    {
        cwd: paintDotJsDirectory,
        stdio: "inherit"
    }
);

let cleaned = false;
const cleanup = () => {
    if (cleaned) {
        return;
    }
    cleaned = true;
    fs.rmSync(profile, {recursive: true, force: true});
};
const stop = signal => {
    if (!child.killed) {
        child.kill(signal);
    }
};

process.once("SIGINT", () => stop("SIGINT"));
process.once("SIGTERM", () => stop("SIGTERM"));
process.once("exit", cleanup);
child.once("error", error => {
    console.error("[plugin-dev] Could not launch paint.js:\n" + error.stack);
    cleanup();
    process.exitCode = 1;
});
child.once("exit", code => {
    cleanup();
    process.exitCode = code || 0;
});
