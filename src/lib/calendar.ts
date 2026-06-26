/**
 * Google Calendar sync layer — interface stubs only.
 *
 * The real implementation will perform an OAuth 2.0 PKCE flow, persist the
 * refresh token in the OS keychain via a Tauri command, and page through the
 * Calendar v3 `events.list` endpoint. For the MVP we ship a deterministic mock
 * so the overlay can be developed end-to-end without network or credentials.
 */

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
  /** Events starting within the next `withinMs` milliseconds, soonest first. */
  getUpcomingEvents(withinMs: number): Promise<CalendarEvent[]>;
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
  private readonly rearmAfterMs = 5_000;
  private sequence = 0;
  private current: CalendarEvent;

  constructor(secondsUntilMeeting = 8) {
    this.secondsUntilMeeting = secondsUntilMeeting;
    // Pin the start time ONCE so the countdown actually decreases over time.
    this.current = this.makeEvent();
  }

  authenticate(): Promise<OAuthToken> {
    return Promise.resolve(this.fakeToken());
  }

  signOut(): Promise<void> {
    return Promise.resolve();
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
    const start = new Date(Date.now() + this.secondsUntilMeeting * 1_000);
    return {
      id: `mock-event-${String(this.sequence).padStart(3, '0')}`,
      title: 'Sprint Planning',
      start,
      end: new Date(start.getTime() + 30 * 60_000),
      joinUrl: 'https://meet.google.com/abc-defg-hij',
    };
  }

  private fakeToken(): OAuthToken {
    return {
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token',
      expiresAt: new Date(Date.now() + 3_600_000),
      scope: 'https://www.googleapis.com/auth/calendar.events.readonly',
    };
  }
}
