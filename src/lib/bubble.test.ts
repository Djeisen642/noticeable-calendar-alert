import { describe, it, expect } from 'vitest';
import { DETAILS_LABEL, resolveMeetingAction } from './action.ts';
import { safeEventDetailsUrl } from './url.ts';
import {
  MAX_VISIBLE_MEETINGS,
  meetingBubbleContent,
  meetingHeading,
  type MeetingChoice,
} from './bubble.ts';
import type { CalendarEvent } from './calendar.ts';
import { getCountdownDelta } from './countdown.ts';

const NOW = new Date('2026-06-26T09:00:00.000Z');
const START = new Date('2026-06-26T09:03:00.000Z');
const DETAILS_URL = 'https://calendar.google.com/calendar/event?eid=abc';
const CALL_URL = 'https://zoom.us/j/1';

function event(
  id: string,
  title: string,
  joinUrl: string | null = null,
  detailsUrl: string | null = null,
): CalendarEvent {
  return {
    id,
    title,
    start: START,
    end: new Date(START.getTime() + 1_800_000),
    joinUrl,
    detailsUrl,
  };
}

const delta = getCountdownDelta(START, NOW);

describe('meetingHeading', () => {
  it('is the meeting title when there is only one', () => {
    expect(meetingHeading([{ title: 'Sprint Planning' }])).toBe('Sprint Planning');
  });

  it('summarizes a clash rather than burying one of the titles', () => {
    expect(meetingHeading([{ title: 'Standup' }, { title: 'Design Review' }])).toBe(
      '2 meetings at once',
    );
  });

  it('counts every meeting in the clash', () => {
    expect(meetingHeading([{ title: 'a' }, { title: 'b' }, { title: 'c' }])).toBe(
      '3 meetings at once',
    );
  });
});

describe('meetingBubbleContent', () => {
  it('carries the single meeting through unchanged', () => {
    const content = meetingBubbleContent([event('a', 'Standup', 'https://zoom.us/j/1')], delta);

    expect(content.title).toBe('Standup');
    expect(content.meetings).toEqual([
      { title: 'Standup', joinUrl: 'https://zoom.us/j/1', detailsUrl: null },
    ]);
    expect(content.countdown).toBe('in 3m 00s');
    expect(content.urgency).toBe('soon');
  });

  it('lists every simultaneous meeting so the user can pick', () => {
    const content = meetingBubbleContent(
      [
        event('a', 'Standup', 'https://zoom.us/j/1'),
        event('b', 'Design Review', null, DETAILS_URL),
      ],
      delta,
    );

    expect(content.title).toBe('2 meetings at once');
    expect(content.meetings).toEqual([
      { title: 'Standup', joinUrl: 'https://zoom.us/j/1', detailsUrl: null },
      { title: 'Design Review', joinUrl: null, detailsUrl: DETAILS_URL },
    ]);
  });

  it('carries both link candidates through, so each row can resolve its own action', () => {
    // A clashing meeting with no call still has somewhere to go — its event
    // page — exactly like the single-meeting button (lib/action.ts). Looked up
    // by title, not position: rows are ordered by how actionable they are.
    const content = meetingBubbleContent(
      [event('a', 'Standup'), event('b', 'Coffee with Sam', null, DETAILS_URL)],
      delta,
    );
    const byTitle = (title: string): MeetingChoice => {
      const found = content.meetings.find((meeting) => meeting.title === title);
      if (found === undefined) throw new Error(`no row for ${title}`);
      return found;
    };

    expect(resolveMeetingAction(byTitle('Standup'))).toBeNull();
    expect(resolveMeetingAction(byTitle('Coffee with Sam'))).toEqual({
      label: DETAILS_LABEL,
      url: DETAILS_URL,
      kind: 'details',
    });
  });

  it('floats the meeting that offers something above the one that offers nothing', () => {
    const content = meetingBubbleContent(
      [event('a', 'Standup'), event('b', 'Coffee with Sam', null, DETAILS_URL)],
      delta,
    );

    expect(content.meetings.map((meeting) => meeting.title)).toEqual([
      'Coffee with Sam',
      'Standup',
    ]);
  });

  it('preserves the caller order among equally actionable meetings', () => {
    const content = meetingBubbleContent([event('b', 'Beta'), event('a', 'Alpha')], delta);

    expect(content.meetings.map((meeting) => meeting.title)).toEqual(['Beta', 'Alpha']);
  });

  it('shares one countdown across the whole clash', () => {
    // Every meeting in a tie starts at the same moment, so a second countdown
    // line per meeting would be redundant — and could disagree.
    const content = meetingBubbleContent([event('a', 'Standup'), event('b', 'Review')], delta);

    expect(content.countdown).toBe('in 3m 00s');
  });

  it('rejects an empty selection rather than rendering a headless bubble', () => {
    expect(() => meetingBubbleContent([], delta)).toThrow(RangeError);
  });
});

describe('meetingBubbleContent overflow', () => {
  const many = (count: number): CalendarEvent[] =>
    Array.from({ length: count }, (_, i) =>
      event(`e${String(i)}`, `Meeting ${String(i)}`, CALL_URL),
    );

  it('lists every meeting when the clash fits', () => {
    const content = meetingBubbleContent(many(MAX_VISIBLE_MEETINGS), delta);

    expect(content.meetings).toHaveLength(MAX_VISIBLE_MEETINGS);
    expect(content.hiddenCount).toBe(0);
    expect(content.calendarUrl).toBeNull();
  });

  it('caps the list and counts the remainder once the clash is too big', () => {
    const content = meetingBubbleContent(many(6), delta);

    expect(content.meetings).toHaveLength(MAX_VISIBLE_MEETINGS);
    expect(content.hiddenCount).toBe(6 - MAX_VISIBLE_MEETINGS);
  });

  it('still counts the whole clash in the headline, not just the rows shown', () => {
    // The count is the honest part: the list is capped, the disclosure is not.
    expect(meetingBubbleContent(many(6), delta).title).toBe('6 meetings at once');
  });

  it('offers the day view in Google Calendar for the meetings it could not list', () => {
    // START is 2026-06-26 (a Friday) — the link lands on that day's calendar.
    const url = meetingBubbleContent(many(6), delta).calendarUrl;

    expect(url).not.toBeNull();
    expect(url).toContain('https://calendar.google.com/calendar/r/day/');
    expect(safeEventDetailsUrl(url)).toBe(url);
  });

  it('shows the joinable meetings first, so a cap never hides the only call', () => {
    // The regression this ordering exists for: sorted by title, the one real
    // call here sorts last and would vanish behind the "+N more" row.
    const content = meetingBubbleContent(
      [
        event('a', 'Alpha', null, null),
        event('b', 'Beta', null, DETAILS_URL),
        event('c', 'Gamma', null, null),
        event('d', 'Zulu', CALL_URL),
      ],
      delta,
    );

    expect(content.meetings.map((m) => m.title)).toEqual(['Zulu', 'Beta', 'Alpha']);
    expect(content.hiddenCount).toBe(1);
  });

  it('keeps the caller order within an equally actionable group', () => {
    const content = meetingBubbleContent(
      [event('b', 'Beta', CALL_URL), event('a', 'Alpha', CALL_URL)],
      delta,
    );

    expect(content.meetings.map((m) => m.title)).toEqual(['Beta', 'Alpha']);
  });
});
