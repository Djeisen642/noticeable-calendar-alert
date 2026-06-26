import { describe, it, expect } from 'vitest';
import { safeExternalUrl } from './url.ts';

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
