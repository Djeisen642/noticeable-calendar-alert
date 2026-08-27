/**
 * Pure decision logic for the overlay lifecycle, extracted so it can be
 * unit-tested away from the DOM/Tauri wiring in `main.ts`.
 */

import type { CalendarEvent } from './calendar.ts';
import { shouldAlert, type CountdownDelta } from './countdown.ts';
import { MS_PER_MINUTE } from './time.ts';

export interface AlertState {
  /** The alert currently on screen, if any. */
  readonly activeAlertKey: string | null;
  /** The last alert the user actively dismissed (e.g. clicked "Join Call"). */
  readonly dismissedAlertKey: string | null;
}

/**
 * Separator for the ids inside a composite alert key. NUL can't appear in a
 * Google Calendar event id, so no combination of ids can forge another key.
 */
const KEY_SEPARATOR = '\u0000';

/**
 * The identity of one alert: a single event, or several that start at the same
 * moment and are therefore presented together as a pick-one list.
 *
 * Sorting the ids makes the key independent of the order the API returned them
 * in, so a re-poll that reshuffles a tie doesn't read as a different alert and
 * re-present something the user already dismissed.
 *
 * @returns the key, or `null` when there is nothing to alert about.
 */
export function alertKey(events: readonly CalendarEvent[]): string | null {
  if (events.length === 0) {
    return null;
  }
  return events
    .map((event) => event.id)
    .sort()
    .join(KEY_SEPARATOR);
}

/**
 * Whether the overlay's currently active alert is stale and must be dismissed
 * before anything else happens.
 *
 * `tick()` and the calendar poll aren't mutually exclusive, so a poll can
 * advance the selection to a different event while the previous one is still on
 * screen (e.g. a back-to-back meeting whose predecessor hasn't been dismissed
 * yet), or add a newly-accepted invite to a tie that is already showing.
 * Presenting the new alert straight over the old one would skip its exit
 * animation and its `dismissedAlertKey` bookkeeping, so that case must run
 * through `dismiss()` first.
 */
export function isActiveAlertStale(activeKey: string | null, nextKey: string | null): boolean {
  return activeKey !== null && activeKey !== nextKey;
}

/**
 * Whether `events` — one meeting, or several starting at the same moment —
 * should be freshly presented now.
 *
 * Crucially, an alert the user already dismissed is NOT re-presented while its
 * meetings are still upcoming — otherwise clicking "Join Call" (which dismisses
 * the overlay) would just make it pop straight back up on the next tick.
 */
export function shouldPresent(
  events: readonly CalendarEvent[],
  now: Date,
  leadTimeMinutes: number,
  state: AlertState,
): boolean {
  const key = alertKey(events);
  if (key === null) {
    return false; // nothing upcoming
  }
  if (key === state.activeAlertKey) {
    return false; // already showing
  }
  if (key === state.dismissedAlertKey) {
    return false; // the user already handled this one
  }
  // Every event in the group shares a start time, so any of them will do.
  return shouldAlert(events[0].start, now, leadTimeMinutes);
}

/**
 * Whether an overlay that's already showing should auto-dismiss because the
 * meeting started `graceMinutes` ago (or more) and the user still hasn't
 * clicked Join or Dismiss.
 *
 * Before this grace period elapses, a past-start delta must NOT trigger a
 * dismiss — the whole point is that the overlay keeps nagging through the
 * meeting's first couple of minutes instead of vanishing the instant it
 * starts.
 */
export function shouldAutoDismiss(delta: CountdownDelta, graceMinutes: number): boolean {
  if (graceMinutes < 0) {
    throw new RangeError('graceMinutes must be non-negative');
  }
  return delta.totalMs <= -(graceMinutes * MS_PER_MINUTE);
}

/**
 * Whether a sign-in check that used to succeed just failed — a silent
 * connection lapse (a revoked/expired refresh token, cleared out from under
 * the app) as opposed to a user who was never signed in to begin with.
 * Distinguishing the two matters: only a genuine lapse should trigger the
 * noisy "reconnect" overlay alert, not every idle poll while signed out.
 */
export function isConnectionLapse(wasSignedIn: boolean, isSignedInNow: boolean): boolean {
  return wasSignedIn && !isSignedInNow;
}
