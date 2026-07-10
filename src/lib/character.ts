/**
 * The vector character, as a single self-contained module.
 *
 * Keeping the SVG here (instead of inlined in `index.html`) gives the mascot
 * one obvious home: every animatable part has a stable id that `styles.css`
 * targets, and `character.test.ts` guards those ids so a redesign can't
 * silently break the choreography.
 *
 * Animatable parts (each id is a CSS animation hook — see styles.css):
 *   #leg-left / #leg-right — alternate stepping while walking
 *   #arm-rest             — the tucked arm; swings counter to the legs
 *   #arm-wave             — the greeting arm; tucked down while walking,
 *                           raised + waved on arrival, lowered while presenting
 *   #body                 — breathes gently while presenting
 *   #head                 — subtle sway while presenting
 *   #eyes                 — periodic blink whenever the character is on stage
 *   #antenna              — bobbing antenna, the character's signature flourish
 */

/** Every part id the CSS choreography depends on. */
export const CHARACTER_PART_IDS = [
  'leg-left',
  'leg-right',
  'arm-rest',
  'arm-wave',
  'body',
  'head',
  'eyes',
  'antenna',
] as const;

export type CharacterPartId = (typeof CHARACTER_PART_IDS)[number];

/**
 * Static, trusted markup — no user or calendar data ever flows through here.
 * Draw order (back to front): shadow, legs, tucked arm, body, waving arm, head.
 */
export const CHARACTER_SVG = `<svg viewBox="0 0 140 190" width="140" height="190" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bodyFill" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#6f9bf2" />
      <stop offset="1" stop-color="#4f7ce0" />
    </linearGradient>
    <linearGradient id="antennaBallFill" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffd166" />
      <stop offset="1" stop-color="#ffb347" />
    </linearGradient>
  </defs>

  <!-- Ground shadow -->
  <ellipse cx="68" cy="183" rx="32" ry="6" fill="#000000" opacity="0.16" />

  <!-- Legs + shoes (separate groups so they can step in counter-phase) -->
  <g id="leg-left">
    <rect x="54" y="146" width="12" height="30" rx="6" fill="#3a4668" />
    <ellipse cx="58" cy="177" rx="11" ry="6" fill="#2b3350" />
  </g>
  <g id="leg-right">
    <rect x="70" y="146" width="12" height="30" rx="6" fill="#323c5a" />
    <ellipse cx="78" cy="177" rx="11" ry="6" fill="#2b3350" />
  </g>

  <!-- Resting arm (tucked behind the body); swings while walking -->
  <g id="arm-rest">
    <rect x="30" y="92" width="13" height="46" rx="6.5" fill="#4f7ce0" />
    <circle cx="36.5" cy="140" r="8" fill="#ffd2a6" />
  </g>

  <!-- Body: gradient torso, soft sheen, and a little chest badge -->
  <g id="body">
    <rect x="38" y="84" width="62" height="74" rx="26" fill="url(#bodyFill)" />
    <ellipse cx="69" cy="122" rx="18" ry="22" fill="#ffffff" opacity="0.08" />
    <circle cx="69" cy="112" r="6.5" fill="#ffffff" opacity="0.85" />
    <circle cx="69" cy="112" r="3" fill="#ffb347" />
  </g>

  <!-- Greeting arm: drawn RAISED; CSS rotates it down at the shoulder while
       walking, releases it to wave on arrival, and lowers it while presenting -->
  <g id="arm-wave">
    <path
      d="M93 99 Q114 70 120 50"
      stroke="#5a86e8"
      stroke-width="13"
      stroke-linecap="round"
      fill="none"
    />
    <circle cx="121" cy="47" r="9.5" fill="#ffd2a6" />
  </g>

  <!-- Head: face, antenna, brows, blinkable eyes, cheeks, smile -->
  <g id="head">
    <circle cx="69" cy="50" r="32" fill="#ffd2a6" />
    <g id="antenna">
      <line x1="69" y1="20" x2="69" y2="8" stroke="#e8a06c" stroke-width="3" stroke-linecap="round" />
      <circle cx="69" cy="6" r="5" fill="url(#antennaBallFill)" />
      <circle cx="67.4" cy="4.4" r="1.4" fill="#ffffff" opacity="0.9" />
    </g>
    <!-- Eyebrows -->
    <path d="M53 36 Q60 31.5 66 35.5" stroke="#2b2b3a" stroke-width="2.6" fill="none" stroke-linecap="round" opacity="0.75" />
    <path d="M74 35.5 Q80 31.5 87 36" stroke="#2b2b3a" stroke-width="2.6" fill="none" stroke-linecap="round" opacity="0.75" />
    <!-- Eyes + sparkle (grouped so a blink scales them together) -->
    <g id="eyes">
      <circle cx="60" cy="46" r="4.5" fill="#2b2b3a" />
      <circle cx="80" cy="46" r="4.5" fill="#2b2b3a" />
      <circle cx="61.6" cy="44.4" r="1.5" fill="#ffffff" />
      <circle cx="81.6" cy="44.4" r="1.5" fill="#ffffff" />
    </g>
    <!-- Cheeks -->
    <circle cx="54" cy="58" r="6" fill="#ff9d9d" opacity="0.5" />
    <circle cx="84" cy="58" r="6" fill="#ff9d9d" opacity="0.5" />
    <!-- Smile -->
    <path
      d="M58 60 Q69 70 80 60"
      stroke="#2b2b3a"
      stroke-width="3.2"
      fill="none"
      stroke-linecap="round"
    />
  </g>
</svg>`;

/**
 * Inject the character into its host element.
 *
 * `innerHTML` is safe here because `CHARACTER_SVG` is a static compile-time
 * constant — untrusted calendar data is rendered elsewhere via `textContent`
 * only (see `OverlayAnimator.renderBubble`).
 */
export function mountCharacter(host: HTMLElement): void {
  host.innerHTML = CHARACTER_SVG;
}
