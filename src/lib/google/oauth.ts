/**
 * Pure builders for the Google OAuth 2.0 endpoints. No I/O lives here — these
 * just construct URLs/bodies and reason about token expiry, so they are fully
 * unit-testable.
 */

import type { OAuthToken } from '../calendar.ts';

export interface GoogleOAuthConfig {
  readonly clientId: string;
  /**
   * Google "Desktop app" client secret. Per Google's docs this is NOT treated
   * as confidential for installed apps; PKCE provides the real protection.
   */
  readonly clientSecret: string;
  /** Loopback redirect, e.g. `http://127.0.0.1:1421`. */
  readonly redirectUri: string;
  readonly scopes: readonly string[];
}

/** Raw token payload as returned by Google's token endpoint. */
export interface GoogleTokenResponse {
  readonly access_token: string;
  readonly expires_in: number;
  readonly refresh_token?: string;
  readonly scope: string;
  readonly token_type: string;
}

export const AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
export const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
/** Read-only access to calendar events is all this app ever needs. */
export const CALENDAR_READONLY_SCOPE = 'https://www.googleapis.com/auth/calendar.events.readonly';

/** Build the consent-screen URL the user is sent to. */
export function buildAuthUrl(
  cfg: GoogleOAuthConfig,
  params: { codeChallenge: string; state: string },
): string {
  const query = new URLSearchParams({
    client_id: cfg.clientId,
    redirect_uri: cfg.redirectUri,
    response_type: 'code',
    scope: cfg.scopes.join(' '),
    code_challenge: params.codeChallenge,
    code_challenge_method: 'S256',
    state: params.state,
    access_type: 'offline', // ask for a refresh token
    prompt: 'consent',
  });
  return `${AUTH_ENDPOINT}?${query.toString()}`;
}

/** Body for exchanging an authorization `code` for tokens. */
export function buildCodeExchangeBody(
  cfg: GoogleOAuthConfig,
  params: { code: string; codeVerifier: string },
): URLSearchParams {
  return new URLSearchParams({
    client_id: cfg.clientId,
    client_secret: cfg.clientSecret,
    code: params.code,
    code_verifier: params.codeVerifier,
    grant_type: 'authorization_code',
    redirect_uri: cfg.redirectUri,
  });
}

/** Body for refreshing an access token with a refresh token. */
export function buildRefreshBody(cfg: GoogleOAuthConfig, refreshToken: string): URLSearchParams {
  return new URLSearchParams({
    client_id: cfg.clientId,
    client_secret: cfg.clientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  });
}

/**
 * Normalize a token response into our `OAuthToken`. Google omits
 * `refresh_token` on refresh responses, so the previous one is carried over.
 */
export function tokenFromResponse(
  res: GoogleTokenResponse,
  previousRefreshToken: string | undefined,
  now: Date,
): OAuthToken {
  const refreshToken = res.refresh_token ?? previousRefreshToken;
  if (!refreshToken) {
    throw new Error('No refresh_token returned and none was previously stored');
  }
  return {
    accessToken: res.access_token,
    refreshToken,
    expiresAt: new Date(now.getTime() + res.expires_in * 1_000),
    scope: res.scope,
  };
}

/**
 * Whether a token should be considered expired. A skew window means we refresh
 * slightly early rather than racing the exact expiry instant.
 */
export function isTokenExpired(expiresAt: Date, now: Date, skewMs = 60_000): boolean {
  return expiresAt.getTime() - skewMs <= now.getTime();
}
