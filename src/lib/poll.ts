/**
 * Adaptive calendar-poll cadence.
 *
 * Polling is the right model here: Google Calendar's push channel
 * (`events.watch`) delivers to a public HTTPS webhook, which a desktop app
 * behind NAT can't receive — so every desktop/mobile client polls. The cadence
 * needn't be constant, though. A fixed 30s poll means ~2,880 requests/day per
 * user and a network round-trip every 30s forever, including overnight and
 * weekends when the next meeting is hours away.
 *
 * Instead we scale the interval to how soon the next meeting is: a fast cadence
 * only while a meeting is near enough to matter, backing off to a slow idle
 * cadence the rest of the time. With a 5-minute alert lead, this still fires the
 * overlay on time while cutting idle polling by ~10x.
 *
 * (A further optimization — incremental sync via `syncToken` so each poll is
 * cheap — is orthogonal and left as a follow-up.)
 */

import { MS_PER_SECOND, MS_PER_MINUTE } from './time.ts';

/**
 * A meeting at or within this horizon uses the fast cadence. Set a bit above the
 * 5-minute alert lead so we're already polling quickly when it enters the lead
 * window (and pick up the *following* meeting promptly after it starts).
 */
export const POLL_NEAR_THRESHOLD_MS = 10 * MS_PER_MINUTE;
/** Within this horizon we poll at a medium cadence. */
export const POLL_SOON_THRESHOLD_MS = 60 * MS_PER_MINUTE;

/** Fast: a meeting is imminent (or in progress). */
export const POLL_NEAR_MS = 30 * MS_PER_SECOND;
/** Medium: a meeting is within the hour. */
export const POLL_SOON_MS = 2 * MS_PER_MINUTE;
/** Idle: nothing close, or signed out. */
export const POLL_IDLE_MS = 5 * MS_PER_MINUTE;

/**
 * How long to wait before the next calendar fetch, given the soonest cached
 * meeting. Pure and deterministic for an explicit `now`.
 *
 * @param next - The soonest upcoming meeting, or `null` if none is cached.
 * @param now - Reference time.
 */
export function nextFetchDelayMs(next: { start: Date } | null, now: Date = new Date()): number {
  if (next === null) {
    return POLL_IDLE_MS;
  }

  const untilStartMs = next.start.getTime() - now.getTime();
  // A meeting that's imminent or already started keeps the fast cadence so we
  // present/dismiss promptly and re-arm for the next one quickly.
  if (untilStartMs <= POLL_NEAR_THRESHOLD_MS) {
    return POLL_NEAR_MS;
  }
  if (untilStartMs <= POLL_SOON_THRESHOLD_MS) {
    return POLL_SOON_MS;
  }
  return POLL_IDLE_MS;
}
