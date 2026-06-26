/**
 * PKCE (RFC 7636) helpers for the OAuth 2.0 authorization-code flow.
 *
 * Uses the Web Crypto API, which is available both in the browser/webview and
 * in Node 20+ (so these are unit-testable against the RFC test vector).
 */

// Unreserved characters allowed in a PKCE `code_verifier` (RFC 7636 §4.1).
const VERIFIER_CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';

/** Generate a high-entropy `code_verifier` of the given length (43–128). */
export function generateCodeVerifier(length = 64): string {
  if (length < 43 || length > 128) {
    throw new RangeError('PKCE code_verifier length must be between 43 and 128');
  }
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);

  let verifier = '';
  for (const byte of bytes) {
    verifier += VERIFIER_CHARSET[byte % VERIFIER_CHARSET.length];
  }
  return verifier;
}

/** Base64url-encode raw bytes (no padding), per RFC 7636 §A. */
function base64UrlEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Derive the S256 `code_challenge` for a verifier: base64url(sha256(verifier)). */
export async function codeChallengeS256(verifier: string): Promise<string> {
  const data = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return base64UrlEncode(digest);
}

/** Generate an opaque `state` value for CSRF protection on the redirect. */
export function generateState(byteLength = 16): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return base64UrlEncode(bytes.buffer);
}
