import { describe, it, expect } from 'vitest';
import { generateCodeVerifier, codeChallengeS256, generateState } from './pkce.ts';

describe('generateCodeVerifier', () => {
  it('produces a verifier of the requested length using the unreserved charset', () => {
    const verifier = generateCodeVerifier(64);
    expect(verifier).toHaveLength(64);
    expect(verifier).toMatch(/^[A-Za-z0-9\-._~]+$/);
  });

  it('is non-deterministic between calls', () => {
    expect(generateCodeVerifier()).not.toBe(generateCodeVerifier());
  });

  it.each([42, 129])('rejects an out-of-range length (%i)', (len) => {
    expect(() => generateCodeVerifier(len)).toThrow(RangeError);
  });
});

describe('codeChallengeS256', () => {
  it('matches the RFC 7636 Appendix B test vector', async () => {
    // The canonical verifier → challenge pair from the spec.
    const verifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
    const challenge = await codeChallengeS256(verifier);
    expect(challenge).toBe('E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM');
  });

  it('emits base64url (no +, /, or = padding)', async () => {
    const challenge = await codeChallengeS256(generateCodeVerifier());
    expect(challenge).toMatch(/^[A-Za-z0-9\-_]+$/);
  });
});

describe('generateState', () => {
  it('returns a non-empty base64url string', () => {
    expect(generateState()).toMatch(/^[A-Za-z0-9\-_]+$/);
  });
});
