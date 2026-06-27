import { describe, it, expect } from 'vitest';
import { getCountdownDelta, shouldAlert, formatCountdown } from './countdown.ts';

// A fixed reference clock keeps every assertion deterministic.
const NOW = new Date('2026-06-26T09:00:00.000Z');
const minutesFromNow = (m: number): Date => new Date(NOW.getTime() + m * 60_000);

describe('getCountdownDelta', () => {
  it('computes a positive delta for an upcoming meeting', () => {
    const delta = getCountdownDelta(minutesFromNow(5), NOW);

    expect(delta.totalMs).toBe(5 * 60_000);
    expect(delta.minutes).toBe(5);
    expect(delta.seconds).toBe(0);
    expect(delta.isPast).toBe(false);
  });

  it('splits minutes and seconds correctly', () => {
    const start = new Date(NOW.getTime() + 4 * 60_000 + 5_000); // 4m 5s out
    const delta = getCountdownDelta(start, NOW);

    expect(delta.minutes).toBe(4);
    expect(delta.seconds).toBe(5);
  });

  it('flags a meeting that has already started as past', () => {
    const delta = getCountdownDelta(minutesFromNow(-2), NOW);

    expect(delta.totalMs).toBeLessThan(0);
    expect(delta.isPast).toBe(true);
    expect(delta.minutes).toBe(2);
  });

  it('treats an exact-now start as past (boundary)', () => {
    const delta = getCountdownDelta(NOW, NOW);

    expect(delta.totalMs).toBe(0);
    expect(delta.isPast).toBe(true);
  });
});

describe('shouldAlert', () => {
  it('alerts when the meeting is inside the lead window', () => {
    expect(shouldAlert(minutesFromNow(3), NOW, 5)).toBe(true);
  });

  it('does not alert when the meeting is beyond the lead window', () => {
    expect(shouldAlert(minutesFromNow(10), NOW, 5)).toBe(false);
  });

  it('does not alert for a meeting that already started', () => {
    expect(shouldAlert(minutesFromNow(-1), NOW, 5)).toBe(false);
  });

  it('alerts exactly at the edge of the lead window (inclusive)', () => {
    expect(shouldAlert(minutesFromNow(5), NOW, 5)).toBe(true);
  });

  it('rejects a negative lead time', () => {
    expect(() => shouldAlert(minutesFromNow(5), NOW, -1)).toThrow(RangeError);
  });
});

describe('formatCountdown', () => {
  it('formats minutes and zero-padded seconds', () => {
    const start = new Date(NOW.getTime() + 4 * 60_000 + 5_000);
    expect(formatCountdown(getCountdownDelta(start, NOW))).toBe('in 4m 05s');
  });

  it('formats a sub-minute countdown', () => {
    expect(formatCountdown(getCountdownDelta(new Date(NOW.getTime() + 30_000), NOW))).toBe(
      'in 30s',
    );
  });

  it('reports "starting now" at the boundary', () => {
    expect(formatCountdown(getCountdownDelta(NOW, NOW))).toBe('starting now');
  });

  it('reports elapsed time once started', () => {
    expect(formatCountdown(getCountdownDelta(minutesFromNow(-3), NOW))).toBe('started 3m ago');
  });

  it('switches to hours for a meeting an hour or more out', () => {
    // The tray "next meeting" line looks well past the 5-minute alert lead, so a
    // far-future meeting must read as h:m rather than "in 135m 00s".
    expect(formatCountdown(getCountdownDelta(minutesFromNow(135), NOW))).toBe('in 2h 15m');
  });

  it('zero-pads the minutes component at the hour boundary', () => {
    expect(formatCountdown(getCountdownDelta(minutesFromNow(63), NOW))).toBe('in 1h 03m');
  });
});
