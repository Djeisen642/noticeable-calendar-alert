/**
 * Pure helpers for the system-tray menu.
 *
 * The tray exposes a single auth item that toggles between signing in and
 * signing out. Keeping the label/action mapping here (rather than in the Tauri
 * bridge or Rust) makes it trivially testable and the single source of truth.
 */

/** Label shown when the user is signed out — clicking it starts sign-in. */
export const SIGN_IN_LABEL = 'Sign in with Google';
/** Label shown when the user is signed in — clicking it signs out. */
export const SIGN_OUT_LABEL = 'Sign out';

/** The auth menu item's label for the given sign-in state. */
export function authMenuLabel(signedIn: boolean): string {
  return signedIn ? SIGN_OUT_LABEL : SIGN_IN_LABEL;
}

/**
 * The action the auth menu item should perform when clicked, given the current
 * sign-in state: when signed in, clicking signs out; otherwise it signs in.
 */
export function authToggleAction(signedIn: boolean): 'signIn' | 'signOut' {
  return signedIn ? 'signOut' : 'signIn';
}
