import { describe, it, expect } from 'vitest';
import { shouldPresent, type AlertState } from './alert.ts';
import type { CalendarEvent } from './calendar.ts';

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
