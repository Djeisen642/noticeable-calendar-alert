/**
 * Tauri adapters that satisfy the OAuth ports with real native I/O.
 *
 * REVIEWED-BUT-UNRUN: these depend on the desktop runtime (the HTTP plugin, the
 * loopback `oauth_capture` command, and the keychain `token_*` commands). They
 * are typechecked here but the live OAuth round-trip must be verified on a real
 * machine. Each method dynamic-imports the Tauri APIs so this module never
 * breaks a plain-browser `npm run dev`.
 */

import type { OAuthToken } from '../calendar.ts';
import type { Authorizer, HttpClient, HttpResponse, TokenStore } from './ports.ts';
import { openExternal } from '../tauri.ts';

/** Invoke a Rust command, dynamic-importing the Tauri core lazily. */
async function invokeCommand<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<T>(command, args);
}

/** HTTP via `@tauri-apps/plugin-http`, which proxies through Rust (no CORS). */
export class TauriHttpClient implements HttpClient {
  async postForm(url: string, body: URLSearchParams): Promise<HttpResponse> {
    const { fetch } = await import('@tauri-apps/plugin-http');
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
    return toHttpResponse(res);
  }

  async getJson(url: string, headers: Record<string, string>): Promise<HttpResponse> {
    const { fetch } = await import('@tauri-apps/plugin-http');
    const res = await fetch(url, { method: 'GET', headers });
    return toHttpResponse(res);
  }
}

function toHttpResponse(res: Response): HttpResponse {
  return {
    status: res.status,
    json: async (): Promise<unknown> => {
      const data: unknown = await res.json();
      return data;
    },
  };
}

/** Wire format for the token bundle persisted in the keychain (Date → ISO). */
interface StoredToken {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  scope: string;
}

/** Persists the token in the OS keychain via Rust `token_*` commands. */
export class KeychainTokenStore implements TokenStore {
  async load(): Promise<OAuthToken | null> {
    const raw = await invokeCommand<string | null>('token_load');
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as StoredToken;
    return { ...parsed, expiresAt: new Date(parsed.expiresAt) };
  }

  async save(token: OAuthToken): Promise<void> {
    const payload: StoredToken = { ...token, expiresAt: token.expiresAt.toISOString() };
    await invokeCommand('token_save', { value: JSON.stringify(payload) });
  }

  async clear(): Promise<void> {
    await invokeCommand('token_clear');
  }
}

/**
 * Opens the system browser to the consent screen and captures the loopback
 * redirect via the Rust `oauth_capture` command. The listener is started
 * *before* the browser opens so the redirect can't be missed.
 */
export class LoopbackAuthorizer implements Authorizer {
  async authorize(authUrl: string, redirectUri: string): Promise<{ code: string; state: string }> {
    const port = Number(new URL(redirectUri).port);

    // Start the loopback listener BEFORE opening the browser so the redirect
    // can't arrive before we're listening.
    const capturePromise = invokeCommand<{ code: string; state: string }>('oauth_capture', {
      port,
    });
    await openExternal(authUrl);
    return capturePromise;
  }
}
