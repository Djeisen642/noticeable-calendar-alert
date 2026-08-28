import { describe, it, expect } from 'vitest';
import { calendarDayUrl, safeEventDetailsUrl, safeExternalUrl, safeJoinUrl } from './url.ts';

describe('safeExternalUrl', () => {
  it('accepts https URLs and returns a normalized href', () => {
    expect(safeExternalUrl('https://meet.google.com/abc-defg-hij')).toBe(
      'https://meet.google.com/abc-defg-hij',
    );
  });

  it('accepts http URLs', () => {
    expect(safeExternalUrl('http://example.com/join')).toBe('http://example.com/join');
  });

  it.each([
    ['javascript:', 'javascript:alert(1)'],
    ['file:', 'file:///etc/passwd'],
    ['data:', 'data:text/html,<script>alert(1)</script>'],
    ['custom scheme', 'zoommtg://zoom.us/join?confno=123'],
  ])('rejects a %s URL', (_label, malicious) => {
    expect(safeExternalUrl(malicious)).toBeNull();
  });

  it.each([
    ['empty string', ''],
    ['relative path', '/join/123'],
    ['garbage', 'not a url'],
  ])('rejects %s', (_label, value) => {
    expect(safeExternalUrl(value)).toBeNull();
  });

  it('rejects null and undefined', () => {
    expect(safeExternalUrl(null)).toBeNull();
    expect(safeExternalUrl(undefined)).toBeNull();
  });
});

describe('safeJoinUrl', () => {
  it.each([
    'https://meet.google.com/abc-defg-hij',
    'https://us02web.zoom.us/j/123456789',
    'https://teams.microsoft.com/l/meetup-join/xyz',
    'https://acme.webex.com/meet/room',
    'https://meet.jit.si/SomeRoom',
  ])('accepts a known conferencing host: %s', (url) => {
    expect(safeJoinUrl(url)).toBe(url);
  });

  it.each([
    ['unknown host', 'https://evil.example/login'],
    ['google phishing lookalike', 'https://accounts-google.evil.com/login'],
    // Suffix-spoof: host ENDS with the brand but is a different registrable domain.
    ['suffix spoof', 'https://zoom.us.evil.com/join'],
    ['bare http to unknown host', 'http://example.com/join'],
  ])('rejects %s', (_label, url) => {
    expect(safeJoinUrl(url)).toBeNull();
  });

  it('still rejects non-http(s) schemes even on an allowed host', () => {
    expect(safeJoinUrl('javascript:alert(1)//meet.google.com')).toBeNull();
  });

  it('rejects null/undefined/garbage', () => {
    expect(safeJoinUrl(null)).toBeNull();
    expect(safeJoinUrl(undefined)).toBeNull();
    expect(safeJoinUrl('not a url')).toBeNull();
  });
});

describe('safeEventDetailsUrl', () => {
  it.each([
    'https://www.google.com/calendar/event?eid=abc123',
    'https://calendar.google.com/calendar/event?eid=abc123',
    'https://calendar.google.com/calendar/u/0/r/eventedit/abc123',
  ])('accepts a Google Calendar event page: %s', (url) => {
    expect(safeEventDetailsUrl(url)).toBe(url);
  });

  it.each([
    ['a non-Google host', 'https://evil.example/calendar/event?eid=abc'],
    ['a Google lookalike', 'https://calendar.google.com.evil.com/calendar/event'],
    // htmlLink is attacker-influenced too, so a Google host is not enough on
    // its own — the path must be the calendar app.
    ['a non-calendar Google path', 'https://www.google.com/url?q=https://evil.example'],
    ['a path that merely starts with the word', 'https://www.google.com/calendarish/event'],
    ['plain http', 'http://calendar.google.com/calendar/event?eid=abc'],
  ])('rejects %s', (_label, url) => {
    expect(safeEventDetailsUrl(url)).toBeNull();
  });

  it('rejects null/undefined/garbage', () => {
    expect(safeEventDetailsUrl(null)).toBeNull();
    expect(safeEventDetailsUrl(undefined)).toBeNull();
    expect(safeEventDetailsUrl('not a url')).toBeNull();
  });
});

describe('calendarDayUrl', () => {
  it('builds the Google Calendar day view for the date', () => {
    expect(calendarDayUrl(new Date(2026, 5, 26, 9, 30))).toBe(
      'https://calendar.google.com/calendar/r/day/2026/6/26',
    );
  });

  it('uses local date parts, so a late-evening clash links to its own day', () => {
    // Built from UTC parts instead, a 23:30 local meeting could link to
    // tomorrow's calendar — the one day that does not contain it.
    const late = new Date(2026, 0, 1, 23, 30);
    expect(calendarDayUrl(late)).toBe('https://calendar.google.com/calendar/r/day/2026/1/1');
  });

  it('produces a URL its own details guard accepts', () => {
    const url = calendarDayUrl(new Date(2026, 5, 26));
    expect(safeEventDetailsUrl(url)).toBe(url);
  });
});
