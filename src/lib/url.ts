/**
 * URL safety helpers.
 *
 * Meeting "join" links come from calendar data, which is untrusted input. We
 * must never hand an arbitrary scheme to the OS opener — `file:`,
 * `javascript:`, or a custom protocol could launch a local app or worse. Only
 * well-formed http(s) URLs are allowed through.
 */

const ALLOWED_PROTOCOLS = new Set(['http:', 'https:']);

/**
 * Validate an untrusted URL.
 *
 * @returns the normalized href if it is a well-formed http(s) URL, otherwise
 *   `null`.
 */
export function safeExternalUrl(url: string | null | undefined): string | null {
  if (!url) {
    return null;
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  return ALLOWED_PROTOCOLS.has(parsed.protocol) ? parsed.href : null;
}
