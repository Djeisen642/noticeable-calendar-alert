/**
 * Time-unit conversion constants, in milliseconds.
 *
 * Centralized so the same `60_000` / `1_000` literals aren't re-spelled across
 * the countdown math, the poll cadence, the OAuth expiry math, and the mock.
 */

export const MS_PER_SECOND = 1_000;
export const MS_PER_MINUTE = 60_000;
export const MS_PER_HOUR = 3_600_000;
