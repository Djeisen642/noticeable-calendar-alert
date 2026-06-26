/**
 * Pure, side-effect-free meeting countdown math.
 *
 * Everything here is deterministic given an explicit `now`, which makes the
 * module trivially unit-testable (see `countdown.test.ts`).
 */

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

const MS_PER_SECOND = 1_000;
const MS_PER_MINUTE = 60_000;

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
  const padSeconds = String(delta.seconds).padStart(2, '0');

  if (delta.isPast) {
    return delta.minutes === 0 ? 'starting now' : `started ${delta.minutes}m ago`;
  }

  if (delta.minutes === 0) {
    return `in ${delta.seconds}s`;
  }

  return `in ${delta.minutes}m ${padSeconds}s`;
}
