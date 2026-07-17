import { describe, it, expect } from 'vitest';
import { DRAGON } from './dragon.ts';
import { KNIGHT } from './knight.ts';
import { CHARACTERS, CharacterRotation, createCharacterRotation } from './roster.ts';

describe('CharacterRotation', () => {
  it('cycles through the full cast in order and wraps around', () => {
    const rotation = createCharacterRotation();
    expect(rotation.current).toBe(KNIGHT);
    expect(rotation.advance()).toBe(KNIGHT); // first alert: still the knight
    expect(rotation.current).toBe(DRAGON); // …but the dragon is now on deck
    expect(rotation.advance()).toBe(DRAGON);
    expect(rotation.advance()).toBe(KNIGHT); // wrapped
  });

  it('advance returns the character that current promised', () => {
    // bootstrap() mounts `current` at startup; the first present() must bring
    // that same character (not skip ahead), or the stage would flicker-swap.
    const rotation = new CharacterRotation([DRAGON, KNIGHT]);
    const promised = rotation.current;
    expect(rotation.advance()).toBe(promised);
  });

  it('rejects an empty roster', () => {
    expect(() => new CharacterRotation([])).toThrow();
  });

  it('registers every cast member exactly once', () => {
    // A duplicate entry would make the "rotation" show the same mascot twice.
    expect(new Set(CHARACTERS).size).toBe(CHARACTERS.length);
  });
});
