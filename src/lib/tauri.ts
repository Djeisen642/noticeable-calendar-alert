/**
 * Thin, optional bridge to the Tauri runtime.
 *
 * The frontend is built to run in a plain browser tab (for fast iteration with
 * `npm run dev`) *and* inside the Tauri webview. Every call here degrades
 * gracefully when the Tauri APIs are absent, so the UI never hard-crashes
 * outside the desktop shell.
 */

import { safeExternalUrl } from './url.ts';

/** `true` only when running inside the Tauri webview. */
export function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

/**
 * Toggle mouse click-through for the overlay window.
 *
 * When `enabled` is `true` the window ignores cursor events entirely, letting
 * clicks fall through to whatever is behind it. We turn this OFF while the
 * speech bubble (and its "Join Call" button) is on screen so it stays
 * interactive, then back ON once the character leaves.
 */
export async function setClickThrough(enabled: boolean): Promise<void> {
  if (!isTauri()) return;

  const { invoke } = await import('@tauri-apps/api/core');
  await invoke('set_click_through', { enabled });
}

/**
 * Open a URL in the user's default browser via the opener plugin.
 *
 * The URL is validated first: it originates from untrusted calendar data, so
 * only http(s) links are ever handed to the OS.
 */
export async function openExternal(url: string): Promise<void> {
  const safe = safeExternalUrl(url);
  if (safe === null) {
    console.warn('Refusing to open untrusted or malformed URL:', url);
    return;
  }

  if (!isTauri()) {
    window.open(safe, '_blank', 'noopener,noreferrer');
    return;
  }

  const { openUrl } = await import('@tauri-apps/plugin-opener');
  await openUrl(safe);
}

/** Hide the overlay window (Tauri only; a no-op in the browser). */
export async function hideOverlay(): Promise<void> {
  if (!isTauri()) return;

  const { getCurrentWindow } = await import('@tauri-apps/api/window');
  await getCurrentWindow().hide();
}

/** Show and raise the overlay window (Tauri only; a no-op in the browser). */
export async function showOverlay(): Promise<void> {
  if (!isTauri()) return;

  const { getCurrentWindow } = await import('@tauri-apps/api/window');
  const win = getCurrentWindow();
  await win.show();
  await win.setFocus();
}

/**
 * Subscribe to the tray's auth menu event. The single item toggles between
 * sign-in and sign-out; the frontend decides which based on current state. A
 * no-op in the browser, where there is no tray.
 */
export async function onAuthToggleRequested(handler: () => void): Promise<void> {
  if (!isTauri()) return;

  const { listen } = await import('@tauri-apps/api/event');
  await listen('google-auth-toggle', () => {
    handler();
  });
}

/**
 * Update the tray auth item's label so it reflects the current sign-in state
 * (e.g. flips to "Sign out" after a successful sign-in). A no-op in the browser.
 */
export async function setAuthMenuLabel(label: string): Promise<void> {
  if (!isTauri()) return;

  const { invoke } = await import('@tauri-apps/api/core');
  await invoke('set_auth_menu_label', { label });
}

/**
 * Surface an error to the user with a native dialog.
 *
 * Sign-in is triggered from the tray while the overlay window is hidden, so a
 * `console.error` (or a webview `alert()` from a hidden window) is useless — the
 * user never sees it. The Tauri dialog plugin shows a real OS message box that
 * does not depend on any window being visible. In a plain browser we fall back
 * to `alert()` so `npm run dev` still surfaces failures.
 */
export async function showError(title: string, detail: string): Promise<void> {
  if (!isTauri()) {
    if (typeof window !== 'undefined') {
      window.alert(`${title}\n\n${detail}`);
    }
    return;
  }

  const { message } = await import('@tauri-apps/plugin-dialog');
  await message(detail, { title, kind: 'error' });
}
