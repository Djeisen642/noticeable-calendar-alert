/**
 * The cast roster and rotation policy.
 *
 * This is the only module that knows every concrete character; consumers get
 * a `CharacterRotation` from the factory and depend on the `Character`
 * abstraction alone. Adding a mascot = create its module, add it to
 * `CHARACTERS` — nothing else changes.
 */

import type { Character } from './character.ts';
import { DRAGON } from './dragon.ts';
import { KNIGHT } from './knight.ts';

/** The cast, in the order alerts cycle through it. */
export const CHARACTERS: readonly Character[] = [KNIGHT];

/**
 * Benched cast members: fully drawn, doc'd, and CSS-wired, but excluded from
 * the rotation (the dragon awaits an art revisit). The guards in
 * characters.test.ts still cover them so they can return without rot.
 */
export const BENCHED_CHARACTERS: readonly Character[] = [DRAGON];

/**
 * Round-robin over the cast: `current` is who's up next (mounted at startup so
 * the stage is never empty), `advance()` hands them over and moves the
 * pointer, so each presentation brings the next character on stage.
 */
export class CharacterRotation {
  private readonly roster: readonly Character[];
  private index = 0;

  constructor(roster: readonly Character[]) {
    if (roster.length === 0) throw new Error('CharacterRotation needs at least one character');
    this.roster = roster;
  }

  get current(): Character {
    return this.roster[this.index];
  }

  advance(): Character {
    const next = this.current;
    this.index = (this.index + 1) % this.roster.length;
    return next;
  }
}

/** The default rotation over the full cast (mirrors createCalendarSync). */
export function createCharacterRotation(): CharacterRotation {
  return new CharacterRotation(CHARACTERS);
}
