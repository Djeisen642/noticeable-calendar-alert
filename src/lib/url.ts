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
 * Registrable domains we trust to host a meeting "Join" link. A calendar event
 * is attacker-controlled (anyone who can invite you sets `conferenceData`), so
 * scheme validation alone is not enough — an `https://evil.example/login` link
 * behind a focus-stealing "Join Call" button is a one-click phishing primitive.
 * We only let the button point at a known conferencing provider.
 *
 * Match is exact-host or any subdomain of these (e.g. `us02web.zoom.us`).
 */
const ALLOWED_JOIN_DOMAINS = [
  'meet.google.com',
  'zoom.us',
  'teams.microsoft.com',
  'teams.live.com',
  'webex.com',
  'whereby.com',
  'meet.jit.si',
  'gotomeeting.com',
  'bluejeans.com',
  'chime.aws',
] as const;

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

/** Whether `host` equals `domain` or is a subdomain of it (no suffix-spoofing). */
function hostMatches(host: string, domain: string): boolean {
  return host === domain || host.endsWith(`.${domain}`);
}

/**
 * Validate an untrusted *meeting join* URL. Stricter than `safeExternalUrl`:
 * on top of the http(s) scheme check, the host must belong to a known
 * conferencing provider. Use this for any link sourced from calendar data.
 *
 * @returns the normalized href, or `null` if the scheme or host is not allowed.
 */
export function safeJoinUrl(url: string | null | undefined): string | null {
  const safe = safeExternalUrl(url);
  if (safe === null) {
    return null;
  }
  const { hostname } = new URL(safe);
  return ALLOWED_JOIN_DOMAINS.some((domain) => hostMatches(hostname, domain)) ? safe : null;
}
