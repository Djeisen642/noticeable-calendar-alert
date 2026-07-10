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
});

describe('mountCharacter', () => {
  it('injects the SVG into the host element', () => {
    // A minimal stand-in is enough: mountCharacter only assigns innerHTML.
    const host = { innerHTML: '' } as HTMLElement;
    mountCharacter(host);
    expect(host.innerHTML).toBe(CHARACTER_SVG);
  });
});
