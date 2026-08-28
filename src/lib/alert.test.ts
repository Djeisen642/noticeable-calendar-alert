import { describe, it, expect } from 'vitest';
import {
  alertKey,
  shouldPresent,
  isActiveAlertStale,
  shouldAutoDismiss,
  isConnectionLapse,
  type AlertState,
} from './alert.ts';
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
    detailsUrl: null,
  };
}

const fresh: AlertState = { activeAlertKey: null, dismissedAlertKey: null };

describe('alertKey', () => {
  it('is null when there is nothing to alert about', () => {
    expect(alertKey([])).toBeNull();
  });

  it('is the event id for a single meeting', () => {
    expect(alertKey([event('a', 3)])).toBe('a');
  });

  it('combines the ids of simultaneous meetings', () => {
    expect(alertKey([event('a', 3), event('b', 3)])).toContain('a');
    expect(alertKey([event('a', 3), event('b', 3)])).toContain('b');
  });

  it('is independent of the order the API listed a tie in', () => {
    // A re-poll can reshuffle same-start events. If that changed the key, the
    // alert would read as new and pop back up after the user dismissed it.
    expect(alertKey([event('a', 3), event('b', 3)])).toBe(alertKey([event('b', 3), event('a', 3)]));
  });

  it('distinguishes a tie from either meeting alone', () => {
    const both = alertKey([event('a', 3), event('b', 3)]);
    expect(both).not.toBe(alertKey([event('a', 3)]));
    expect(both).not.toBe(alertKey([event('b', 3)]));
  });
});

describe('shouldPresent', () => {
  it('presents an upcoming meeting inside the lead window', () => {
    expect(shouldPresent([event('a', 3)], NOW, 5, fresh)).toBe(true);
  });

  it('does not present a meeting beyond the lead window', () => {
    expect(shouldPresent([event('a', 10)], NOW, 5, fresh)).toBe(false);
  });

  it('does not present a meeting that already started', () => {
    expect(shouldPresent([event('a', -1)], NOW, 5, fresh)).toBe(false);
  });

  it('does not present an empty selection', () => {
    expect(shouldPresent([], NOW, 5, fresh)).toBe(false);
  });

  it('does not re-present the alert already on screen', () => {
    expect(
      shouldPresent([event('a', 3)], NOW, 5, { activeAlertKey: 'a', dismissedAlertKey: null }),
    ).toBe(false);
  });

  it('does not re-present an alert the user dismissed (the Join-Call regression)', () => {
    // Meeting is still 3 minutes out, but the user already clicked Join.
    expect(
      shouldPresent([event('a', 3)], NOW, 5, { activeAlertKey: null, dismissedAlertKey: 'a' }),
    ).toBe(false);
  });

  it('still presents a different upcoming event even after one was dismissed', () => {
    expect(
      shouldPresent([event('b', 4)], NOW, 5, { activeAlertKey: null, dismissedAlertKey: 'a' }),
    ).toBe(true);
  });

  it('presents simultaneous meetings as one alert', () => {
    expect(shouldPresent([event('a', 3), event('b', 3)], NOW, 5, fresh)).toBe(true);
  });

  it('does not re-present a dismissed tie when a re-poll reorders it', () => {
    const dismissedAlertKey = alertKey([event('a', 3), event('b', 3)]);
    expect(
      shouldPresent([event('b', 3), event('a', 3)], NOW, 5, {
        activeAlertKey: null,
        dismissedAlertKey,
      }),
    ).toBe(false);
  });

  it('presents again when a third meeting joins a tie the user dismissed', () => {
    // A newly-accepted invite for the same slot is genuinely new information:
    // the user picked from two meetings, not three.
    const dismissedAlertKey = alertKey([event('a', 3), event('b', 3)]);
    expect(
      shouldPresent([event('a', 3), event('b', 3), event('c', 3)], NOW, 5, {
        activeAlertKey: null,
        dismissedAlertKey,
      }),
    ).toBe(true);
  });
});

describe('isActiveAlertStale', () => {
  it('is not stale when nothing is active', () => {
    expect(isActiveAlertStale(null, 'b')).toBe(false);
    expect(isActiveAlertStale(null, null)).toBe(false);
  });

  it('is not stale when the active alert is still next', () => {
    expect(isActiveAlertStale('a', 'a')).toBe(false);
  });

  it('is stale when a poll advanced next to a different event (back-to-back)', () => {
    expect(isActiveAlertStale('a', 'b')).toBe(true);
  });

  it('is stale when next has gone null while an event is still on screen', () => {
    expect(isActiveAlertStale('a', null)).toBe(true);
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

describe('isConnectionLapse', () => {
  it('is a lapse when a signed-in session silently drops', () => {
    expect(isConnectionLapse(true, false)).toBe(true);
  });

  it('is not a lapse when the user was never signed in', () => {
    expect(isConnectionLapse(false, false)).toBe(false);
  });

  it('is not a lapse while still signed in', () => {
    expect(isConnectionLapse(true, true)).toBe(false);
  });

  it('is not a lapse for a signed-out-to-signed-in transition', () => {
    expect(isConnectionLapse(false, true)).toBe(false);
  });
});
