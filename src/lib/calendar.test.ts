import { describe, it, expect, vi, afterEach } from 'vitest';
import { MockCalendarSync, selectNextEvent, type CalendarEvent } from './calendar.ts';

afterEach(() => {
  vi.useRealTimers();
});

function makeEvent(id: string, start: Date, end: Date): CalendarEvent {
  return { id, title: id, start, end, joinUrl: null };
}

describe('selectNextEvent', () => {
  it('picks the soonest event that has not started yet', () => {
    const now = new Date('2026-06-26T09:00:00.000Z');
    const later = makeEvent(
      'later',
      new Date('2026-06-26T10:00:00.000Z'),
      new Date('2026-06-26T10:30:00.000Z'),
    );

    expect(selectNextEvent([later], now)?.id).toBe('later');
  });

  it('skips a meeting already in progress in favor of a back-to-back follow-up', () => {
    // Google's events.list filters by end time, so an in-progress meeting can
    // still be events[0] in a startTime-sorted list. selectNextEvent must not
    // get stuck on it — the very case that used to swallow back-to-back alerts.
    const now = new Date('2026-06-26T09:30:00.000Z');
    const inProgress = makeEvent(
      'in-progress',
      new Date('2026-06-26T09:00:00.000Z'),
      new Date('2026-06-26T10:00:00.000Z'),
    );
    const backToBack = makeEvent(
      'back-to-back',
      new Date('2026-06-26T10:00:00.000Z'),
      new Date('2026-06-26T10:30:00.000Z'),
    );

    expect(selectNextEvent([inProgress, backToBack], now)?.id).toBe('back-to-back');
  });

  it('returns null when every event has already started', () => {
    const now = new Date('2026-06-26T09:30:00.000Z');
    const past = makeEvent(
      'past',
      new Date('2026-06-26T09:00:00.000Z'),
      new Date('2026-06-26T10:00:00.000Z'),
    );

    expect(selectNextEvent([past], now)).toBeNull();
  });

  it('returns null for an empty list', () => {
    expect(selectNextEvent([], new Date())).toBeNull();
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

  it('tracks sign-in state so the tray toggle can reflect it', async () => {
    const sync = new MockCalendarSync(8);

    expect(await sync.isSignedIn()).toBe(false);
    await sync.authenticate();
    expect(await sync.isSignedIn()).toBe(true);
    await sync.signOut();
    expect(await sync.isSignedIn()).toBe(false);
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
