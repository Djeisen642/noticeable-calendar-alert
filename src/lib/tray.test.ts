import { describe, it, expect } from 'vitest';
import { authMenuLabel, authToggleAction, SIGN_IN_LABEL, SIGN_OUT_LABEL } from './tray.ts';

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
