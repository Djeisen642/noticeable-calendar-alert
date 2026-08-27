import { describe, it, expect } from 'vitest';
import { demoBubbleContent, DEMO_TITLE, DEMO_JOIN_URL, DEMO_LEAD_MINUTES } from './demo.ts';
import { safeJoinUrl } from './url.ts';

const now = new Date('2026-06-27T10:00:00.000Z');

describe('demoBubbleContent', () => {
  it('uses the sample meeting title', () => {
    expect(demoBubbleContent(now).title).toBe(DEMO_TITLE);
  });

  it('previews the single-meeting bubble, not the simultaneous pick list', () => {
    expect(demoBubbleContent(now).meetings).toHaveLength(1);
  });

  it('renders a countdown for a meeting DEMO_LEAD_MINUTES out', () => {
    expect(demoBubbleContent(now).countdown).toBe(`in ${DEMO_LEAD_MINUTES}m 00s`);
  });

  it('previews the calm presentation (the demo meeting is comfortably away)', () => {
    // At DEMO_LEAD_MINUTES out the character should present calmly — the
    // preview must not open with the final-minute hop/red-pulse escalation.
    expect(demoBubbleContent(now).urgency).toBe('calm');
  });

  it('offers a join link that survives the strict conferencing-host guard', () => {
    // Regression guard: the preview must use a real provider host, otherwise the
    // "Join Call" button would be hidden (no URL) or rejected by safeJoinUrl —
    // defeating the point of previewing the overlay.
    const [meeting] = demoBubbleContent(now).meetings;
    expect(meeting.joinUrl).toBe(DEMO_JOIN_URL);
    expect(safeJoinUrl(meeting.joinUrl)).toBe(DEMO_JOIN_URL);
  });
});
