import { describe, it, expect, vi, afterEach } from 'vitest';
import { MockCalendarSync } from './calendar.ts';

afterEach(() => {
  vi.useRealTimers();
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
