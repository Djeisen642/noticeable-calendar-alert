import { describe, it, expect } from 'vitest';
import { safeExternalUrl, safeJoinUrl } from './url.ts';

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
