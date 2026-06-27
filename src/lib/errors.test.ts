import { describe, it, expect } from 'vitest';
import { describeError } from './errors.ts';

describe('describeError', () => {
  it('uses an Error message', () => {
    expect(describeError(new Error('boom'))).toBe('boom');
  });

  it('falls back to the Error name when the message is empty', () => {
    expect(describeError(new TypeError(''))).toBe('TypeError');
  });

  it('passes a thrown string through unchanged', () => {
    expect(describeError('plain failure')).toBe('plain failure');
  });

  it('describes null/undefined', () => {
    expect(describeError(null)).toBe('Unknown error');
    expect(describeError(undefined)).toBe('Unknown error');
  });

  it('JSON-stringifies an arbitrary object (e.g. a rejected invoke)', () => {
    expect(describeError({ code: 401, error: 'invalid_grant' })).toBe(
      '{"code":401,"error":"invalid_grant"}',
    );
  });
});
