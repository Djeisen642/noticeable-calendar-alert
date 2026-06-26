/**
 * PKCE (RFC 7636) helpers for the OAuth 2.0 authorization-code flow.
 *
 * Uses the Web Crypto API, which is available both in the browser/webview and
 * in Node 20+ (so these are unit-testable against the RFC test vector).
 */

// Unreserved characters allowed in a PKCE `code_verifier` (RFC 7636 §4.1).
const VERIFIER_CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';

// Largest multiple of the charset size that fits in a byte. Random bytes at or
// above this are rejected so that `byte % charset` is uniform (no modulo bias).
const VERIFIER_REJECT_AT = 256 - (256 % VERIFIER_CHARSET.length);

/** Generate a high-entropy `code_verifier` of the given length (43–128). */
export function generateCodeVerifier(length = 64): string {
  if (length < 43 || length > 128) {
    throw new RangeError('PKCE code_verifier length must be between 43 and 128');
  }

  let verifier = '';
  // Draw a small batch at a time and rejection-sample to keep the distribution
  // uniform across the 66-char set; refill if we reject our way to the end.
  while (verifier.length < length) {
    const batch = new Uint8Array(length - verifier.length);
    crypto.getRandomValues(batch);
    for (const byte of batch) {
      if (byte >= VERIFIER_REJECT_AT) continue;
      verifier += VERIFIER_CHARSET[byte % VERIFIER_CHARSET.length];
      if (verifier.length === length) break;
    }
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
