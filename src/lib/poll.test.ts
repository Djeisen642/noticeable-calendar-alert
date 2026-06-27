import { describe, it, expect } from 'vitest';
import {
  nextFetchDelayMs,
  POLL_NEAR_MS,
  POLL_SOON_MS,
  POLL_IDLE_MS,
  POLL_NEAR_THRESHOLD_MS,
  POLL_SOON_THRESHOLD_MS,
} from './poll.ts';

const now = new Date('2026-06-27T10:00:00.000Z');
const inMs = (ms: number): { start: Date } => ({ start: new Date(now.getTime() + ms) });

describe('nextFetchDelayMs', () => {
  it('idles when there is no upcoming meeting', () => {
    expect(nextFetchDelayMs(null, now)).toBe(POLL_IDLE_MS);
  });

  it('polls fast for an imminent meeting', () => {
    expect(nextFetchDelayMs(inMs(2 * 60_000), now)).toBe(POLL_NEAR_MS);
  });

  it('keeps the fast cadence for a meeting already in progress', () => {
    expect(nextFetchDelayMs(inMs(-5 * 60_000), now)).toBe(POLL_NEAR_MS);
  });

  it('polls at a medium cadence within the hour', () => {
    expect(nextFetchDelayMs(inMs(30 * 60_000), now)).toBe(POLL_SOON_MS);
  });

  it('idles when the next meeting is far away', () => {
    expect(nextFetchDelayMs(inMs(3 * 60 * 60_000), now)).toBe(POLL_IDLE_MS);
  });

  it('treats the thresholds as inclusive boundaries', () => {
    expect(nextFetchDelayMs(inMs(POLL_NEAR_THRESHOLD_MS), now)).toBe(POLL_NEAR_MS);
    expect(nextFetchDelayMs(inMs(POLL_SOON_THRESHOLD_MS), now)).toBe(POLL_SOON_MS);
    expect(nextFetchDelayMs(inMs(POLL_SOON_THRESHOLD_MS + 1), now)).toBe(POLL_IDLE_MS);
  });
});
