/**
 * Pure helpers for the system-tray menu.
 *
 * The tray exposes a single auth item that toggles between signing in and
 * signing out, plus two disabled status lines. Keeping the label/status text
 * here (rather than in the Tauri bridge or Rust) makes it trivially testable
 * and the single source of truth.
 */

import { getCountdownDelta, formatCountdown } from './countdown.ts';
import { MS_PER_MINUTE, MS_PER_HOUR } from './time.ts';

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

/** Longest meeting title to show in the tray before truncating with an ellipsis. */
const MAX_TITLE_LENGTH = 32;

/** The outcome of the most recent calendar fetch, for the sync-health line. */
export interface SyncState {
  readonly ok: boolean;
  readonly at: Date;
}

/** Everything the two status lines are derived from. All times explicit. */
export interface TrayStatusInput {
  readonly signedIn: boolean;
  /** `null` until the first fetch completes. */
  readonly lastSync: SyncState | null;
  /** The soonest upcoming meeting, or `null` if none is cached. */
  readonly next: { readonly title: string; readonly start: Date } | null;
  readonly now: Date;
}

/** The two disabled lines shown at the top of the tray menu. */
export interface TrayStatus {
  readonly connection: string;
  readonly meeting: string;
}

/** Human-readable "how long ago", coarse enough for a status line. */
function formatAgo(elapsedMs: number): string {
  if (elapsedMs < MS_PER_MINUTE) {
    return 'just now';
  }
  if (elapsedMs < MS_PER_HOUR) {
    return `${String(Math.floor(elapsedMs / MS_PER_MINUTE))}m ago`;
  }
  return `${String(Math.floor(elapsedMs / MS_PER_HOUR))}h ago`;
}

/** Clip a meeting title so a long subject can't blow out the menu width. */
function truncateTitle(title: string): string {
  return title.length <= MAX_TITLE_LENGTH ? title : `${title.slice(0, MAX_TITLE_LENGTH - 1)}…`;
}

/**
 * Derive the two tray status lines: a connection/sync-health line and a
 * next-meeting line. Pure and deterministic given an explicit `now`.
 */
export function formatTrayStatus(input: TrayStatusInput): TrayStatus {
  if (!input.signedIn) {
    return { connection: 'Not signed in', meeting: 'Sign in to see meetings' };
  }

  let connection: string;
  if (input.lastSync === null) {
    connection = 'Signed in · syncing…';
  } else if (input.lastSync.ok) {
    connection = `Signed in · synced ${formatAgo(input.now.getTime() - input.lastSync.at.getTime())}`;
  } else {
    connection = 'Signed in · sync error';
  }

  let meeting: string;
  if (input.next === null) {
    meeting = 'No upcoming meetings';
  } else {
    const delta = getCountdownDelta(input.next.start, input.now);
    meeting = `Next: ${truncateTitle(input.next.title)} ${formatCountdown(delta)}`;
  }

  return { connection, meeting };
}
