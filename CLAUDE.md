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
4. **Rust changes pass the Rust gate.** In `src-tauri`: `cargo fmt --check`,
   `cargo clippy --locked --all-targets -- -D warnings`, `cargo check --locked`,
   `cargo test --locked`. All four run in CI, and all four run in the agent
   sandbox once the system libraries are installed (below), so run them rather
   than deferring to CI.
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
  styles.css           # Transparent overlay; walk/wave/blink/breathe/hop choreography
  lib/
    countdown.ts(.test) # Pure meeting-countdown math + countdownUrgency()
    poll.ts(.test)      # nextFetchDelayMs(): adaptive calendar-poll cadence
    calendar.ts(.test)  # CalendarSync interface + selectNextEvents + MockCalendarSync
    characters/          # The mascot cast — one module per concern
      character.ts        # Character interface + core part-id contract + mountCharacter
      knight.ts           # The herald knight
      dragon.ts           # The crimson dragon (wings, tail, fire breath)
      roster.ts(.test)    # CHARACTERS + CharacterRotation + factory
      characters.test.ts  # Per-character id/docs/styles.css guards
    bubble.ts(.test)    # Bubble content model: heading + the simultaneous-meeting list
    animation.ts        # OverlayAnimator (idle → walking → waving → presenting)
    url.ts(.test)       # safeExternalUrl(): http(s)-only guard for untrusted links
    action.ts(.test)    # resolveMeetingAction(): Join Call -> View Event fallback
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
  icons/               # App icon: icon.svg master + rendered PNGs (see icons/README.md)
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
  `textContent` (never `innerHTML`) — including every row the animator builds
  for the simultaneous-meeting pick list. Join URLs pass through
  `safeExternalUrl()` and only `http(s)` ever reaches the OS opener.
- **The bubble button always has somewhere to go.** `resolveMeetingAction()`
  (`lib/action.ts`) picks the join link when there is one and otherwise falls
  back to the event's own Google Calendar page (`htmlLink` →
  `CalendarEvent.detailsUrl`), so a meeting with no video link gets a **View
  Event** button instead of no button at all. Both candidates are re-validated
  at that last hop (`safeJoinUrl` / `safeEventDetailsUrl`) — the details guard
  requires https, an exact Google Calendar host, and a `/calendar` path. Every
  row of the pick list resolves through the same function, so a clashing
  meeting without a call still offers its event page.
- **An alert is a _group_, not an event.** `selectNextEvents()` returns every
  meeting tied for the soonest start, and the overlay presents the whole tie as
  one alert with a button per meeting — a double-booked slot must never
  silently pick one for the user. `alertKey()` (order-independent) is what
  present/dismiss bookkeeping keys off, so a re-poll that reshuffles a tie
  can't resurrect an alert the user already answered.
- **A capped pick list must be ordered by actionability.** The bubble lists at
  most `MAX_VISIBLE_MEETINGS` (`lib/bubble.ts`) and closes with a "+N more" row
  linking to that day's Google Calendar (`calendarDayUrl`), so an over-booked
  slot is disclosed rather than trimmed — the headline still counts the whole
  clash. Because rows can be cut, they are sorted by what they offer (a call,
  then an event page, then neither): sorted by title, a five-way clash could
  hide its only joinable call behind the "+N more" row.
- **Tauri permissions need a _scope_, not just the permission.** A bare
  capability string like `"opener:allow-open-url"` enables the command but leaves
  its allowlist empty, so at runtime every call is _denied_ ("Not allowed to open
  url …") — and only on a real desktop run, never in lint/tests/`npm run dev`.
  Plugins that take a scope (opener, http, fs) must list their allowed targets in
  `capabilities/default.json`, e.g.
  `{ "identifier": "opener:allow-open-url", "allow": [{ "url": "https://*" }] }`.
  The opener matches with glob default options (`*` crosses `/`); the real URL
  allowlist still lives in the JS guards (`safeExternalUrl`/`safeJoinUrl`).
- **Surface native-side failures in a dialog, not `console.error`.** Sign-in/out
  fires from the tray while the overlay window is hidden, so console logs (and a
  webview `alert()`) are invisible. Route user-facing errors through
  `showError()` (tauri-plugin-dialog) so they're actually seen.
- **Motion is GPU-only.** Animate `transform`/`opacity` exclusively; never
  animate layout properties. Respect `prefers-reduced-motion`.
- **One copy of the app, ever (`tauri-plugin-single-instance`).** Two copies
  meant two characters walking in for every meeting, every calendar poll
  doubled against the Google API quota, and two OAuth flows racing on the same
  keychain entry. A second launch hands off to the first and exits.
  Registered first, per the plugin's docs. (Ported from the sibling
  app-status-tracker, which found it.)
- **The tray status is remembered only once the tray accepted it.** Recording
  it before `setTrayStatus` resolved (and not awaiting it) meant one failure
  left the tray stale until the text next changed.
- **`Cargo.lock` is committed and CI uses `--locked`.** Without `--locked`, CI
  resolved a fresh dependency set every run, and the committed lockfile had
  drifted: it lacked the keychain and HTTP-plugin stacks entirely, and nothing
  noticed. A lockfile CI doesn't enforce pins nothing.

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

**The Rust does compile in the sandbox**, contrary to what this section used to
say. A fresh container lacks the system libraries, and the failure reads like a
broken crate (`The system library gdk-3.0 required by crate gdk-sys was not
found`). Two commands, in this order:

```bash
apt-get update    # REQUIRED FIRST: a stale index 404s on every package below
apt-get install -y libwebkit2gtk-4.1-dev libgtk-3-dev \
  libayatana-appindicator3-dev librsvg2-dev libsoup-3.0-dev libdbus-1-dev pkg-config
```

Then the full Rust gate runs (~90s for the first build). What the sandbox still
lacks is **a desktop webview and a real desktop**, so these are _reviewed for
correctness but not executed_:

- **The transparent, click-through, always-on-top window actually behaving that
  way on Windows**, including focus-stealing and right-edge positioning on a
  multi-monitor setup. `position_overlay_right` picks the largest connected
  monitor (by pixel area) and accounts for its origin, not just its size; this
  compiles and passes clippy but has not met real hardware (see "Known
  follow-ups" for the taskbar gap that remains).
- **`invoke('set_click_through')` succeeding under the strict CSP**: confirm
  the IPC `connect-src` (`ipc:` / `http://ipc.localhost`) is sufficient and that
  app-defined commands don't need a capability entry (they should not in v2).
- **Tray icon + menu** rendering and the "Test Overlay" item.
- **Single instance**: launch the app twice; there should be one tray icon.
- **The Google OAuth native path**: `src-tauri/src/oauth.rs` (loopback redirect
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
- Multi-monitor overlay positioning now targets the largest monitor and
  accounts for its origin (`src-tauri/src/lib.rs`, compiled and clippy-clean
  but unrun on real hardware); taskbar-aware placement (avoiding the work
  area reserved by the OS taskbar) is still not done.
- Optional: coverage thresholds.
- The crate has no Rust unit tests yet (`cargo test` runs zero). The pure parts
  of `oauth.rs` (redirect query parsing) and the monitor-choice math in
  `lib.rs` are the first candidates.
