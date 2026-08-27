/**
 * What the bubble's primary button does for a given meeting.
 *
 * Not every meeting has a video-conference link: an in-person 1:1, a focus
 * block, or a meeting whose provider isn't on the join allowlist all arrive
 * with `joinUrl === null`. The button used to simply disappear in that case,
 * leaving the alert with nothing to act on. Instead we fall back to the event's
 * own Google Calendar page, so there is always a way to get to the meeting's
 * details (agenda, location, guests, dial-in) in one click.
 *
 * Kept pure and DOM-free so the precedence rules are unit-testable.
 */

import { safeEventDetailsUrl, safeJoinUrl } from './url.ts';

/** The primary bubble button's label + destination. */
export interface MeetingAction {
  readonly label: string;
  readonly url: string;
  /** Which source the URL came from, so the DOM/tests can assert intent. */
  readonly kind: 'join' | 'details';
}

/** The two URLs an event can offer, straight off `CalendarEvent`. */
export interface MeetingLinks {
  readonly joinUrl: string | null;
  readonly detailsUrl: string | null;
}

export const JOIN_LABEL = 'Join Call';
export const DETAILS_LABEL = 'View Event';

/**
 * Resolve the button for a meeting: the join link when there is one, otherwise
 * the event's calendar page, otherwise nothing (the button stays hidden).
 *
 * Both candidates are re-validated here even though the calendar layer already
 * screened them. This is the last hop before an untrusted URL is handed to the
 * OS opener, and `MeetingBubbleContent` can be constructed by callers that
 * never went through the parser (the mock, the tray preview).
 */
export function resolveMeetingAction(links: MeetingLinks): MeetingAction | null {
  const join = safeJoinUrl(links.joinUrl);
  if (join !== null) {
    return { label: JOIN_LABEL, url: join, kind: 'join' };
  }

  const details = safeEventDetailsUrl(links.detailsUrl);
  if (details !== null) {
    return { label: DETAILS_LABEL, url: details, kind: 'details' };
  }

  return null;
}
