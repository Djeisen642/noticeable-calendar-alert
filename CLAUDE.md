# CLAUDE.md

Guidance for working in this repository. Read this before making changes.

## What this is

**Noticeable Calendar Alert** — an ultra-lightweight Windows system-tray
utility that watches Google Calendar and triggers an always-on-top,
focus-stealing overlay before a meeting: a vector character walks in from the
right edge, waves, and shows a speech bubble with the meeting title and a
**Join Call** button.

**Stack (deliberate):** Tauri v2 + Vanilla TypeScript + Vite. **No React, no UI
framework** — the whole point is minimal memory footprint and GPU-composited
animation. Do not introduce a framework.

## The quality bar (definition of done)

This project is held to a high diligence standard. A change is **not done**
until all of the following are true. Do not report something as finished or
"working" unless you have actually run these and seen them pass.

1. **`npm run check` passes** — format, lint (type-aware), `tsc --noEmit`, and
   the unit tests. This is the same gate CI runs for the web layer.
2. **`npm run build` passes** — `tsc` + `vite build` actually bundles. A green
   lint/test run does **not** prove the app builds; check both.
3. **New logic has a unit test.** Pure logic (countdown math, URL validation,
   the mock) lives in `src/lib/*.ts` and must be tested in a sibling
   `*.test.ts`. Bugs fixed here get a regression test so they can't silently
   return.
4. **Rust changes compile.** `src-tauri` changes must pass `cargo check`
   (the CI `rust` job does this). See "What cannot be verified in the agent
   sandbox" below.
5. **Adversarial self-review before declaring victory.** Re-read your own diff
   hunting for the bug that makes the _demo itself_ fail, not just lint nits.
   Several real defects in this repo's history (frozen countdown, launch panic,
   per-second API hammering) passed lint and tests but broke the actual app.

### Verify, don't assume

- **Never trust training-cutoff memory for versions or API surfaces.** Check the
  live registry (`npm view <pkg> version`), the installed type defs
  (`node_modules/<pkg>/**/*.d.ts`), and release pages for GitHub Actions before
  pinning or calling anything. This repo intentionally runs current majors
  (Vite 8 / Rolldown-Oxc, Vitest 4, TypeScript 6, ESLint 10, Tauri 2,
  `actions/checkout@v7`, `actions/setup-node@v6`, Node 24 LTS in CI).
- **Distinguish "reviewed-correct" from "verified-running."** Say which one you
  mean. Don't claim a desktop behavior works if you only reasoned about it.

## Architecture

```
src/
  main.ts              # AlertController: slow calendar fetch + fast UI tick, serialized
  styles.css           # Transparent overlay; @keyframes walk / wave / bubble fade
  lib/
    countdown.ts(.test) # Pure meeting-countdown math
    poll.ts(.test)      # nextFetchDelayMs(): adaptive calendar-poll cadence
    calendar.ts(.test)  # CalendarSync interface + deterministic MockCalendarSync
    animation.ts        # OverlayAnimator state machine (idle → walking → waving)
    url.ts(.test)       # safeExternalUrl(): http(s)-only guard for untrusted links
    tauri.ts            # Optional native bridge; degrades gracefully in a browser
    google/             # Real Google Calendar OAuth layer
      pkce.ts(.test)     # PKCE verifier/challenge + state (RFC 7636)
      oauth.ts(.test)    # Auth-URL / token-body builders, expiry math
      events.ts(.test)   # events.list JSON -> CalendarEvent[] (no-any parsing)
      ports.ts           # HttpClient / TokenStore / Authorizer seams
      google-calendar.ts(.test) # GoogleCalendarSync over the ports (tested w/ fakes)
      adapters.ts        # Tauri adapters (http plugin, keychain, loopback) — UNRUN
      config.ts          # createCalendarSync() factory + VITE_GOOGLE_* env
src-tauri/
  src/lib.rs           # Tray icon, overlay window, set_click_through, plugin/command wiring
  src/oauth.rs         # Loopback redirect capture + keychain token commands — UNRUN
  src/main.rs          # Binary entry point
  tauri.conf.json      # Transparent, alwaysOnTop, skipTaskbar, hidden-until-needed window
  capabilities/        # Least-privilege permission set (only what JS invokes)
  icons/               # Placeholder PNGs (see icons/README.md)
```

### Key design decisions (don't regress these)

- **Two cadences, not one.** `AlertController.refresh()` hits the calendar on a
  slow, _adaptive_ schedule (`nextFetchDelayMs` in `lib/poll.ts` — fast when a
  meeting is near, idle when none is close), self-scheduled via `setTimeout` so
  fetches never overlap; `tick()` updates the countdown UI on a fast timer
  (`TICK_INTERVAL_MS`) from cache. Never fetch the calendar on the UI cadence —
  against the real Google API that is tens of thousands of requests/day.
- **Animations are serialized.** `runExclusive()` guards `present`/`dismiss`
  with a `busy` flag so overlapping ticks can't interleave DOM mutations.
- **The frontend must run framework-free in a plain browser too.** Every native
  call in `tauri.ts` is guarded by `isTauri()` and degrades to a no-op or a
  browser equivalent. This keeps `npm run dev` a fast iteration loop without a
  Rust build.
- **Click-through toggling.** The window is click-through (cursor-transparent)
  except while the bubble is up — `set_click_through(false)` is called before
  presenting so the Join button is clickable, then `true` on dismiss.
- **Security: calendar data is untrusted.** Meeting titles are rendered with
  `textContent` (never `innerHTML`). Join URLs pass through `safeExternalUrl()`
  and only `http(s)` ever reaches the OS opener.
- **Motion is GPU-only.** Animate `transform`/`opacity` exclusively; never
  animate layout properties. Respect `prefers-reduced-motion`.

## Commands

| Command                | Purpose                                            |
| ---------------------- | -------------------------------------------------- |
| `npm install`          | Install deps + git hooks (`prepare` → lefthook)    |
| `npm run dev`          | Browser-only preview of the overlay (no Rust)      |
| `npm run tauri dev`    | Full desktop app (needs Rust + Tauri prereqs)      |
| `npm run check`        | format + lint + typecheck + test (the web gate)    |
| `npm run build`        | `tsc --noEmit` + `vite build`                      |
| `npm run test:watch`   | Vitest in watch mode                               |
| `npm run tauri icon X` | Regenerate the real platform icon set from `X.png` |

Git hooks (Lefthook) auto-run eslint `--fix`, prettier, and project `tsc` on
staged files at commit time.

## TypeScript conventions

- `verbatimModuleSyntax` is on → use `import type { … }` for type-only imports.
- Imports use explicit `.ts` extensions (`./lib/url.ts`); Vite resolves them.
- `@typescript-eslint/no-floating-promises` is an error → `void` deliberate
  fire-and-forget promises.
- Unused args/vars must be `_`-prefixed.
- The config is strict (`strict`, `noUnusedLocals/Parameters`,
  `noImplicitReturns`, `noImplicitOverride`). Don't loosen it to dodge an error.

## What CANNOT be verified in the agent sandbox

This environment has **no Rust toolchain, no crates.io access, and no desktop
webview**, so the following are _reviewed for correctness but not executed
here_. Verify them on a real machine (or rely on the CI `rust` job) before
trusting them:

- **`cargo check` / `cargo build`** — the CI `rust` job is the source of truth.
  There is no committed `Cargo.lock` yet (cargo has never run); add one once it
  has, and switch CI to `--locked`.
- **The transparent, click-through, always-on-top window actually behaving that
  way on Windows** — including focus-stealing and right-edge positioning across
  multi-monitor / taskbar setups (`position_overlay_right` currently assumes a
  single monitor at origin 0,0).
- **`invoke('set_click_through')` succeeding under the strict CSP** — confirm
  the IPC `connect-src` (`ipc:` / `http://ipc.localhost`) is sufficient and that
  app-defined commands don't need a capability entry (they should not in v2).
- **Tray icon + menu** rendering and the "Test Overlay" item.
- **The Google OAuth native path** — `src-tauri/src/oauth.rs` (loopback redirect
  capture + keychain) and `src/lib/google/adapters.ts`. The OAuth/Calendar
  _logic_ is fully unit-tested via injected ports, but the live consent
  round-trip, the `tauri-plugin-http` calls, and the OS keychain
  (`token_save/load/clear`) need a real desktop run. Set `VITE_GOOGLE_*` in
  `.env`, then use the tray "Sign in with Google" item.

When you touch any of the above, say explicitly in your summary that it is
reviewed-but-unrun, and list what the user must check on-device.

## Known follow-ups (not yet done)

- Verify the Google OAuth native path on a real machine (logic is tested; the
  loopback/keychain/http-plugin adapters are reviewed-but-unrun).
- Commit a real icon set / `Cargo.lock`; add `icon.ico`/`icon.icns` back to
  `bundle.icon` for release bundling.
- Multi-monitor-aware overlay positioning (account for monitor origin + taskbar).
- Optional: coverage thresholds; `cargo clippy`/`cargo fmt` gates once a Rust
  toolchain is available to validate them locally.
