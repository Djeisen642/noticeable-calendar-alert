# App icons

This folder holds the icon set referenced by `tauri.conf.json`
(`bundle.icon`); the tray reuses the embedded window icon at runtime.

## The design

A herald's trumpet with a crimson swallowtail banner carrying a calendar
glyph — the app's "announce the meeting" concept, drawn in the same
gold / crimson / steel-on-navy palette as the in-app characters but
deliberately **character-neutral** so the mascot roster can grow without
dating the icon.

## Source of truth

`icon.svg` is the master. The committed PNGs are rendered from it:

| File             | Size      | Used for                               |
| ---------------- | --------- | -------------------------------------- |
| `32x32.png`      | 32×32     | Windows window/tray icon               |
| `128x128.png`    | 128×128   | Linux window icon                      |
| `128x128@2x.png` | 256×256   | HiDPI                                  |
| `icon.png`       | 1024×1024 | Default icon + source for `tauri icon` |

To regenerate after editing `icon.svg`, rasterize it at 32/128/256/1024
(e.g. with `@resvg/resvg-js`, `rsvg-convert`, or Inkscape) and overwrite the
PNGs above. Note when rasterizing: headless-Chromium screenshots silently
come out blank below ~200px windows, and a pure-vertical line has a
zero-width bounding box which disables `objectBoundingBox` gradient strokes —
`icon.svg` uses solid fills where that matters.

## Before a release

Generate the remaining platform formats from the 1024×1024 `icon.png`:

```bash
npm run tauri icon src-tauri/icons/icon.png
```

That produces `icon.ico` (Windows) and `icon.icns` (macOS). **Add
`icons/icon.ico` and `icons/icon.icns` back into the `bundle.icon` array**
in `tauri.conf.json` before building Windows/macOS installers — they are
omitted from the committed config because those binaries aren't checked in.
