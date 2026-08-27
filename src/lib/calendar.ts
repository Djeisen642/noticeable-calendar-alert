/**
 * Google Calendar sync layer — interface stubs only.
 *
 * The real implementation will perform an OAuth 2.0 PKCE flow, persist the
 * refresh token in the OS keychain via a Tauri command, and page through the
 * Calendar v3 `events.list` endpoint. For the MVP we ship a deterministic mock
 * so the overlay can be developed end-to-end without network or credentials.
 */

import { MS_PER_SECOND, MS_PER_MINUTE, MS_PER_HOUR } from './time.ts';

/** A normalized calendar event, decoupled from Google's wire format. */
export interface CalendarEvent {
  readonly id: string;
  readonly title: string;
  readonly start: Date;
  readonly end: Date;
  /** Video-conference URL (Meet/Zoom/Teams), or `null` if none was detected. */
  readonly joinUrl: string | null;
  /**
   * The event's own page on Google Calendar (`htmlLink`), or `null` if the
   * source didn't provide a usable one. Used as the bubble button's fallback
   * destination when a meeting has no join link, so the alert always has
   * somewhere to take you.
   */
  readonly detailsUrl: string | null;
}

/** An OAuth 2.0 token bundle as returned by Google's token endpoint. */
export interface OAuthToken {
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly expiresAt: Date;
  readonly scope: string;
}

/**
 * The contract the overlay depends on. Swap `MockCalendarSync` for a real
 * `GoogleCalendarSync` without touching any UI code.
 */
export interface CalendarSync {
  /** Run the interactive OAuth consent flow and return a fresh token. */
  authenticate(): Promise<OAuthToken>;
  /** Exchange a refresh token for a new access token. */
  refresh(token: OAuthToken): Promise<OAuthToken>;
  /** Forget any stored credentials so the next sync requires re-consent. */
  signOut(): Promise<void>;
  /** Whether a credential is currently stored, so the UI can reflect state. */
  isSignedIn(): Promise<boolean>;
  /** Events starting within the next `withinMs` milliseconds, soonest first. */
  getUpcomingEvents(withinMs: number): Promise<CalendarEvent[]>;
}

/**
 * Pick the soonest event that hasn't started yet, regardless of the input's
 * order.
 *
 * Google's `events.list` filters by `timeMin` against an event's *end* time,
 * not its start — so a meeting already in progress still comes back first in
 * a `startTime`-sorted list until it actually ends. Left unfiltered, `next`
 * would stay pinned to that in-progress meeting for its entire duration,
 * missing the alert lead time for whatever starts immediately after it (i.e.
 * back-to-back meetings never get their own overlay).
 */
export function selectNextEvent(events: readonly CalendarEvent[], now: Date): CalendarEvent | null {
  let soonest: CalendarEvent | null = null;
  for (const event of events) {
    if (event.start.getTime() <= now.getTime()) continue;
    if (soonest === null || event.start.getTime() < soonest.start.getTime()) {
      soonest = event;
    }
  }
  return soonest;
}

/**
 * Deterministic in-memory implementation used in development and tests.
 *
 * It synthesizes a single meeting a fixed number of seconds in the future so
 * the entry animation and speech bubble can be exercised on demand.
 */
export class MockCalendarSync implements CalendarSync {
  private readonly secondsUntilMeeting: number;
  /** Re-arm a new meeting this long after the previous one started. */
  private readonly rearmAfterMs = 5 * MS_PER_SECOND;
  /** Synthetic meeting length, mirroring the real parser's default. */
  private readonly meetingDurationMs = 30 * MS_PER_MINUTE;
  private sequence = 0;
  private current: CalendarEvent;
  /** Tracks the simulated auth state so the tray toggle reflects sign-in. */
  private signedIn = false;

  constructor(secondsUntilMeeting = 8) {
    this.secondsUntilMeeting = secondsUntilMeeting;
    // Pin the start time ONCE so the countdown actually decreases over time.
    this.current = this.makeEvent();
  }

  authenticate(): Promise<OAuthToken> {
    this.signedIn = true;
    return Promise.resolve(this.fakeToken());
  }

  signOut(): Promise<void> {
    this.signedIn = false;
    return Promise.resolve();
  }

  isSignedIn(): Promise<boolean> {
    return Promise.resolve(this.signedIn);
  }

  refresh(_token: OAuthToken): Promise<OAuthToken> {
    return Promise.resolve(this.fakeToken());
  }

  getUpcomingEvents(_withinMs: number): Promise<CalendarEvent[]> {
    // Once the current meeting has started (and the overlay has dismissed),
    // schedule a fresh one so the template keeps demoing the full sequence.
    if (Date.now() - this.current.start.getTime() > this.rearmAfterMs) {
      this.current = this.makeEvent();
    }
    return Promise.resolve([this.current]);
  }

  private makeEvent(): CalendarEvent {
    this.sequence += 1;
    const start = new Date(Date.now() + this.secondsUntilMeeting * MS_PER_SECOND);
    // Alternate between a video meeting and a link-less one (an in-person 1:1)
    // so `npm run dev` exercises BOTH bubble buttons — "Join Call" and the
    // "View Event" fallback — without a Google account.
    const hasCall = this.sequence % 2 === 1;
    return {
      id: `mock-event-${String(this.sequence).padStart(3, '0')}`,
      title: hasCall ? 'Sprint Planning' : 'Coffee with Sam',
      start,
      end: new Date(start.getTime() + this.meetingDurationMs),
      joinUrl: hasCall ? 'https://meet.google.com/abc-defg-hij' : null,
      detailsUrl: `https://calendar.google.com/calendar/event?eid=mock-${String(this.sequence)}`,
    };
  }

  private fakeToken(): OAuthToken {
    return {
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token',
      expiresAt: new Date(Date.now() + MS_PER_HOUR),
      scope: 'https://www.googleapis.com/auth/calendar.events.readonly',
    };
  }
}
