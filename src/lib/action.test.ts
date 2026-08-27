import { describe, it, expect } from 'vitest';
import { resolveMeetingAction, DETAILS_LABEL, JOIN_LABEL } from './action.ts';

const JOIN = 'https://meet.google.com/abc-defg-hij';
const DETAILS = 'https://calendar.google.com/calendar/event?eid=abc123';

describe('resolveMeetingAction', () => {
  it('prefers the join link when the meeting has one', () => {
    expect(resolveMeetingAction({ joinUrl: JOIN, detailsUrl: DETAILS })).toEqual({
      label: JOIN_LABEL,
      url: JOIN,
      kind: 'join',
    });
  });

  it('falls back to the event page when there is no join link', () => {
    // The whole point of the fallback: a meeting with no video link (an
    // in-person 1:1, a focus block) still gets an actionable button.
    expect(resolveMeetingAction({ joinUrl: null, detailsUrl: DETAILS })).toEqual({
      label: DETAILS_LABEL,
      url: DETAILS,
      kind: 'details',
    });
  });

  it('falls back to the event page when the join link is unusable', () => {
    // A link from an unrecognized host is dropped by safeJoinUrl, which used to
    // leave the alert with no button at all.
    const action = resolveMeetingAction({
      joinUrl: 'https://evil.example/login',
      detailsUrl: DETAILS,
    });
    expect(action).toEqual({ label: DETAILS_LABEL, url: DETAILS, kind: 'details' });
  });

  it('returns null when neither link is usable, so the button stays hidden', () => {
    expect(resolveMeetingAction({ joinUrl: null, detailsUrl: null })).toBeNull();
    expect(resolveMeetingAction({ joinUrl: '', detailsUrl: '' })).toBeNull();
  });

  it('never hands an untrusted details URL to the opener', () => {
    // Both URLs are re-validated here — this is the last hop before the OS
    // opener, and bubble content can be built by callers that never went
    // through the events parser.
    expect(
      resolveMeetingAction({ joinUrl: null, detailsUrl: 'https://evil.example/calendar/event' }),
    ).toBeNull();
    expect(resolveMeetingAction({ joinUrl: null, detailsUrl: 'javascript:alert(1)' })).toBeNull();
  });
});
