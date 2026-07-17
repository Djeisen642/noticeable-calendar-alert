/**
 * The character contract — the one abstraction every mascot implements and
 * the only thing consumers (the animator wiring in main.ts, the roster, the
 * CSS choreography) are allowed to depend on.
 *
 * Single responsibility: this file defines WHAT a character is; each concrete
 * mascot lives in its own sibling module (knight.ts, dragon.ts) and the
 * roster/rotation policy lives in roster.ts. Adding a cast member means adding
 * a file and registering it in the roster — no consumer changes (open/closed).
 *
 * Every animatable part has a stable id that `styles.css` targets, and
 * `characters.test.ts` guards those ids in both directions (each character
 * defines its ids exactly once; every id selector in styles.css names a part
 * some character declares) so a redesign can't silently break the choreography.
 */

/**
 * Ids every character MUST define — `OverlayAnimator`'s walk/wave/present
 * states depend on them:
 *   #leg-left / #leg-right — alternate stepping while walking
 *   #arm-rest             — the resting arm; sways gently while walking
 *   #arm-wave             — the greeting arm; drawn RAISED, tucked down while
 *                           walking, waved on arrival, lowered while presenting
 *   #body                 — breathes gently while presenting
 *   #head                 — subtle sway while presenting
 *   #eyes                 — periodic blink whenever the character is on stage
 *
 * Characters may declare extra parts of their own (the knight's #cape, the
 * dragon's #fire, …); the CSS rules targeting them are inert for everyone else.
 */
export const CORE_PART_IDS = [
  'leg-left',
  'leg-right',
  'arm-rest',
  'arm-wave',
  'body',
  'head',
  'eyes',
] as const;

/** A member of the rotating cast. */
export interface Character {
  /** Stable id; stamped on the host as `data-character` for CSS scoping. */
  readonly id: string;
  /** Every part id this character's SVG declares (exactly once each). */
  readonly partIds: readonly string[];
  /** Static, trusted markup — no user or calendar data ever flows through. */
  readonly svg: string;
}

/**
 * Inject a character into its host element and stamp `data-character` so
 * styles.css can scope per-character rules (e.g. the knight's sword-arm pivot).
 *
 * `innerHTML` is safe here because every `Character.svg` is a static
 * compile-time constant — untrusted calendar data is rendered elsewhere via
 * `textContent` only (see `OverlayAnimator.renderBubble`).
 */
export function mountCharacter(host: HTMLElement, character: Character): void {
  host.innerHTML = character.svg;
  host.dataset.character = character.id;
}
