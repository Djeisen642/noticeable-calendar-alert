/**
 * The speech bubble's *content model* — what the bubble says, kept pure and
 * separate from `animation.ts`, which owns how it is put into the DOM.
 *
 * Everything here is deterministic given its inputs, so the wording and the
 * one-vs-many branching are unit-testable without a DOM.
 */

import type { CalendarEvent } from './calendar.ts';
import { describeCountdown, type CountdownDelta, type CountdownDisplay } from './countdown.ts';

/**
 * One meeting the user can pick from the bubble. Carries both link candidates
 * so each row resolves its own action via `resolveMeetingAction` — the same
 * join-then-details precedence the single-meeting button uses.
 */
export interface MeetingChoice {
  readonly title: string;
  /** Video-conference URL, or `null` when the invite carries no link. */
  readonly joinUrl: string | null;
  /** The event's Google Calendar page, the fallback destination. */
  readonly detailsUrl: string | null;
}

/**
 * Content rendered into the speech bubble for the meeting(s) starting next.
 *
 * `meetings` holds every meeting tied for that start time — usually one, but
 * double-booking is routine, and when it happens the bubble lists them all so
 * the user can pick which to join instead of the overlay silently choosing.
 */
export interface MeetingBubbleContent extends CountdownDisplay {
  readonly kind: 'meeting';
  /** Bubble headline: the meeting's title, or a "N meetings at once" summary. */
  readonly title: string;
  readonly meetings: readonly MeetingChoice[];
}

/**
 * Content rendered into the speech bubble when a previously-working Google
 * Calendar connection has silently lapsed (e.g. a revoked/expired refresh
 * token) and needs a fresh interactive sign-in. Reuses the same walk-in/wave
 * entrance as a meeting alert so a dead connection can't go unnoticed until a
 * meeting is actually missed.
 */
export interface ReconnectBubbleContent {
  readonly kind: 'reconnect';
  readonly title: string;
  readonly message: string;
}

export type BubbleContent = MeetingBubbleContent | ReconnectBubbleContent;

/**
 * The bubble headline for a set of simultaneous meetings.
 *
 * With one meeting the headline is just its title (nothing has changed for the
 * common case). With several, no single title can be the headline without
 * burying the others, so it summarizes the clash and the list below carries
 * the titles.
 */
export function meetingHeading(meetings: readonly { title: string }[]): string {
  if (meetings.length === 1) {
    return meetings[0].title;
  }
  return `${String(meetings.length)} meetings at once`;
}

/**
 * Build the bubble content for the meetings starting next.
 *
 * @param events - The meetings tied for the next start time. Must be non-empty;
 *   they all share a start, so one `delta` describes the whole group.
 * @param delta - Time remaining until that shared start time.
 */
export function meetingBubbleContent(
  events: readonly CalendarEvent[],
  delta: CountdownDelta,
): MeetingBubbleContent {
  if (events.length === 0) {
    throw new RangeError('meetingBubbleContent requires at least one event');
  }
  const meetings = events.map(({ title, joinUrl, detailsUrl }) => ({
    title,
    joinUrl,
    detailsUrl,
  }));
  return {
    kind: 'meeting',
    title: meetingHeading(meetings),
    meetings,
    ...describeCountdown(delta),
  };
}
