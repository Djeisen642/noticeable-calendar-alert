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
 * Order simultaneous events for display: by title, then by id so the list is
 * stable across polls (Google returns same-start events in an arbitrary order).
 */
function byTitleThenId(a: CalendarEvent, b: CalendarEvent): number {
  if (a.title !== b.title) return a.title < b.title ? -1 : 1;
  if (a.id !== b.id) return a.id < b.id ? -1 : 1;
  return 0;
}

/**
 * Pick every event tied for the soonest start time that hasn't passed yet,
 * regardless of the input's order.
 *
 * Double-booking is routine — two meetings at 10:00 and only one of them is
 * the one you meant to attend. Alerting for just one of them (whichever the
 * API happened to list first) silently hides the other, so the overlay
 * presents the whole tie as a single alert and lets the user pick.
 *
 * Google's `events.list` filters by `timeMin` against an event's *end* time,
 * not its start — so a meeting already in progress still comes back first in
 * a `startTime`-sorted list until it actually ends. Left unfiltered, the
 * selection would stay pinned to that in-progress meeting for its entire
 * duration, missing the alert lead time for whatever starts immediately after
 * it (i.e. back-to-back meetings never get their own overlay).
 *
 * @returns the tied events in a stable display order, or `[]` if none are
 *   upcoming.
 */
export function selectNextEvents(events: readonly CalendarEvent[], now: Date): CalendarEvent[] {
  const nowMs = now.getTime();
  let soonestMs = Infinity;
  for (const event of events) {
    const startMs = event.start.getTime();
    if (startMs > nowMs && startMs < soonestMs) soonestMs = startMs;
  }
  if (soonestMs === Infinity) return [];
  return events.filter((event) => event.start.getTime() === soonestMs).sort(byTitleThenId);
}

/**
 * Deterministic in-memory implementation used in development and tests.
 *
 * It synthesizes a meeting a fixed number of seconds in the future so the entry
 * animation and speech bubble can be exercised on demand, and every third round
 * makes those meetings *simultaneous* — so a session running on the mock walks
 * through both the plain bubble and the pick-one-of-several list without
 * needing a genuinely double-booked calendar.
 */
export class MockCalendarSync implements CalendarSync {
  private readonly secondsUntilMeeting: number;
  /** Re-arm a new meeting this long after the previous one started. */
  private readonly rearmAfterMs = 5 * MS_PER_SECOND;
  /** Synthetic meeting length, mirroring the real parser's default. */
  private readonly meetingDurationMs = 30 * MS_PER_MINUTE;
  /** The cast of synthetic meetings, cycled through on each re-arm. */
  private static readonly TEMPLATES: readonly { title: string; joinUrl: string | null }[] = [
    { title: 'Sprint Planning', joinUrl: 'https://meet.google.com/abc-defg-hij' },
    { title: 'Design Review', joinUrl: 'https://zoom.us/j/9876543210' },
    { title: 'Budget Sync (no link)', joinUrl: null },
  ];
  private sequence = 0;
  /** The events tied for the next start time — one, or several at once. */
  private current: CalendarEvent[];
  /** Tracks the simulated auth state so the tray toggle reflects sign-in. */
  private signedIn = false;

  constructor(secondsUntilMeeting = 8) {
    this.secondsUntilMeeting = secondsUntilMeeting;
    // Pin the start time ONCE so the countdown actually decreases over time.
    this.current = this.makeEvents();
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
    if (Date.now() - this.nextStart().getTime() > this.rearmAfterMs) {
      this.current = this.makeEvents();
    }
    return Promise.resolve([...this.current]);
  }

  /** Start time of the currently armed batch (they all share one). */
  private nextStart(): Date {
    // `makeEvents` never returns an empty batch, so index 0 is always present.
    return this.current[0].start;
  }

  /**
   * Build the next batch: every third round is a triple-booking, so the
   * simultaneous-meeting picker comes up on its own rather than only when a
   * real calendar happens to clash.
   */
  private makeEvents(): CalendarEvent[] {
    this.sequence += 1;
    const simultaneous = this.sequence % 3 === 0;
    const start = new Date(Date.now() + this.secondsUntilMeeting * MS_PER_SECOND);
    const templates = simultaneous
      ? MockCalendarSync.TEMPLATES
      : [MockCalendarSync.TEMPLATES[this.sequence % MockCalendarSync.TEMPLATES.length]];
    return templates.map((template, index) => ({
      id: `mock-event-${String(this.sequence).padStart(3, '0')}-${String(index)}`,
      title: template.title,
      start,
      end: new Date(start.getTime() + this.meetingDurationMs),
      joinUrl: template.joinUrl,
    }));
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
