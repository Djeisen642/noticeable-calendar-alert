/**
 * Pure, side-effect-free meeting countdown math.
 *
 * Everything here is deterministic given an explicit `now`, which makes the
 * module trivially unit-testable (see `countdown.test.ts`).
 */

import { MS_PER_SECOND, MS_PER_MINUTE } from './time.ts';

export interface CountdownDelta {
  /** Signed milliseconds until the meeting. Negative once it has started. */
  readonly totalMs: number;
  /** Whole minutes component of the absolute delta. */
  readonly minutes: number;
  /** Whole seconds component of the absolute delta (0–59). */
  readonly seconds: number;
  /** `true` once the start time is in the past. */
  readonly isPast: boolean;
}

/**
 * Compute the time remaining until `start`, relative to `now`.
 *
 * @param start - The meeting start time.
 * @param now - The reference time. Defaults to the wall clock; pass an explicit
 *   value in tests for determinism.
 */
export function getCountdownDelta(start: Date, now: Date = new Date()): CountdownDelta {
  const totalMs = start.getTime() - now.getTime();
  const absMs = Math.abs(totalMs);

  return {
    totalMs,
    minutes: Math.floor(absMs / MS_PER_MINUTE),
    seconds: Math.floor((absMs % MS_PER_MINUTE) / MS_PER_SECOND),
    isPast: totalMs <= 0,
  };
}

/**
 * How urgently the overlay should behave while it is up. Drives the character
 * (calm presenting → excited hopping → shaking) and the countdown text color
 * via `data-urgency` attributes — see `OverlayAnimator` and styles.css.
 */
export type Urgency = 'calm' | 'soon' | 'now' | 'overdue';

/** At or under this remaining time the alert escalates to `'soon'`. */
export const SOON_THRESHOLD_MS = 3 * MS_PER_MINUTE;
/** At or under this remaining time it escalates to `'now'`. */
export const NOW_THRESHOLD_MS = MS_PER_MINUTE;

/**
 * Classify a countdown delta into an urgency level.
 *
 * @example
 * countdownUrgency(getCountdownDelta(start, now)); // 'calm' | 'soon' | 'now' | 'overdue'
 */
export function countdownUrgency(delta: CountdownDelta): Urgency {
  if (delta.isPast) {
    // The meeting has actually started and the user hasn't acted — this is
    // the most alarming state, distinct from the final minute of lead-up.
    return 'overdue';
  }
  if (delta.totalMs <= NOW_THRESHOLD_MS) {
    return 'now';
  }
  if (delta.totalMs <= SOON_THRESHOLD_MS) {
    return 'soon';
  }
  return 'calm';
}

/**
 * Whether the overlay should fire: the meeting is still upcoming and falls
 * within the configured lead window.
 *
 * @param start - The meeting start time.
 * @param now - The reference time.
 * @param leadTimeMinutes - How far ahead of the meeting to alert.
 */
export function shouldAlert(start: Date, now: Date, leadTimeMinutes: number): boolean {
  if (leadTimeMinutes < 0) {
    throw new RangeError('leadTimeMinutes must be non-negative');
  }

  const { totalMs } = getCountdownDelta(start, now);
  const leadMs = leadTimeMinutes * MS_PER_MINUTE;

  return totalMs > 0 && totalMs <= leadMs;
}

/**
 * Render a delta as a compact human-readable string for the speech bubble.
 *
 * @example
 * formatCountdown(getCountdownDelta(start, now)); // "in 4m 05s"
 */
export function formatCountdown(delta: CountdownDelta): string {
  if (delta.isPast) {
    return delta.minutes === 0 ? 'starting now' : `started ${delta.minutes}m ago`;
  }

  if (delta.minutes === 0) {
    return `in ${delta.seconds}s`;
  }

  // For a meeting an hour or more out (e.g. the tray "next meeting" line, which
  // looks well past the 5-minute alert lead) switch to h:m — "in 135m 00s" reads
  // badly. The overlay bubble only ever sees sub-lead deltas, so it never hits this.
  if (delta.minutes >= 60) {
    const hours = Math.floor(delta.minutes / 60);
    const padMinutes = String(delta.minutes % 60).padStart(2, '0');
    return `in ${String(hours)}h ${padMinutes}m`;
  }

  const padSeconds = String(delta.seconds).padStart(2, '0');
  return `in ${delta.minutes}m ${padSeconds}s`;
}

/**
 * The two delta-derived fields the speech bubble displays. Always derive them
 * together (via `describeCountdown`) so the countdown text and the urgency
 * styling can never disagree about how close the meeting is.
 */
export interface CountdownDisplay {
  readonly countdown: string;
  readonly urgency: Urgency;
}

/** Derive the bubble's countdown text and urgency level from one delta. */
export function describeCountdown(delta: CountdownDelta): CountdownDisplay {
  return { countdown: formatCountdown(delta), urgency: countdownUrgency(delta) };
}
