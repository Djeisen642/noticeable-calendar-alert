import { describe, it, expect } from 'vitest';
import { DRAGON } from './dragon.ts';
import { KNIGHT } from './knight.ts';
import {
  BENCHED_CHARACTERS,
  CHARACTERS,
  CharacterRotation,
  createCharacterRotation,
} from './roster.ts';

describe('CharacterRotation', () => {
  it('cycles through the full cast in order and wraps around', () => {
    const rotation = createCharacterRotation();
    for (const expected of CHARACTERS) {
      expect(rotation.advance()).toBe(expected);
    }
    expect(rotation.advance()).toBe(CHARACTERS[0]); // wrapped
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

  it('registers every cast member exactly once, active or benched', () => {
    // A duplicate entry would make the "rotation" show the same mascot twice;
    // a character both active and benched would be contradictory.
    const all = [...CHARACTERS, ...BENCHED_CHARACTERS];
    expect(new Set(all).size).toBe(all.length);
  });

  it('keeps benched characters out of the default rotation', () => {
    for (const benched of BENCHED_CHARACTERS) {
      expect(CHARACTERS).not.toContain(benched);
    }
  });
});
