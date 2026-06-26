# App icons

This folder must contain the platform icon set referenced by
`tauri.conf.json` (`32x32.png`, `128x128.png`, `128x128@2x.png`, `icon.icns`,
`icon.ico`, and `icon.png` for the tray).

Generate them all from a single 1024×1024 source PNG:

```bash
npm run tauri icon path/to/source-icon.png
```

The generated binaries are intentionally **not** committed — run the command
above once after cloning before the first desktop build.
