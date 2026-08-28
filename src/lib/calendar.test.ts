import { describe, it, expect, vi, afterEach } from 'vitest';
import { MockCalendarSync, selectNextEvents, type CalendarEvent } from './calendar.ts';

afterEach(() => {
  vi.useRealTimers();
});

function makeEvent(id: string, start: Date, end: Date, title = id): CalendarEvent {
  return { id, title, start, end, joinUrl: null, detailsUrl: null };
}

describe('selectNextEvents', () => {
  const now = new Date('2026-06-26T09:00:00.000Z');
  const at = (iso: string): Date => new Date(iso);

  it('returns every meeting tied for the soonest start', () => {
    // The whole point of the feature: a double-booked 10:00 must surface both
    // meetings, not whichever one the API happened to list first.
    const standup = makeEvent(
      'standup',
      at('2026-06-26T10:00:00.000Z'),
      at('2026-06-26T10:15:00.000Z'),
    );
    const review = makeEvent(
      'review',
      at('2026-06-26T10:00:00.000Z'),
      at('2026-06-26T11:00:00.000Z'),
    );
    const later = makeEvent(
      'later',
      at('2026-06-26T11:00:00.000Z'),
      at('2026-06-26T11:30:00.000Z'),
    );

    expect(selectNextEvents([standup, review, later], now).map((e) => e.id)).toEqual([
      'review',
      'standup',
    ]);
  });

  it('excludes a later meeting that merely overlaps the tie', () => {
    const tie = makeEvent('tie', at('2026-06-26T10:00:00.000Z'), at('2026-06-26T11:00:00.000Z'));
    const overlapping = makeEvent(
      'overlapping',
      at('2026-06-26T10:00:01.000Z'),
      at('2026-06-26T10:30:00.000Z'),
    );

    expect(selectNextEvents([tie, overlapping], now).map((e) => e.id)).toEqual(['tie']);
  });

  it('orders a tie the same way regardless of input order', () => {
    // Google returns same-start events in no particular order, and the bubble
    // is rebuilt on every present — an unstable order would shuffle the list.
    const a = makeEvent(
      'a',
      at('2026-06-26T10:00:00.000Z'),
      at('2026-06-26T10:30:00.000Z'),
      'Alpha',
    );
    const b = makeEvent(
      'b',
      at('2026-06-26T10:00:00.000Z'),
      at('2026-06-26T10:30:00.000Z'),
      'Beta',
    );

    expect(selectNextEvents([a, b], now).map((e) => e.id)).toEqual(
      selectNextEvents([b, a], now).map((e) => e.id),
    );
  });

  it('breaks a same-title tie by id so the order is still deterministic', () => {
    const second = makeEvent(
      'z',
      at('2026-06-26T10:00:00.000Z'),
      at('2026-06-26T10:30:00.000Z'),
      'Sync',
    );
    const first = makeEvent(
      'a',
      at('2026-06-26T10:00:00.000Z'),
      at('2026-06-26T10:30:00.000Z'),
      'Sync',
    );

    expect(selectNextEvents([second, first], now).map((e) => e.id)).toEqual(['a', 'z']);
  });

  it('ignores meetings already in progress', () => {
    const inProgress = makeEvent(
      'in-progress',
      at('2026-06-26T08:30:00.000Z'),
      at('2026-06-26T10:00:00.000Z'),
    );
    const upcoming = makeEvent(
      'upcoming',
      at('2026-06-26T10:00:00.000Z'),
      at('2026-06-26T10:30:00.000Z'),
    );

    expect(selectNextEvents([inProgress, upcoming], now).map((e) => e.id)).toEqual(['upcoming']);
  });

  it('finds the true soonest meeting even when the input is not sorted', () => {
    // Nothing in the CalendarSync contract enforces call-site ordering at the
    // type level, so the scan must not just take the first future match.
    const farther = makeEvent(
      'farther',
      at('2026-06-26T12:00:00.000Z'),
      at('2026-06-26T12:30:00.000Z'),
    );
    const soonest = makeEvent(
      'soonest',
      at('2026-06-26T10:00:00.000Z'),
      at('2026-06-26T10:30:00.000Z'),
    );

    expect(selectNextEvents([farther, soonest], now).map((e) => e.id)).toEqual(['soonest']);
  });

  it('returns an empty list when every meeting has already started', () => {
    const past = makeEvent('past', at('2026-06-26T08:00:00.000Z'), at('2026-06-26T10:00:00.000Z'));

    expect(selectNextEvents([past], now)).toEqual([]);
  });

  it('returns an empty list for an empty calendar', () => {
    expect(selectNextEvents([], now)).toEqual([]);
  });
});

describe('MockCalendarSync', () => {
  it('returns a stable meeting start across successive polls', async () => {
    const sync = new MockCalendarSync(8);

    const [first] = await sync.getUpcomingEvents(0);
    const [second] = await sync.getUpcomingEvents(0);

    // Regression guard: the start time must NOT advance with each poll, or the
    // countdown would freeze and the overlay would never dismiss.
    expect(first.id).toBe(second.id);
    expect(first.start.getTime()).toBe(second.start.getTime());
  });

  it('schedules the meeting in the future so the countdown can decrease', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-26T09:00:00.000Z'));

    const sync = new MockCalendarSync(8);
    const [event] = await sync.getUpcomingEvents(0);

    expect(event.start.getTime()).toBe(Date.parse('2026-06-26T09:00:08.000Z'));
  });

  it('always offers a details link, even for the meeting with no call', async () => {
    // The overlay's button falls back to the event page when there's no join
    // link, so the mock must carry both for `npm run dev` to exercise it.
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-26T09:00:00.000Z'));

    const sync = new MockCalendarSync(8);
    const [first] = await sync.getUpcomingEvents(0);
    expect(first.joinUrl).not.toBeNull();
    expect(first.detailsUrl).not.toBeNull();

    vi.advanceTimersByTime(20_000);
    const [second] = await sync.getUpcomingEvents(0);
    // Alternating: the second synthetic meeting is an in-person one.
    expect(second.joinUrl).toBeNull();
    expect(second.detailsUrl).not.toBeNull();
  });

  it('tracks sign-in state so the tray toggle can reflect it', async () => {
    const sync = new MockCalendarSync(8);

    expect(await sync.isSignedIn()).toBe(false);
    await sync.authenticate();
    expect(await sync.isSignedIn()).toBe(true);
    await sync.signOut();
    expect(await sync.isSignedIn()).toBe(false);
  });

  it('eventually arms several simultaneous meetings so the picker is exercised', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-26T09:00:00.000Z'));
    const sync = new MockCalendarSync(8);

    // Re-arm until the mock's triple-booked round comes up (it cycles every
    // third batch), so `npm run dev` shows the pick list without a real clash.
    let batch = await sync.getUpcomingEvents(0);
    for (let round = 0; round < 5 && batch.length === 1; round += 1) {
      vi.advanceTimersByTime(20_000);
      batch = await sync.getUpcomingEvents(0);
    }

    expect(batch.length).toBeGreaterThan(1);
    const starts = new Set(batch.map((event) => event.start.getTime()));
    expect(starts.size).toBe(1); // simultaneous, or it isn't a clash
    expect(new Set(batch.map((event) => event.id)).size).toBe(batch.length); // unique ids
  });

  it('re-arms a fresh meeting once the previous one has started', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-26T09:00:00.000Z'));

    const sync = new MockCalendarSync(8);
    const [first] = await sync.getUpcomingEvents(0);

    vi.advanceTimersByTime(20_000); // well past the 8s start + re-arm window
    const [second] = await sync.getUpcomingEvents(0);

    expect(second.id).not.toBe(first.id);
    expect(second.start.getTime()).toBeGreaterThan(first.start.getTime());
  });
});
