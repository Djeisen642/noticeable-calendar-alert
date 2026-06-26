# Noticeable Calendar Alert

An ultra-lightweight, open-source Windows **system-tray utility** that watches
your Google Calendar and, right before a meeting starts, summons an aggressive
**always-on-top** overlay: a vector character walks in from the right edge of
your screen, waves, and pops a speech bubble with the meeting title and a
**Join Call** button.

Built with **Tauri v2** + **Vanilla TypeScript + Vite** — no React, no UI
framework — for the smallest possible memory footprint and butter-smooth,
GPU-composited animation.

---

## Why it's fast

- **No framework runtime.** The UI is plain DOM + a tiny state machine.
- **GPU-only animation.** Movement uses `transform`/`opacity` via CSS
  `@keyframes`; the CPU stays idle.
- **Native shell.** Tauri ships a ~600 KB Rust binary that uses the OS webview
  instead of bundling Chromium.
- **Click-through overlay.** The window ignores the cursor except while the
  "Join Call" button is on screen, so it never gets in your way.

## Architecture

```
src/
  main.ts              # Wires calendar polling → overlay lifecycle
  styles.css           # Transparent overlay + @keyframes (walk / wave / fade)
  lib/
    countdown.ts       # Pure meeting-countdown math (unit-tested)
    countdown.test.ts  # Vitest specs for the delta calculations
    calendar.ts        # Google Calendar sync interface + deterministic mock
    animation.ts       # OverlayAnimator state machine (walk → wave → bubble)
    tauri.ts           # Optional bridge to the Tauri runtime (degrades in browser)
src-tauri/
  src/lib.rs           # Tray icon, overlay window setup, click-through command
  src/main.rs          # Binary entry point
  tauri.conf.json      # Transparent, always-on-top, skip-taskbar overlay window
  capabilities/        # Least-privilege permission set for the overlay
```

The frontend runs in a **plain browser** (`npm run dev`) _and_ inside the Tauri
webview — every native call in `src/lib/tauri.ts` degrades gracefully when the
Tauri APIs are absent, so you can iterate on the animation without a Rust build.

## Prerequisites

- **Node.js ≥ 22.12** (CI uses Node 24 LTS)
- **Rust** (stable) + the [Tauri v2 system dependencies](https://v2.tauri.app/start/prerequisites/)

## Getting started

```bash
npm install            # installs deps and the git hooks (via `prepare`)
npm run dev            # browser-only preview of the overlay animation
npm run tauri dev      # full desktop app (requires Rust + app icons)
```

Generate the app/tray icons once before the first desktop build:

```bash
npm run tauri icon path/to/source-1024.png
```

## Quality scripts

| Script                  | What it does                             |
| ----------------------- | ---------------------------------------- |
| `npm run lint`          | ESLint 9+ flat config, type-aware        |
| `npm run format:check`  | Prettier formatting check                |
| `npm run typecheck`     | `tsc --noEmit` against the strict config |
| `npm run test`          | Vitest unit tests                        |
| `npm run test:coverage` | Vitest with v8 coverage                  |
| `npm run check`         | All of the above (what CI runs)          |

Git hooks are managed by [Lefthook](https://lefthook.dev): on every commit,
staged files are auto-formatted, lint-fixed, and the project is type-checked.

## Google Calendar integration

The calendar layer currently ships a `MockCalendarSync` that synthesizes a
meeting a few seconds out so the overlay can be exercised on demand. The real
implementation will swap in a `GoogleCalendarSync` that performs an OAuth 2.0
PKCE flow and reads `events.list` — see the `CalendarSync` interface in
[`src/lib/calendar.ts`](src/lib/calendar.ts).

## License

[MIT](LICENSE) © 2026 Jason Suttles
