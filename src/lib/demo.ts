/**
 * Placeholder content for the tray's "Test Overlay" preview.
 *
 * The tray item plays the full attention sequence with this content so the
 * overlay can be eyeballed even when no real meeting is upcoming. Kept pure and
 * separate from `main.ts` so the content is unit-testable.
 */

import type { BubbleContent } from './animation.ts';
import { formatCountdown, getCountdownDelta } from './countdown.ts';
import { MS_PER_MINUTE } from './time.ts';

/** Sample meeting title shown in the preview bubble. */
export const DEMO_TITLE = 'Sprint Planning';
/**
 * Sample join link. Deliberately a real conferencing host so the "Join Call"
 * button renders and survives `safeJoinUrl`'s provider allowlist — matching
 * what a genuine alert looks like.
 */
export const DEMO_JOIN_URL = 'https://meet.google.com/abc-defg-hij';
/** How far "ahead" the fake meeting is, so the countdown looks realistic. */
export const DEMO_LEAD_MINUTES = 5;

/**
 * Build the placeholder bubble content for the "Test Overlay" preview.
 *
 * @param now - Reference time; pass an explicit value in tests for determinism.
 */
export function demoBubbleContent(now: Date = new Date()): BubbleContent {
  const start = new Date(now.getTime() + DEMO_LEAD_MINUTES * MS_PER_MINUTE);
  return {
    title: DEMO_TITLE,
    countdown: formatCountdown(getCountdownDelta(start, now)),
    joinUrl: DEMO_JOIN_URL,
  };
}
