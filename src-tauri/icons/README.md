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

Two SVG masters, same composition at two detail levels:

- `icon.svg` — the full-detail art (fanfare arcs, sparkle, cords, day grid).
- `icon-small.svg` — hand-tuned for ≤32px: detail dropped, shapes fattened,
  a single bold alert date instead of the grid. Keep it in sync with
  `icon.svg` when the design changes — it is the same icon, simplified.

| File             | Size      | Rendered from    | Used for                               |
| ---------------- | --------- | ---------------- | -------------------------------------- |
| `32x32.png`      | 32×32     | `icon-small.svg` | Windows window/tray icon               |
| `128x128.png`    | 128×128   | `icon.svg`       | Linux window icon                      |
| `128x128@2x.png` | 256×256   | `icon.svg`       | HiDPI                                  |
| `icon.png`       | 1024×1024 | `icon.svg`       | Default icon + source for `tauri icon` |

To regenerate after editing the SVGs, rasterize each master at its sizes
(e.g. with `@resvg/resvg-js`, `rsvg-convert`, or Inkscape) and overwrite the
PNGs above. Note when rasterizing: headless-Chromium screenshots silently
come out blank below ~200px windows, and a pure-vertical line has a
zero-width bounding box which disables `objectBoundingBox` gradient strokes —
`icon.svg` uses solid fills where that matters.

## Regenerating `icon.ico` / `icon.icns`

`icon.ico` (Windows) and `icon.icns` (macOS) are committed and already listed
in `tauri.conf.json`'s `bundle.icon`, so a normal `npm run tauri build` picks
them up — no pre-release step needed.

To regenerate them after the SVG masters change:

```bash
npm run tauri icon src-tauri/icons/icon.png
```

This command rasterizes **every** platform format (including Android/iOS/
Windows Store assets this desktop-only app doesn't ship) from the single
1024×1024 source, overwriting the hand-tuned `32x32.png`/`128x128.png`/
`128x128@2x.png`/`icon.png` in the process. After running it:

1. `git checkout -- icons/32x32.png icons/128x128.png icons/128x128@2x.png icons/icon.png`
   to restore the hand-tuned PNGs (see note below).
2. Delete the unused generated assets (`64x64.png`, `Square*.png`,
   `StoreLogo.png`, `android/`, `ios/`).
3. Keep only the regenerated `icon.ico` and `icon.icns`.

Note that `tauri icon` derives every `.ico` sub-size from the one detailed
source, so the small entries inside it won't get the hand-tuned art. For a
polished release `.ico`, assemble it from per-size PNGs instead (16/32 from
`icon-small.svg`, larger from `icon.svg`) with an ico packer such as
ImageMagick (`magick convert 16.png 32.png 48.png 256.png icon.ico`) or the
`png-to-ico` npm package.
