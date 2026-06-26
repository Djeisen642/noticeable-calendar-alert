# App icons

This folder holds the icon set referenced by `tauri.conf.json`
(`bundle.icon`) and the tray (`app.trayIcon.iconPath`).

## Committed placeholders

`32x32.png`, `128x128.png`, `128x128@2x.png`, and `icon.png` are committed
**placeholder** icons (a flat blue tile) so the project compiles and runs in
development without an extra setup step — `generate_context!` embeds the window
icon at build time and fails if it is missing.

## Before a real release

Replace the placeholders and regenerate the full platform set from a single
1024×1024 source PNG:

```bash
npm run tauri icon path/to/source-icon.png
```

That produces `icon.ico` (Windows) and `icon.icns` (macOS) in addition to the
PNGs. **Add `icons/icon.ico` and `icons/icon.icns` back into the `bundle.icon`
array** in `tauri.conf.json` before building Windows/macOS installers — they are
omitted from the committed config because valid binaries aren't checked in.
