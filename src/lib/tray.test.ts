import { describe, it, expect } from 'vitest';
import {
  authMenuLabel,
  authToggleAction,
  formatTrayStatus,
  SIGN_IN_LABEL,
  SIGN_OUT_LABEL,
} from './tray.ts';

describe('authMenuLabel', () => {
  it('prompts to sign in when signed out', () => {
    expect(authMenuLabel(false)).toBe(SIGN_IN_LABEL);
  });

  it('offers sign out when signed in', () => {
    expect(authMenuLabel(true)).toBe(SIGN_OUT_LABEL);
  });
});

describe('authToggleAction', () => {
  it('signs in when signed out', () => {
    expect(authToggleAction(false)).toBe('signIn');
  });

  it('signs out when signed in', () => {
    expect(authToggleAction(true)).toBe('signOut');
  });
});

describe('formatTrayStatus', () => {
  const now = new Date('2026-06-27T10:00:00.000Z');

  it('shows a sign-in prompt when signed out', () => {
    expect(formatTrayStatus({ signedIn: false, lastSync: null, next: null, now })).toEqual({
      connection: 'Not signed in',
      meeting: 'Sign in to see meetings',
    });
  });

  it('reports "syncing" before the first fetch', () => {
    const status = formatTrayStatus({ signedIn: true, lastSync: null, next: null, now });
    expect(status.connection).toBe('Signed in · syncing…');
  });

  it('reports sync health with a coarse relative time', () => {
    const status = formatTrayStatus({
      signedIn: true,
      lastSync: { ok: true, at: new Date(now.getTime() - 2 * 60_000) },
      next: null,
      now,
    });
    expect(status.connection).toBe('Signed in · synced 2m ago');
    expect(status.meeting).toBe('No upcoming meetings');
  });

  it('surfaces a failed fetch so a silent sync error is visible', () => {
    const status = formatTrayStatus({
      signedIn: true,
      lastSync: { ok: false, at: now },
      next: null,
      now,
    });
    expect(status.connection).toBe('Signed in · sync error');
  });

  it('shows the next meeting with a countdown', () => {
    const status = formatTrayStatus({
      signedIn: true,
      lastSync: { ok: true, at: now },
      next: { title: 'Standup', start: new Date(now.getTime() + 4 * 60_000) },
      now,
    });
    expect(status.meeting).toBe('Next: Standup in 4m 00s');
  });

  it('truncates an overlong meeting title', () => {
    const status = formatTrayStatus({
      signedIn: true,
      lastSync: { ok: true, at: now },
      next: {
        title: 'Quarterly planning and roadmap review with the whole team',
        start: new Date(now.getTime() + 60_000),
      },
      now,
    });
    expect(status.meeting).toMatch(/^Next: .{31}… in /);
  });
});
