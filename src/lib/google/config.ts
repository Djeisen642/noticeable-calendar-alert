/**
 * Calendar-sync factory: pick the real Google implementation when running in
 * the desktop app with credentials configured, otherwise fall back to the
 * deterministic mock (browser dev, or no `.env`).
 */

import { MockCalendarSync, type CalendarSync } from '../calendar.ts';
import { isTauri } from '../tauri.ts';
import { GoogleCalendarSync } from './google-calendar.ts';
import { CALENDAR_READONLY_SCOPE, type GoogleOAuthConfig } from './oauth.ts';
import { KeychainTokenStore, LoopbackAuthorizer, TauriHttpClient } from './adapters.ts';

// Vite types custom env vars loosely; read them through a narrow view.
const env = import.meta.env as Record<string, string | undefined>;

const DEFAULT_REDIRECT_PORT = 1421;

/** Build the OAuth config from `VITE_GOOGLE_*` env vars, or `null` if unset. */
export function googleConfigFromEnv(): GoogleOAuthConfig | null {
  const clientId = env.VITE_GOOGLE_CLIENT_ID;
  const clientSecret = env.VITE_GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return null;
  }
  const port = Number(env.VITE_OAUTH_REDIRECT_PORT ?? DEFAULT_REDIRECT_PORT);
  return {
    clientId,
    clientSecret,
    redirectUri: `http://127.0.0.1:${String(port)}`,
    scopes: [CALENDAR_READONLY_SCOPE],
  };
}

/** Construct the appropriate `CalendarSync` for the current environment. */
export function createCalendarSync(): CalendarSync {
  const cfg = googleConfigFromEnv();
  if (isTauri() && cfg !== null) {
    return new GoogleCalendarSync(
      cfg,
      new TauriHttpClient(),
      new KeychainTokenStore(),
      new LoopbackAuthorizer(),
    );
  }
  return new MockCalendarSync();
}
