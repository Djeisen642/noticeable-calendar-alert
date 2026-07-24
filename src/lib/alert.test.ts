import { describe, it, expect } from 'vitest';
import { shouldPresent, isActiveEventStale, shouldAutoDismiss, type AlertState } from './alert.ts';
import type { CalendarEvent } from './calendar.ts';
import { getCountdownDelta } from './countdown.ts';

const NOW = new Date('2026-06-26T09:00:00.000Z');

function event(id: string, minutesFromNow: number): CalendarEvent {
  const start = new Date(NOW.getTime() + minutesFromNow * 60_000);
  return {
    id,
    title: 'Standup',
    start,
    end: new Date(start.getTime() + 30 * 60_000),
    joinUrl: null,
  };
}

const fresh: AlertState = { activeEventId: null, dismissedEventId: null };

describe('shouldPresent', () => {
  it('presents an upcoming meeting inside the lead window', () => {
    expect(shouldPresent(event('a', 3), NOW, 5, fresh)).toBe(true);
  });

  it('does not present a meeting beyond the lead window', () => {
    expect(shouldPresent(event('a', 10), NOW, 5, fresh)).toBe(false);
  });

  it('does not present a meeting that already started', () => {
    expect(shouldPresent(event('a', -1), NOW, 5, fresh)).toBe(false);
  });

  it('does not re-present the event already on screen', () => {
    expect(
      shouldPresent(event('a', 3), NOW, 5, { activeEventId: 'a', dismissedEventId: null }),
    ).toBe(false);
  });

  it('does not re-present an event the user dismissed (the Join-Call regression)', () => {
    // Meeting is still 3 minutes out, but the user already clicked Join.
    expect(
      shouldPresent(event('a', 3), NOW, 5, { activeEventId: null, dismissedEventId: 'a' }),
    ).toBe(false);
  });

  it('still presents a different upcoming event even after one was dismissed', () => {
    expect(
      shouldPresent(event('b', 4), NOW, 5, { activeEventId: null, dismissedEventId: 'a' }),
    ).toBe(true);
  });
});

describe('isActiveEventStale', () => {
  it('is not stale when nothing is active', () => {
    expect(isActiveEventStale(null, 'b')).toBe(false);
    expect(isActiveEventStale(null, null)).toBe(false);
  });

  it('is not stale when the active event is still next', () => {
    expect(isActiveEventStale('a', 'a')).toBe(false);
  });

  it('is stale when a poll advanced next to a different event (back-to-back)', () => {
    expect(isActiveEventStale('a', 'b')).toBe(true);
  });

  it('is stale when next has gone null while an event is still on screen', () => {
    expect(isActiveEventStale('a', null)).toBe(true);
  });
});

describe('shouldAutoDismiss', () => {
  const minutesFromNow = (m: number): Date => new Date(NOW.getTime() + m * 60_000);
  const delta = (minutesFromNowValue: number) =>
    getCountdownDelta(minutesFromNow(minutesFromNowValue), NOW);

  it('does not dismiss an upcoming meeting', () => {
    expect(shouldAutoDismiss(delta(3), 2)).toBe(false);
  });

  it('does not dismiss the instant a meeting starts', () => {
    expect(shouldAutoDismiss(delta(0), 2)).toBe(false);
  });

  it('does not dismiss before the grace period elapses', () => {
    expect(shouldAutoDismiss(delta(-1), 2)).toBe(false);
  });

  it('dismisses exactly at the grace period boundary (inclusive)', () => {
    expect(shouldAutoDismiss(delta(-2), 2)).toBe(true);
  });

  it('dismisses well past the grace period', () => {
    expect(shouldAutoDismiss(delta(-5), 2)).toBe(true);
  });

  it('rejects a negative grace period', () => {
    expect(() => shouldAutoDismiss(delta(-5), -1)).toThrow(RangeError);
  });
});
