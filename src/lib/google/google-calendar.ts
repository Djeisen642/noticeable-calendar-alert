/**
 * Real Google Calendar implementation of `CalendarSync`.
 *
 * All logic lives here and in the pure helpers (`pkce`, `oauth`, `events`);
 * every side effect is delegated to an injected port, so the whole flow is
 * exercised in tests with in-memory fakes.
 */

import type { CalendarEvent, CalendarSync, OAuthToken } from '../calendar.ts';
import { generateCodeVerifier, codeChallengeS256, generateState } from './pkce.ts';
import {
  buildAuthUrl,
  buildCodeExchangeBody,
  buildRefreshBody,
  isTokenExpired,
  tokenFromResponse,
  TOKEN_ENDPOINT,
  type GoogleOAuthConfig,
  type GoogleTokenResponse,
} from './oauth.ts';
import { buildEventsListUrl, parseEventsResponse } from './events.ts';
import type { Authorizer, HttpClient, TokenStore } from './ports.ts';

export class GoogleCalendarSync implements CalendarSync {
  constructor(
    private readonly cfg: GoogleOAuthConfig,
    private readonly http: HttpClient,
    private readonly store: TokenStore,
    private readonly authorizer: Authorizer,
  ) {}

  /** Run the interactive PKCE consent flow and persist the resulting token. */
  async authenticate(): Promise<OAuthToken> {
    const verifier = generateCodeVerifier();
    const challenge = await codeChallengeS256(verifier);
    const state = generateState();

    const authUrl = buildAuthUrl(this.cfg, { codeChallenge: challenge, state });
    const result = await this.authorizer.authorize(authUrl, this.cfg.redirectUri);
    if (result.state !== state) {
      throw new Error('OAuth state mismatch — possible CSRF, aborting');
    }

    const res = await this.http.postForm(
      TOKEN_ENDPOINT,
      buildCodeExchangeBody(this.cfg, { code: result.code, codeVerifier: verifier }),
    );
    if (res.status !== 200) {
      throw new Error(`Token exchange failed (HTTP ${String(res.status)})`);
    }

    const token = tokenFromResponse(
      (await res.json()) as GoogleTokenResponse,
      undefined,
      new Date(),
    );
    await this.store.save(token);
    return token;
  }

  /** Exchange a refresh token for a fresh access token and persist it. */
  async refresh(token: OAuthToken): Promise<OAuthToken> {
    const res = await this.http.postForm(
      TOKEN_ENDPOINT,
      buildRefreshBody(this.cfg, token.refreshToken),
    );
    if (res.status !== 200) {
      // A 400 (invalid_grant) or 401 means the refresh token is dead — revoked,
      // expired, or the consent was withdrawn. Drop it so the app stops hammering
      // a stale credential every poll and can prompt a fresh sign-in instead.
      if (res.status === 400 || res.status === 401) {
        await this.store.clear();
      }
      throw new Error(`Token refresh failed (HTTP ${String(res.status)})`);
    }

    const next = tokenFromResponse(
      (await res.json()) as GoogleTokenResponse,
      token.refreshToken,
      new Date(),
    );
    await this.store.save(next);
    return next;
  }

  /**
   * Events starting within `withinMs`, soonest first. Returns `[]` when not yet
   * signed in (rather than forcing interactive auth on the polling cadence).
   */
  async getUpcomingEvents(withinMs: number): Promise<CalendarEvent[]> {
    const token = await this.validAccessToken();
    if (token === null) {
      return [];
    }

    const now = new Date();
    const res = await this.http.getJson(buildEventsListUrl(now, withinMs), {
      Authorization: `Bearer ${token.accessToken}`,
    });

    if (res.status === 401) {
      // Token rejected even after refresh — drop it so the user re-authenticates.
      await this.store.clear();
      return [];
    }
    if (res.status !== 200) {
      throw new Error(`events.list failed (HTTP ${String(res.status)})`);
    }

    return parseEventsResponse(await res.json());
  }

  /** Load the stored token, refreshing it if it has expired. */
  private async validAccessToken(): Promise<OAuthToken | null> {
    const token = await this.store.load();
    if (token === null) {
      return null;
    }
    if (!isTokenExpired(token.expiresAt, new Date())) {
      return token;
    }
    return this.refresh(token);
  }
}
