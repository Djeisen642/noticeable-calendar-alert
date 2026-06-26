import { describe, it, expect, beforeEach } from 'vitest';
import { GoogleCalendarSync } from './google-calendar.ts';
import { CALENDAR_READONLY_SCOPE, type GoogleOAuthConfig } from './oauth.ts';
import type { Authorizer, HttpClient, HttpResponse, TokenStore } from './ports.ts';
import type { OAuthToken } from '../calendar.ts';

const cfg: GoogleOAuthConfig = {
  clientId: 'cid',
  clientSecret: 'secret',
  redirectUri: 'http://127.0.0.1:1421',
  scopes: [CALENDAR_READONLY_SCOPE],
};

const jsonResponse = (status: number, body: unknown): HttpResponse => ({
  status,
  json: () => Promise.resolve(body),
});

/** Records form POSTs and returns queued responses; serves GETs from a handler. */
class FakeHttp implements HttpClient {
  postForms: { url: string; body: URLSearchParams }[] = [];
  private postQueue: HttpResponse[] = [];
  getHandler: (url: string, headers: Record<string, string>) => HttpResponse = () =>
    jsonResponse(200, { items: [] });

  queuePost(res: HttpResponse): void {
    this.postQueue.push(res);
  }
  postForm(url: string, body: URLSearchParams): Promise<HttpResponse> {
    this.postForms.push({ url, body });
    return Promise.resolve(this.postQueue.shift() ?? jsonResponse(200, {}));
  }
  getJson(url: string, headers: Record<string, string>): Promise<HttpResponse> {
    return Promise.resolve(this.getHandler(url, headers));
  }
}

class MemoryStore implements TokenStore {
  token: OAuthToken | null = null;
  load(): Promise<OAuthToken | null> {
    return Promise.resolve(this.token);
  }
  save(token: OAuthToken): Promise<void> {
    this.token = token;
    return Promise.resolve();
  }
  clear(): Promise<void> {
    this.token = null;
    return Promise.resolve();
  }
}

class FakeAuthorizer implements Authorizer {
  result: { code: string; state: string } | null = null;
  capturedAuthUrl = '';
  authorize(authUrl: string): Promise<{ code: string; state: string }> {
    this.capturedAuthUrl = authUrl;
    // Echo the real state back unless a test overrides it.
    const state = this.result?.state ?? new URL(authUrl).searchParams.get('state') ?? '';
    return Promise.resolve({ code: this.result?.code ?? 'AUTH_CODE', state });
  }
}

let http: FakeHttp;
let store: MemoryStore;
let authorizer: FakeAuthorizer;
let sync: GoogleCalendarSync;

beforeEach(() => {
  http = new FakeHttp();
  store = new MemoryStore();
  authorizer = new FakeAuthorizer();
  sync = new GoogleCalendarSync(cfg, http, store, authorizer);
});

const tokenBody = (overrides: Record<string, unknown> = {}): unknown => ({
  access_token: 'AT',
  expires_in: 3600,
  refresh_token: 'RT',
  scope: CALENDAR_READONLY_SCOPE,
  token_type: 'Bearer',
  ...overrides,
});

describe('authenticate', () => {
  it('exchanges the code and persists the token', async () => {
    http.queuePost(jsonResponse(200, tokenBody()));

    const token = await sync.authenticate();

    expect(token.accessToken).toBe('AT');
    expect(store.token?.refreshToken).toBe('RT');
    const exchange = http.postForms[0];
    expect(exchange?.body.get('grant_type')).toBe('authorization_code');
    expect(exchange?.body.get('code')).toBe('AUTH_CODE');
    // PKCE verifier must accompany the exchange.
    expect(exchange?.body.get('code_verifier')).toBeTruthy();
  });

  it('rejects a mismatched state (CSRF guard)', async () => {
    authorizer.result = { code: 'AUTH_CODE', state: 'WRONG' };
    await expect(sync.authenticate()).rejects.toThrow(/state mismatch/);
    expect(http.postForms).toHaveLength(0);
  });

  it('throws when the token exchange returns non-200', async () => {
    http.queuePost(jsonResponse(400, { error: 'invalid_grant' }));
    await expect(sync.authenticate()).rejects.toThrow(/HTTP 400/);
  });
});

describe('getUpcomingEvents', () => {
  it('returns [] when not signed in (no forced consent)', async () => {
    expect(await sync.getUpcomingEvents(300_000)).toEqual([]);
  });

  it('fetches with a bearer token and parses events', async () => {
    store.token = {
      accessToken: 'AT',
      refreshToken: 'RT',
      expiresAt: new Date(Date.now() + 3_600_000),
      scope: CALENDAR_READONLY_SCOPE,
    };
    let seenAuth = '';
    http.getHandler = (_url, headers) => {
      seenAuth = headers.Authorization ?? '';
      return jsonResponse(200, {
        items: [{ id: 'e1', summary: 'Demo', start: { dateTime: '2026-06-26T09:05:00Z' } }],
      });
    };

    const events = await sync.getUpcomingEvents(300_000);

    expect(seenAuth).toBe('Bearer AT');
    expect(events.map((e) => e.id)).toEqual(['e1']);
  });

  it('refreshes an expired access token before fetching', async () => {
    store.token = {
      accessToken: 'OLD',
      refreshToken: 'RT',
      expiresAt: new Date(Date.now() - 1_000), // expired
      scope: CALENDAR_READONLY_SCOPE,
    };
    http.queuePost(jsonResponse(200, tokenBody({ access_token: 'NEW' })));
    let seenAuth = '';
    http.getHandler = (_url, headers) => {
      seenAuth = headers.Authorization ?? '';
      return jsonResponse(200, { items: [] });
    };

    await sync.getUpcomingEvents(300_000);

    expect(http.postForms[0]?.body.get('grant_type')).toBe('refresh_token');
    expect(seenAuth).toBe('Bearer NEW');
    expect(store.token?.accessToken).toBe('NEW');
  });

  it('clears the stored token when refresh fails with invalid_grant (400)', async () => {
    store.token = {
      accessToken: 'OLD',
      refreshToken: 'REVOKED',
      expiresAt: new Date(Date.now() - 1_000), // expired → forces a refresh
      scope: CALENDAR_READONLY_SCOPE,
    };
    http.queuePost(jsonResponse(400, { error: 'invalid_grant' }));

    // A dead refresh token (400 invalid_grant) propagates as an error...
    await expect(sync.getUpcomingEvents(300_000)).rejects.toThrow(/HTTP 400/);
    // ...but the dead token is cleared, so the next poll won't retry it.
    expect(store.token).toBeNull();
  });

  it('clears the stored token and returns [] on a 401', async () => {
    store.token = {
      accessToken: 'AT',
      refreshToken: 'RT',
      expiresAt: new Date(Date.now() + 3_600_000),
      scope: CALENDAR_READONLY_SCOPE,
    };
    http.getHandler = () => jsonResponse(401, { error: 'invalid_credentials' });

    expect(await sync.getUpcomingEvents(300_000)).toEqual([]);
    expect(store.token).toBeNull();
  });
});
