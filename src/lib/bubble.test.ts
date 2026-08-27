import { describe, it, expect } from 'vitest';
import { DETAILS_LABEL, resolveMeetingAction } from './action.ts';
import { meetingBubbleContent, meetingHeading } from './bubble.ts';
import type { CalendarEvent } from './calendar.ts';
import { getCountdownDelta } from './countdown.ts';

const NOW = new Date('2026-06-26T09:00:00.000Z');
const START = new Date('2026-06-26T09:03:00.000Z');
const DETAILS_URL = 'https://calendar.google.com/calendar/event?eid=abc';

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
    // page — exactly like the single-meeting button (lib/action.ts).
    const content = meetingBubbleContent(
      [event('a', 'Standup'), event('b', 'Coffee with Sam', null, DETAILS_URL)],
      delta,
    );

    expect(resolveMeetingAction(content.meetings[0])).toBeNull();
    expect(resolveMeetingAction(content.meetings[1])).toEqual({
      label: DETAILS_LABEL,
      url: DETAILS_URL,
      kind: 'details',
    });
  });

  it('preserves the order it was given (the caller owns display order)', () => {
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
