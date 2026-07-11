/**
 * Calendar-sync factory: pick the real Google implementation when running in
 * the desktop app with credentials configured. In a plain browser (`npm run
 * dev`) fall back to the deterministic mock. In the desktop app WITHOUT
 * credentials, return a sync whose sign-in fails loudly with setup
 * instructions — silently substituting the mock there made "Sign in with
 * Google" appear to succeed instantly (no consent screen) while never syncing
 * the real calendar, which reads as a broken sign-in, not a demo.
 */

import {
  MockCalendarSync,
  type CalendarEvent,
  type CalendarSync,
  type OAuthToken,
} from '../calendar.ts';
import { isTauri } from '../tauri.ts';
import { GoogleCalendarSync } from './google-calendar.ts';
import { CALENDAR_READONLY_SCOPE, type GoogleOAuthConfig } from './oauth.ts';
import { KeychainTokenStore, LoopbackAuthorizer, TauriHttpClient } from './adapters.ts';

// Vite types custom env vars loosely; read them through a narrow view.
const env = import.meta.env as Record<string, string | undefined>;

const DEFAULT_REDIRECT_PORT = 1421;

/** Actionable guidance surfaced when sign-in is attempted without credentials. */
export const UNCONFIGURED_MESSAGE =
  'Google Calendar credentials are not configured in this build. ' +
  'Copy .env.example to .env, set VITE_GOOGLE_CLIENT_ID and VITE_GOOGLE_CLIENT_SECRET, ' +
  'then rebuild and relaunch the app.';

/** Parse the loopback port, falling back to the default on anything invalid. */
function redirectPort(raw: string | undefined): number {
  const port = Number(raw);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    return DEFAULT_REDIRECT_PORT;
  }
  return port;
}

/** Build the OAuth config from `VITE_GOOGLE_*` env vars, or `null` if unset. */
export function googleConfigFromEnv(
  source: Record<string, string | undefined> = env,
): GoogleOAuthConfig | null {
  // Trim so an invisible stray space in .env can't produce a client id that
  // Google rejects (or, worse, a "configured" check that passes on whitespace).
  const clientId = source.VITE_GOOGLE_CLIENT_ID?.trim();
  const clientSecret = source.VITE_GOOGLE_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    return null;
  }
  const port = redirectPort(source.VITE_OAUTH_REDIRECT_PORT?.trim());
  return {
    clientId,
    clientSecret,
    redirectUri: `http://127.0.0.1:${String(port)}`,
    scopes: [CALENDAR_READONLY_SCOPE],
  };
}

/**
 * Desktop-app stand-in when `VITE_GOOGLE_*` is missing: reports signed-out and
 * rejects sign-in with setup instructions, so the tray flow surfaces a real
 * error dialog instead of a convincing fake success.
 */
export class UnconfiguredCalendarSync implements CalendarSync {
  authenticate(): Promise<OAuthToken> {
    return Promise.reject(new Error(UNCONFIGURED_MESSAGE));
  }

  refresh(_token: OAuthToken): Promise<OAuthToken> {
    return Promise.reject(new Error(UNCONFIGURED_MESSAGE));
  }

  signOut(): Promise<void> {
    return Promise.resolve();
  }

  isSignedIn(): Promise<boolean> {
    return Promise.resolve(false);
  }

  getUpcomingEvents(_withinMs: number): Promise<CalendarEvent[]> {
    return Promise.resolve([]);
  }
}

/**
 * Construct the appropriate `CalendarSync` for the current environment. The
 * parameters exist for tests; production callers use the defaults.
 */
export function createCalendarSync(
  cfg: GoogleOAuthConfig | null = googleConfigFromEnv(),
  inTauri: boolean = isTauri(),
): CalendarSync {
  if (!inTauri) {
    // Browser dev loop: no native adapters exist, so demo with the mock.
    return new MockCalendarSync();
  }
  if (cfg === null) {
    return new UnconfiguredCalendarSync();
  }
  return new GoogleCalendarSync(
    cfg,
    new TauriHttpClient(),
    new KeychainTokenStore(),
    new LoopbackAuthorizer(),
  );
}
