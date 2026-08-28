/**
 * Placeholder content for the tray's "Test Overlay" preview.
 *
 * The tray item plays the full attention sequence with this content so the
 * overlay can be eyeballed even when no real meeting is upcoming. Kept pure and
 * separate from `main.ts` so the content is unit-testable.
 */

import { meetingBubbleContent, type MeetingBubbleContent } from './bubble.ts';
import { getCountdownDelta } from './countdown.ts';
import { MS_PER_MINUTE } from './time.ts';

/** Sample meeting title shown in the preview bubble. */
export const DEMO_TITLE = 'Sprint Planning';
/**
 * Sample join link. Deliberately a real conferencing host so the "Join Call"
 * button renders and survives `safeJoinUrl`'s provider allowlist — matching
 * what a genuine alert looks like.
 */
export const DEMO_JOIN_URL = 'https://meet.google.com/abc-defg-hij';
/**
 * Sample event-details link, mirroring Google's `htmlLink` shape. The preview
 * uses the join link above, but carrying this too keeps the placeholder a
 * faithful stand-in for a real event.
 */
export const DEMO_DETAILS_URL = 'https://calendar.google.com/calendar/event?eid=demo';
/** How far "ahead" the fake meeting is, so the countdown looks realistic. */
export const DEMO_LEAD_MINUTES = 5;

/**
 * Build the placeholder bubble content for the "Test Overlay" preview.
 *
 * @param now - Reference time; pass an explicit value in tests for determinism.
 */
export function demoBubbleContent(now: Date = new Date()): MeetingBubbleContent {
  const start = new Date(now.getTime() + DEMO_LEAD_MINUTES * MS_PER_MINUTE);
  const end = new Date(start.getTime() + 30 * MS_PER_MINUTE);
  return meetingBubbleContent(
    [
      {
        id: 'demo-event',
        title: DEMO_TITLE,
        start,
        end,
        joinUrl: DEMO_JOIN_URL,
        detailsUrl: DEMO_DETAILS_URL,
      },
    ],
    getCountdownDelta(start, now),
  );
}
