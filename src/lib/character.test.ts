import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import {
  CHARACTERS,
  CharacterRotation,
  CORE_PART_IDS,
  DRAGON,
  KNIGHT,
  mountCharacter,
} from './character.ts';

describe.each(CHARACTERS.map((character) => [character.id, character] as const))(
  'character %s',
  (_id, character) => {
    it('defines every animatable part id exactly once', () => {
      // styles.css keys its walk/wave/blink/breathe choreography off these ids;
      // a missing or duplicated id silently breaks an animation with no error.
      for (const id of character.partIds) {
        const occurrences = character.svg.split(`id="${id}"`).length - 1;
        expect(occurrences, `expected exactly one id="${id}"`).toBe(1);
      }
    });

    it('declares the full core choreography contract', () => {
      // OverlayAnimator's walk/wave/present states assume these exist; a cast
      // member missing one would go rigid in that state with no error.
      for (const id of CORE_PART_IDS) {
        expect(character.partIds, `partIds must include core id "${id}"`).toContain(id);
      }
    });

    it('keeps the 140x190 viewBox the overlay layout is sized around', () => {
      // .character in styles.css and the overlay window sizing assume this box.
      expect(character.svg).toContain('viewBox="0 0 140 190"');
    });

    it('contains no scripts, event handlers, or links (defense in depth)', () => {
      // Each SVG is a trusted constant injected via innerHTML; keep it inert so
      // that stays true even after future redesigns.
      expect(character.svg).not.toMatch(/<script/i);
      expect(character.svg).not.toMatch(/\son[a-z]+\s*=/i);
      expect(character.svg).not.toMatch(/href/i);
    });

    it(`matches the committed README asset docs/${character.id}.svg`, () => {
      // The README embeds the cast from docs/<id>.svg. Guard against an asset
      // drifting from the real character: after editing a character's svg,
      // regenerate the file (write character.svg + '\n' to docs/<id>.svg).
      const asset = readFileSync(
        new URL(`../../docs/${character.id}.svg`, import.meta.url),
        'utf8',
      );
      expect(asset).toBe(`${character.svg}\n`);
    });
  },
);

describe('styles.css part-id selectors', () => {
  it('only reference parts some character actually declares', () => {
    // Close the loop from the other direction: a choreography rule targeting a
    // renamed/removed part would silently do nothing. Id selectors appear as
    // `#leg-left,` / `#cape {`; hex colors never match (a letter run in a hex
    // color is always followed by a hex digit or punctuation, not `\s,{`).
    const css = readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
    const declared = new Set<string>(CHARACTERS.flatMap((character) => character.partIds));
    for (const [, id] of css.matchAll(/#([a-z][a-z-]*)(?=[\s,{])/g)) {
      expect(declared.has(id), `styles.css targets #${id}, declared by no character`).toBe(true);
    }
  });
});

describe('CharacterRotation', () => {
  it('cycles through the cast in order and wraps around', () => {
    const rotation = new CharacterRotation();
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
});

describe('mountCharacter', () => {
  it('injects the SVG and stamps data-character for CSS scoping', () => {
    // A minimal stand-in is enough: mountCharacter assigns innerHTML + dataset.
    const host = { innerHTML: '', dataset: {} } as unknown as HTMLElement;
    mountCharacter(host, DRAGON);
    expect(host.innerHTML).toBe(DRAGON.svg);
    expect(host.dataset.character).toBe('dragon');
  });
});
