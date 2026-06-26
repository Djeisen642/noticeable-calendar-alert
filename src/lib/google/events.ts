/**
 * Pure mapping from the Google Calendar v3 `events.list` response to our
 * normalized `CalendarEvent[]`. Parses `unknown` JSON defensively (no `any`),
 * because the response is untrusted network input.
 */

import type { CalendarEvent } from '../calendar.ts';
import { safeExternalUrl } from '../url.ts';

const EVENTS_ENDPOINT = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';
const DEFAULT_MEETING_MS = 30 * 60_000;

/** Build the `events.list` request URL for the lookahead window. */
export function buildEventsListUrl(now: Date, withinMs: number, maxResults = 10): string {
  const query = new URLSearchParams({
    timeMin: now.toISOString(),
    timeMax: new Date(now.getTime() + withinMs).toISOString(),
    singleEvents: 'true', // expand recurring events into instances
    orderBy: 'startTime',
    maxResults: String(maxResults),
  });
  return `${EVENTS_ENDPOINT}?${query.toString()}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

/** Pull a join URL from conferenceData entry points, falling back to hangoutLink. */
function extractJoinUrl(item: Record<string, unknown>): string | null {
  const conference = item.conferenceData;
  if (isRecord(conference) && Array.isArray(conference.entryPoints)) {
    for (const entry of conference.entryPoints) {
      if (isRecord(entry) && entry.entryPointType === 'video') {
        const safe = safeExternalUrl(asString(entry.uri));
        if (safe) return safe;
      }
    }
  }
  return safeExternalUrl(asString(item.hangoutLink));
}

/** Resolve an event's start/end as timed instants, or `null` for all-day. */
function timedRange(item: Record<string, unknown>): { start: Date; end: Date } | null {
  const start = isRecord(item.start) ? asString(item.start.dateTime) : undefined;
  if (!start) {
    return null; // all-day events (date only) don't trigger meeting alerts
  }
  const startDate = new Date(start);
  if (Number.isNaN(startDate.getTime())) {
    return null;
  }

  const end = isRecord(item.end) ? asString(item.end.dateTime) : undefined;
  const endDate = end ? new Date(end) : new Date(startDate.getTime() + DEFAULT_MEETING_MS);
  return { start: startDate, end: endDate };
}

/**
 * Map a raw `events.list` payload to normalized events, dropping cancelled and
 * all-day entries, sorted soonest-first.
 */
export function parseEventsResponse(payload: unknown, _now: Date = new Date()): CalendarEvent[] {
  if (!isRecord(payload) || !Array.isArray(payload.items)) {
    return [];
  }

  const events: CalendarEvent[] = [];
  for (const raw of payload.items) {
    if (!isRecord(raw) || raw.status === 'cancelled') {
      continue;
    }
    const range = timedRange(raw);
    const id = asString(raw.id);
    if (range === null || id === undefined) {
      continue;
    }
    events.push({
      id,
      title: asString(raw.summary) ?? '(no title)',
      start: range.start,
      end: range.end,
      joinUrl: extractJoinUrl(raw),
    });
  }

  events.sort((a, b) => a.start.getTime() - b.start.getTime());
  return events;
}
