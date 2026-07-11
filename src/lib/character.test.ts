import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import { CHARACTER_PART_IDS, CHARACTER_SVG, mountCharacter } from './character.ts';

describe('CHARACTER_SVG', () => {
  it('defines every animatable part id exactly once', () => {
    // styles.css keys its walk/wave/blink/breathe choreography off these ids;
    // a missing or duplicated id silently breaks an animation with no error.
    for (const id of CHARACTER_PART_IDS) {
      const occurrences = CHARACTER_SVG.split(`id="${id}"`).length - 1;
      expect(occurrences, `expected exactly one id="${id}"`).toBe(1);
    }
  });

  it('keeps the 140x190 viewBox the overlay layout is sized around', () => {
    // .character in styles.css and the overlay window sizing assume this box.
    expect(CHARACTER_SVG).toContain('viewBox="0 0 140 190"');
  });

  it('contains no scripts, event handlers, or links (defense in depth)', () => {
    // The SVG is a trusted constant injected via innerHTML; keep it inert so
    // that stays true even after future redesigns.
    expect(CHARACTER_SVG).not.toMatch(/<script/i);
    expect(CHARACTER_SVG).not.toMatch(/\son[a-z]+\s*=/i);
    expect(CHARACTER_SVG).not.toMatch(/href/i);
  });

  it('matches the committed README asset docs/character.svg', () => {
    // The README embeds the mascot from docs/character.svg. Guard against the
    // asset drifting from the real character: after editing CHARACTER_SVG,
    // regenerate the file (write CHARACTER_SVG + '\n' to docs/character.svg).
    const asset = readFileSync(new URL('../../docs/character.svg', import.meta.url), 'utf8');
    expect(asset).toBe(`${CHARACTER_SVG}\n`);
  });
});

describe('styles.css part-id selectors', () => {
  it('only reference parts the character actually declares', () => {
    // Close the loop from the other direction: a choreography rule targeting a
    // renamed/removed part would silently do nothing. Id selectors appear as
    // `#leg-left,` / `#cape {`; hex colors never match (a letter run in a hex
    // color is always followed by a hex digit or punctuation, not `\s,{`).
    const css = readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
    const declared = new Set<string>(CHARACTER_PART_IDS);
    for (const [, id] of css.matchAll(/#([a-z][a-z-]*)(?=[\s,{])/g)) {
      expect(declared.has(id), `styles.css targets #${id}, not in CHARACTER_PART_IDS`).toBe(true);
    }
  });
});

describe('mountCharacter', () => {
  it('injects the SVG into the host element', () => {
    // A minimal stand-in is enough: mountCharacter only assigns innerHTML.
    const host = { innerHTML: '' } as HTMLElement;
    mountCharacter(host);
    expect(host.innerHTML).toBe(CHARACTER_SVG);
  });
});
