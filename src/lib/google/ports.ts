/**
 * Ports: the small I/O surface `GoogleCalendarSync` depends on. Real
 * implementations are thin Tauri adapters (no-CORS HTTP, loopback redirect
 * capture, OS-keychain storage); tests supply in-memory fakes. Keeping these
 * abstract is what makes the OAuth logic unit-testable.
 */

import type { OAuthToken } from '../calendar.ts';

export interface HttpResponse {
  readonly status: number;
  json(): Promise<unknown>;
}

export interface HttpClient {
  /** POST an `application/x-www-form-urlencoded` body (token endpoints). */
  postForm(url: string, body: URLSearchParams): Promise<HttpResponse>;
  /** GET JSON with the given headers (the Calendar API). */
  getJson(url: string, headers: Record<string, string>): Promise<HttpResponse>;
}

/** Persists the OAuth token bundle (ideally in the OS keychain). */
export interface TokenStore {
  load(): Promise<OAuthToken | null>;
  save(token: OAuthToken): Promise<void>;
  clear(): Promise<void>;
}

/**
 * Drives the interactive consent step: open the system browser to `authUrl`,
 * run a loopback listener on the redirect, and return the captured params.
 */
export interface Authorizer {
  authorize(authUrl: string, redirectUri: string): Promise<{ code: string; state: string }>;
}
