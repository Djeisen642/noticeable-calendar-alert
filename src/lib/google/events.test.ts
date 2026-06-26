import { describe, it, expect } from 'vitest';
import { buildEventsListUrl, parseEventsResponse } from './events.ts';

const NOW = new Date('2026-06-26T09:00:00.000Z');

describe('buildEventsListUrl', () => {
  it('encodes the lookahead window and expansion params', () => {
    const url = new URL(buildEventsListUrl(NOW, 5 * 60_000));
    const p = url.searchParams;
    expect(url.pathname).toContain('/calendars/primary/events');
    expect(p.get('timeMin')).toBe('2026-06-26T09:00:00.000Z');
    expect(p.get('timeMax')).toBe('2026-06-26T09:05:00.000Z');
    expect(p.get('singleEvents')).toBe('true');
    expect(p.get('orderBy')).toBe('startTime');
  });
});

describe('parseEventsResponse', () => {
  it('returns [] for malformed payloads', () => {
    expect(parseEventsResponse(null)).toEqual([]);
    expect(parseEventsResponse({})).toEqual([]);
    expect(parseEventsResponse({ items: 'nope' })).toEqual([]);
  });

  it('normalizes a timed event and extracts the Meet link from conferenceData', () => {
    const events = parseEventsResponse({
      items: [
        {
          id: 'evt-1',
          status: 'confirmed',
          summary: 'Sprint Planning',
          start: { dateTime: '2026-06-26T09:05:00Z' },
          end: { dateTime: '2026-06-26T09:35:00Z' },
          conferenceData: {
            entryPoints: [
              { entryPointType: 'phone', uri: 'tel:+1-555-0100' },
              { entryPointType: 'video', uri: 'https://meet.google.com/abc-defg-hij' },
            ],
          },
        },
      ],
    });

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      id: 'evt-1',
      title: 'Sprint Planning',
      joinUrl: 'https://meet.google.com/abc-defg-hij',
    });
    expect(events[0]?.start.toISOString()).toBe('2026-06-26T09:05:00.000Z');
  });

  it('drops a join URL whose host is not a known conferencing provider', () => {
    const [event] = parseEventsResponse({
      items: [
        {
          id: 'evil',
          summary: 'Totally Real Meeting',
          start: { dateTime: '2026-06-26T09:05:00Z' },
          conferenceData: {
            entryPoints: [{ entryPointType: 'video', uri: 'https://evil.example/login' }],
          },
          hangoutLink: 'https://evil.example/login',
        },
      ],
    });
    // The event still surfaces, but with no clickable (phishing) Join button.
    expect(event?.id).toBe('evil');
    expect(event?.joinUrl).toBeNull();
  });

  it('falls back to hangoutLink when there is no conferenceData', () => {
    const [event] = parseEventsResponse({
      items: [
        {
          id: 'evt-2',
          summary: 'Standup',
          start: { dateTime: '2026-06-26T09:10:00Z' },
          end: { dateTime: '2026-06-26T09:20:00Z' },
          hangoutLink: 'https://meet.google.com/zzz-zzzz-zzz',
        },
      ],
    });
    expect(event?.joinUrl).toBe('https://meet.google.com/zzz-zzzz-zzz');
  });

  it('skips cancelled and all-day events, and defaults a missing title', () => {
    const events = parseEventsResponse({
      items: [
        { id: 'cancelled', status: 'cancelled', start: { dateTime: '2026-06-26T09:05:00Z' } },
        { id: 'all-day', start: { date: '2026-06-26' }, end: { date: '2026-06-27' } },
        { id: 'no-title', start: { dateTime: '2026-06-26T09:30:00Z' } },
      ],
    });
    expect(events.map((e) => e.id)).toEqual(['no-title']);
    expect(events[0]?.title).toBe('(no title)');
    expect(events[0]?.joinUrl).toBeNull();
  });

  it('sorts events soonest-first regardless of input order', () => {
    const events = parseEventsResponse({
      items: [
        { id: 'later', start: { dateTime: '2026-06-26T09:30:00Z' } },
        { id: 'sooner', start: { dateTime: '2026-06-26T09:05:00Z' } },
      ],
    });
    expect(events.map((e) => e.id)).toEqual(['sooner', 'later']);
  });

  it('defaults the end to 30 minutes after start when end is missing', () => {
    const [event] = parseEventsResponse({
      items: [{ id: 'no-end', start: { dateTime: '2026-06-26T09:05:00Z' } }],
    });
    expect(event?.end.toISOString()).toBe('2026-06-26T09:35:00.000Z');
  });
});
