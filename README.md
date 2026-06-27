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

## Connecting Google Calendar

Without credentials the app uses a deterministic `MockCalendarSync`, so
`npm run dev` works out of the box. To read your real calendar, create a Google
OAuth **Desktop app** client and point the app at it.

### 1. Create the OAuth client

1. Open the [Google Cloud Console](https://console.cloud.google.com/) and create
   (or pick) a project.
2. **APIs & Services → Library →** enable the **Google Calendar API**.
3. **APIs & Services → OAuth consent screen**:
   - **User type: External**, and leave **Publishing status: Testing**.
   - Add the scope `https://www.googleapis.com/auth/calendar.events.readonly`.
   - Under **Test users**, add the Google address you'll sign in with. Testing
     mode allows up to 100 test users with no Google verification review.
4. **APIs & Services → Credentials → Create credentials → OAuth client ID →
   Application type: Desktop app.** Copy the **client ID** and **client secret**.

> For a Desktop-app client the "secret" is **not** confidential — Google says so,
> and PKCE provides the real protection. It still lives only in your gitignored
> `.env`.

### 2. Configure the app

```bash
cp .env.example .env
# then fill in:
#   VITE_GOOGLE_CLIENT_ID=...apps.googleusercontent.com
#   VITE_GOOGLE_CLIENT_SECRET=...
#   VITE_OAUTH_REDIRECT_PORT=1421   # optional; must be free
```

### 3. Sign in

```bash
npm run tauri dev
```

Then use the tray menu → **Sign in with Google**. The system browser opens
Google's consent screen; after you approve, a one-time loopback listener on
`127.0.0.1:<port>` captures the redirect and the app exchanges it for tokens.
The refresh token is stored in your **OS keychain** (Windows Credential Manager
/ macOS Keychain / Linux Secret Service) — never on disk in plaintext. The
access token is refreshed silently; you only re-consent if you revoke access.

The tray's auth item is a single toggle: once you're signed in it relabels to
**Sign out**. Clicking it disconnects — it deletes the stored token, so the next
sync needs a fresh sign-in and the item flips back to **Sign in with Google**.

### Using a work (Google Workspace) account

The code works with any account — your **primary** calendar is what's read, and
the scope is read-only. The gatekeeper is your **org's admin policy**, not the
app:

- You may see **"Access blocked: app not verified."** For your own app you can
  normally click **Advanced → continue**, but an admin can disable that.
- You may see an **org-policy block** if IT restricts unverified third-party
  apps. Then they must allowlist the client ID under **Admin console → Security →
  API controls → App access control**, or add you as a test user where allowed.

Also confirm your company's data policy permits connecting calendar data to a
self-built app before doing so.

### Code map

See the `CalendarSync` interface in [`src/lib/calendar.ts`](src/lib/calendar.ts)
and the implementation under [`src/lib/google/`](src/lib/google/). All OAuth and
parsing logic is unit-tested; the native adapters (`adapters.ts`,
`src-tauri/src/oauth.rs`) are reviewed-but-unrun until exercised on a desktop —
see `CLAUDE.md`.

## License

[MIT](LICENSE) © 2026 Jason Suttles
