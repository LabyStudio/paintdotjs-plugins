# paintdotjs-plugins

A plugin collection for [paint.js](https://github.com/LabyStudio/paintdotjs).

Plugins can add effects, adjustments, and file-type support. Users can install them through the plugin browser in paint.js or by importing a `.paintjs` package directly.

## Repository structure

Each plugin has its own directory under `plugins/`:

```text
plugins/example-plugin/
├── plugin.json
├── plugin.js
├── package.json
└── assets/
    └── icon.png
```

- `plugin.json` contains the plugin metadata.
- `plugin.js` registers the plugin and implements its behavior.
- `package.json` is only needed when the plugin uses npm dependencies.
- `assets/` is optional and contains images or other files used by the plugin.

Use `paintDotJs.asset("icon.png")` to reference a packaged asset from `plugin.js`.

## Build locally

Install the dependencies and build the plugin catalog:

```sh
npm ci
npm run build
```

The generated `.paintjs` packages and `catalog.json` are written to `dist/`.

To develop one plugin, launch paint.js with it already loaded:

```sh
npm run dev -- example-plugin
```

The command opens a clean desktop instance and reloads the plugin whenever a file in its directory changes. Press `F12` to open DevTools. Set `PAINTDOTJS_PATH` if the paint.js checkout is not next to this repository.

## Add a plugin

1. Create a new directory under `plugins/`.
2. Add `plugin.json` and `plugin.js`.
3. Add any optional files to `assets/`.
4. Run `npm run dev -- <plugin-directory>` and test it in paint.js.
5. Run `npm run build` before committing.

Use another plugin in this repository as a starting point. Keep metadata in `plugin.json`; `plugin.js` should contain only the implementation and registration.

## Plugin API

The [paint.js plugin API guide](https://github.com/LabyStudio/paintdotjs/tree/develop/docs/plugin-api) explains plugin registration, effects, controls, whole-image rendering, file types, assets, and workers.

Format plugin source files with:

```sh
npm run format
```
