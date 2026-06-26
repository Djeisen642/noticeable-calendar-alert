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
 * Subscribe to the tray's "Sign in with Google" menu event. A no-op in the
 * browser, where there is no tray.
 */
export async function onSignInRequested(handler: () => void): Promise<void> {
  if (!isTauri()) return;

  const { listen } = await import('@tauri-apps/api/event');
  await listen('google-signin', () => {
    handler();
  });
}

/** Subscribe to the tray's "Sign out" menu event. A no-op in the browser. */
export async function onSignOutRequested(handler: () => void): Promise<void> {
  if (!isTauri()) return;

  const { listen } = await import('@tauri-apps/api/event');
  await listen('google-signout', () => {
    handler();
  });
}
