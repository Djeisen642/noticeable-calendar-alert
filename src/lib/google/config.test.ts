import { describe, expect, it } from 'vitest';

import { MockCalendarSync } from '../calendar.ts';
import {
  createCalendarSync,
  googleConfigFromEnv,
  UnconfiguredCalendarSync,
  UNCONFIGURED_MESSAGE,
} from './config.ts';
import { GoogleCalendarSync } from './google-calendar.ts';
import { CALENDAR_READONLY_SCOPE } from './oauth.ts';

const FULL_ENV = {
  VITE_GOOGLE_CLIENT_ID: 'id.apps.googleusercontent.com',
  VITE_GOOGLE_CLIENT_SECRET: 'secret',
};

describe('googleConfigFromEnv', () => {
  it('returns null when nothing is configured', () => {
    expect(googleConfigFromEnv({})).toBeNull();
  });

  it('returns null when either credential is missing', () => {
    expect(googleConfigFromEnv({ VITE_GOOGLE_CLIENT_ID: 'id' })).toBeNull();
    expect(googleConfigFromEnv({ VITE_GOOGLE_CLIENT_SECRET: 'secret' })).toBeNull();
  });

  it('treats whitespace-only credentials as unconfigured', () => {
    expect(
      googleConfigFromEnv({ VITE_GOOGLE_CLIENT_ID: '  ', VITE_GOOGLE_CLIENT_SECRET: 'secret' }),
    ).toBeNull();
  });

  it('builds a config with the default loopback port and readonly scope', () => {
    expect(googleConfigFromEnv(FULL_ENV)).toEqual({
      clientId: 'id.apps.googleusercontent.com',
      clientSecret: 'secret',
      redirectUri: 'http://127.0.0.1:1421',
      scopes: [CALENDAR_READONLY_SCOPE],
    });
  });

  it('trims stray whitespace from .env values', () => {
    const cfg = googleConfigFromEnv({
      VITE_GOOGLE_CLIENT_ID: ' id.apps.googleusercontent.com ',
      VITE_GOOGLE_CLIENT_SECRET: 'secret\n',
    });
    expect(cfg?.clientId).toBe('id.apps.googleusercontent.com');
    expect(cfg?.clientSecret).toBe('secret');
  });

  it('honors a valid custom redirect port', () => {
    const cfg = googleConfigFromEnv({ ...FULL_ENV, VITE_OAUTH_REDIRECT_PORT: '9000' });
    expect(cfg?.redirectUri).toBe('http://127.0.0.1:9000');
  });

  it.each(['', 'abc', '0', '-1', '70000', '14.21'])(
    'falls back to the default port for invalid value %j',
    (port) => {
      const cfg = googleConfigFromEnv({ ...FULL_ENV, VITE_OAUTH_REDIRECT_PORT: port });
      expect(cfg?.redirectUri).toBe('http://127.0.0.1:1421');
    },
  );
});

describe('createCalendarSync', () => {
  const cfg = googleConfigFromEnv(FULL_ENV);

  it('uses the mock in a plain browser regardless of credentials', () => {
    expect(createCalendarSync(null, false)).toBeInstanceOf(MockCalendarSync);
    expect(createCalendarSync(cfg, false)).toBeInstanceOf(MockCalendarSync);
  });

  it('uses the real Google sync in the desktop app when configured', () => {
    expect(createCalendarSync(cfg, true)).toBeInstanceOf(GoogleCalendarSync);
  });

  it('refuses to fake sign-in in the desktop app without credentials', () => {
    expect(createCalendarSync(null, true)).toBeInstanceOf(UnconfiguredCalendarSync);
  });
});

describe('UnconfiguredCalendarSync', () => {
  const sync = new UnconfiguredCalendarSync();

  it('rejects sign-in with actionable setup instructions', async () => {
    await expect(sync.authenticate()).rejects.toThrow(UNCONFIGURED_MESSAGE);
    expect(UNCONFIGURED_MESSAGE).toContain('VITE_GOOGLE_CLIENT_ID');
    expect(UNCONFIGURED_MESSAGE).toContain('.env');
  });

  it('reports signed-out and yields no events', async () => {
    await expect(sync.isSignedIn()).resolves.toBe(false);
    await expect(sync.getUpcomingEvents(60_000)).resolves.toEqual([]);
  });
});
