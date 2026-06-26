import { describe, it, expect } from 'vitest';
import {
  buildAuthUrl,
  buildCodeExchangeBody,
  buildRefreshBody,
  isTokenExpired,
  tokenFromResponse,
  CALENDAR_READONLY_SCOPE,
  type GoogleOAuthConfig,
  type GoogleTokenResponse,
} from './oauth.ts';

const cfg: GoogleOAuthConfig = {
  clientId: 'client-123.apps.googleusercontent.com',
  clientSecret: 'secret-xyz',
  redirectUri: 'http://127.0.0.1:1421',
  scopes: [CALENDAR_READONLY_SCOPE],
};

describe('buildAuthUrl', () => {
  it('encodes all required PKCE + offline params', () => {
    const url = new URL(buildAuthUrl(cfg, { codeChallenge: 'CHAL', state: 'STATE' }));
    const p = url.searchParams;

    expect(url.origin + url.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth');
    expect(p.get('client_id')).toBe(cfg.clientId);
    expect(p.get('redirect_uri')).toBe(cfg.redirectUri);
    expect(p.get('response_type')).toBe('code');
    expect(p.get('scope')).toBe(CALENDAR_READONLY_SCOPE);
    expect(p.get('code_challenge')).toBe('CHAL');
    expect(p.get('code_challenge_method')).toBe('S256');
    expect(p.get('state')).toBe('STATE');
    expect(p.get('access_type')).toBe('offline');
    expect(p.get('prompt')).toBe('consent');
  });
});

describe('token request bodies', () => {
  it('builds the authorization-code exchange body', () => {
    const body = buildCodeExchangeBody(cfg, { code: 'CODE', codeVerifier: 'VERIFIER' });
    expect(body.get('grant_type')).toBe('authorization_code');
    expect(body.get('code')).toBe('CODE');
    expect(body.get('code_verifier')).toBe('VERIFIER');
    expect(body.get('client_id')).toBe(cfg.clientId);
    expect(body.get('client_secret')).toBe(cfg.clientSecret);
    expect(body.get('redirect_uri')).toBe(cfg.redirectUri);
  });

  it('builds the refresh body', () => {
    const body = buildRefreshBody(cfg, 'REFRESH');
    expect(body.get('grant_type')).toBe('refresh_token');
    expect(body.get('refresh_token')).toBe('REFRESH');
    expect(body.get('client_id')).toBe(cfg.clientId);
  });
});

describe('tokenFromResponse', () => {
  const now = new Date('2026-06-26T09:00:00.000Z');
  const base: GoogleTokenResponse = {
    access_token: 'AT',
    expires_in: 3600,
    refresh_token: 'RT',
    scope: CALENDAR_READONLY_SCOPE,
    token_type: 'Bearer',
  };

  it('computes the absolute expiry from expires_in', () => {
    const token = tokenFromResponse(base, undefined, now);
    expect(token.accessToken).toBe('AT');
    expect(token.refreshToken).toBe('RT');
    expect(token.expiresAt.toISOString()).toBe('2026-06-26T10:00:00.000Z');
  });

  it('carries over the previous refresh token when the response omits it', () => {
    const { refresh_token: _omit, ...withoutRefresh } = base;
    const token = tokenFromResponse(withoutRefresh, 'PREVIOUS', now);
    expect(token.refreshToken).toBe('PREVIOUS');
  });

  it('throws when no refresh token is available at all', () => {
    const { refresh_token: _omit, ...withoutRefresh } = base;
    expect(() => tokenFromResponse(withoutRefresh, undefined, now)).toThrow(/refresh_token/);
  });
});

describe('isTokenExpired', () => {
  const now = new Date('2026-06-26T09:00:00.000Z');

  it('is false well before expiry', () => {
    expect(isTokenExpired(new Date(now.getTime() + 10 * 60_000), now)).toBe(false);
  });

  it('is true within the skew window (refresh early)', () => {
    expect(isTokenExpired(new Date(now.getTime() + 30_000), now, 60_000)).toBe(true);
  });

  it('is true once past expiry', () => {
    expect(isTokenExpired(new Date(now.getTime() - 1_000), now)).toBe(true);
  });
});
