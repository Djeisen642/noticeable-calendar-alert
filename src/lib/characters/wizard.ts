/**
 * The wizard — a kindly star-mage, one hand resting on a planted oak staff
 * crowned with a glowing orb, the other raised in greeting.
 *
 * Wizard-specific animatable parts (beyond the core contract in character.ts):
 *   #hat      — the pointed, bent-tip hat; sways on stage like the knight's plume
 *   #beard    — the long white beard; drifts gently whenever on stage
 *   #orb      — the staff's crystal; pulses with arcane light on stage
 *   #sparkles — the greeting spell: a one-shot burst of stars around the raised
 *               hand while waving (the bubble is still hidden then); hidden at
 *               rest, like the dragon's #fire
 *
 * NOTE: styles.css pins two wizard pivots in view-box px (the staff arm's
 * shoulder, the sparkle burst's hand). If you move those joints here, update
 * the matching transform-origins in styles.css.
 *
 * The README embeds this character from `docs/wizard.svg`. After editing the
 * SVG, regenerate that file (its content is `WIZARD.svg` plus a trailing
 * newline) — `characters.test.ts` fails if the two drift apart.
 */

import { CORE_PART_IDS, type Character } from './character.ts';

/**
 * Draw order (back to front): shadow, legs, staff arm (staff + orb drawn
 * before the gripping hand), body (the robe), waving arm, head (face, beard,
 * nose over the mustache, eyes, brows, hat last), sparkles (top-most,
 * invisible until the greeting burst).
 *
 * The waving arm reuses the knight's shoulder anchor (a path from (93,99)
 * toward (120,50)) so the shared --arm-tuck tuck/wave choreography works
 * unchanged. Legs sit in the knight's slots (x53/x70, y146+) so the shared
 * step animation reads.
 */
const WIZARD_SVG = `<svg viewBox="0 0 140 190" width="140" height="190" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="wizRobe" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#8b7ae8" />
      <stop offset="0.55" stop-color="#6752c4" />
      <stop offset="1" stop-color="#4d3c9c" />
    </linearGradient>
    <linearGradient id="wizHat" x1="0.2" y1="0" x2="0.8" y2="1">
      <stop offset="0" stop-color="#9382ec" />
      <stop offset="1" stop-color="#5a4699" />
    </linearGradient>
    <linearGradient id="wizBeard" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffffff" />
      <stop offset="1" stop-color="#c6cddd" />
    </linearGradient>
    <linearGradient id="wizGold" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#f0c463" />
      <stop offset="1" stop-color="#c9952f" />
    </linearGradient>
    <linearGradient id="wizWood" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#9a6a3d" />
      <stop offset="1" stop-color="#6b4426" />
    </linearGradient>
    <radialGradient id="wizOrbFill">
      <stop offset="0" stop-color="#f2ffff" />
      <stop offset="0.55" stop-color="#9feaff" />
      <stop offset="1" stop-color="#4fb9e8" />
    </radialGradient>
  </defs>

  <!-- Ground shadow -->
  <ellipse cx="68" cy="183" rx="34" ry="6" fill="#000000" opacity="0.16" />

  <!-- Legs: robe-blue hose with sturdy leather boots -->
  <g id="leg-left">
    <rect x="53" y="146" width="13" height="30" rx="6.5" fill="#584da6" />
    <ellipse cx="58" cy="177" rx="11" ry="6" fill="#7a4a28" />
    <ellipse cx="56" cy="175.5" rx="6.5" ry="3.2" fill="#96603a" />
  </g>
  <g id="leg-right">
    <rect x="70" y="146" width="13" height="30" rx="6.5" fill="#4b4192" />
    <ellipse cx="78" cy="177" rx="11" ry="6" fill="#6b3f22" />
    <ellipse cx="76" cy="175.5" rx="6.5" ry="3.2" fill="#855433" />
  </g>

  <!-- Staff arm: the hand rests on an oak staff planted at his side, crowned
       by a gold collar holding the glowing orb. Staff drawn before the hand
       so the grip sits on top.
       NOTE: styles.css pins this group's swing pivot to the shoulder at
       36px 97px (view-box coords) because the staff stretches the bounding
       box. -->
  <g id="arm-rest">
    <path d="M36 98 Q28.5 97 25 102" stroke="#6752c4" stroke-width="13" stroke-linecap="round" fill="none" />
    <rect x="21.4" y="62" width="5.2" height="116" rx="2.6" fill="url(#wizWood)" />
    <line x1="23.2" y1="70" x2="23.2" y2="168" stroke="#b98b57" stroke-width="1.1" opacity="0.6" />
    <rect x="19.6" y="60" width="8.8" height="5.4" rx="2.2" fill="url(#wizGold)" />
    <g id="orb">
      <circle cx="24" cy="51" r="12" fill="#7fdcff" opacity="0.16" />
      <circle cx="24" cy="51" r="8.6" fill="#7fdcff" opacity="0.3" />
      <circle cx="24" cy="51" r="6.4" fill="url(#wizOrbFill)" />
      <circle cx="21.9" cy="48.9" r="1.7" fill="#ffffff" opacity="0.95" />
    </g>
    <circle cx="26.5" cy="98.5" r="8.2" fill="#8b7ae8" />
    <circle cx="24" cy="103" r="7" fill="#f2c39b" />
    <circle cx="24" cy="103" r="7" fill="none" stroke="#d9a173" stroke-width="1.4" />
  </g>

  <!-- Body: the long robe — flared skirt, gold sash, star-and-moon devices -->
  <g id="body">
    <path d="M44 88 Q69 78 94 88 L103 148 Q105 158 95 158 L43 158 Q33 158 35 148 Z" fill="url(#wizRobe)" />
    <path d="M46 98 Q43 124 46 146" stroke="#ffffff" stroke-width="4" stroke-linecap="round" fill="none" opacity="0.22" />
    <path d="M37 150 L101 150 Q102.8 155 98 156.5 L40 156.5 Q35.2 155 37 150 Z" fill="#3f307f" />
    <path d="M39.5 119 L98.5 119 L99.6 128 L38.4 128 Z" fill="url(#wizGold)" />
    <circle cx="69" cy="123.5" r="4.6" fill="#c9952f" />
    <circle cx="69" cy="123.5" r="2.6" fill="#f0c463" />
    <path d="M52 138 L52.9 141 L55.8 141.9 L52.9 142.8 L52 145.8 L51.1 142.8 L48.2 141.9 L51.1 141 Z" fill="#f0c463" opacity="0.9" />
    <path d="M87 133 a6.4 6.4 0 1 0 4.4 11 a5.2 5.2 0 1 1 -4.4 -11 Z" fill="#f0c463" opacity="0.9" />
  </g>

  <!-- Greeting arm: drawn RAISED, wide flared cuff at the wrist; CSS rotates
       it down at the shoulder while walking, releases it to wave on arrival,
       and lowers it while presenting -->
  <g id="arm-wave">
    <path d="M93 99 Q114 70 120 50" stroke="#6752c4" stroke-width="14" stroke-linecap="round" fill="none" />
    <path d="M111 68 Q116 58 119 52" stroke="#8b7ae8" stroke-width="14" stroke-linecap="butt" fill="none" />
    <circle cx="121" cy="47" r="7.6" fill="#f2c39b" />
    <circle cx="121" cy="47" r="7.6" fill="none" stroke="#d9a173" stroke-width="1.4" />
  </g>

  <!-- Head: kindly face, long white beard, bushy brows, and the pointed hat
       with its bent tip and gold star -->
  <g id="head">
    <circle cx="69" cy="52" r="27" fill="#f2c39b" />
    <g id="beard">
      <path d="M45 50 Q38 76 50 96 Q59 108 69 110 Q79 108 88 96 Q100 76 93 50 Q90 66 69 66 Q48 66 45 50 Z" fill="url(#wizBeard)" />
      <path d="M57 72 Q55.5 86 60 98" stroke="#aab3c8" stroke-width="1.6" stroke-linecap="round" fill="none" opacity="0.75" />
      <path d="M81 72 Q82.5 86 78 98" stroke="#aab3c8" stroke-width="1.6" stroke-linecap="round" fill="none" opacity="0.75" />
      <path d="M69 70 L69 103" stroke="#aab3c8" stroke-width="1.6" stroke-linecap="round" opacity="0.6" />
      <path d="M69 60 Q60 56.5 52 61.5 Q56 66 63 65 Q67 64 69 62 Q71 64 75 65 Q82 66 86 61.5 Q78 56.5 69 60 Z" fill="#ffffff" />
    </g>
    <ellipse cx="69" cy="57.5" rx="5" ry="4.4" fill="#e8b287" />
    <g id="eyes">
      <circle cx="58.5" cy="47" r="3.4" fill="#2e3448" />
      <circle cx="79.5" cy="47" r="3.4" fill="#2e3448" />
      <circle cx="59.6" cy="45.9" r="1.1" fill="#ffffff" />
      <circle cx="80.6" cy="45.9" r="1.1" fill="#ffffff" />
    </g>
    <path d="M52 40.5 Q58 36.5 64 39.5" stroke="#e6ebf4" stroke-width="4" stroke-linecap="round" fill="none" />
    <path d="M74 39.5 Q80 36.5 86 40.5" stroke="#e6ebf4" stroke-width="4" stroke-linecap="round" fill="none" />
    <g id="hat">
      <path d="M48 32 Q58 12 72 5 Q84 -1 93 3 Q97 5.5 92 9 Q87 6 82 11 Q76 17 79 24 Q83 29 88 32 Q69 26 48 32 Z" fill="url(#wizHat)" />
      <path d="M55 26 Q62 13 72 8" stroke="#ffffff" stroke-width="2.6" stroke-linecap="round" fill="none" opacity="0.35" />
      <path d="M68 13 L69.1 16.6 L72.7 17.7 L69.1 18.8 L68 22.4 L66.9 18.8 L63.3 17.7 L66.9 16.6 Z" fill="#f0c463" />
      <ellipse cx="69" cy="32" rx="33" ry="8.2" fill="url(#wizHat)" />
      <ellipse cx="69" cy="30.6" rx="29" ry="6.2" fill="#7d6bd6" opacity="0.5" />
    </g>
  </g>

  <!-- The greeting spell: a burst of stars around the raised hand. Hidden
       (opacity 0) until the waving one-shot animates it.
       NOTE: styles.css pins its pivot to the raised hand at 121px 47px. -->
  <g id="sparkles">
    <path d="M108 23 L109.4 27.6 L114 29 L109.4 30.4 L108 35 L106.6 30.4 L102 29 L106.6 27.6 Z" fill="#f0c463" />
    <path d="M133 35 L134.1 38.9 L138 40 L134.1 41.1 L133 45 L131.9 41.1 L128 40 L131.9 38.9 Z" fill="#ffffff" />
    <path d="M127 57.5 L128.3 61.2 L132 62.5 L128.3 63.8 L127 67.5 L125.7 63.8 L122 62.5 L125.7 61.2 Z" fill="#9feaff" />
    <path d="M111 60 L112 62.5 L114.5 63.5 L112 64.5 L111 67 L110 64.5 L107.5 63.5 L110 62.5 Z" fill="#ffffff" />
    <path d="M134 18 L134.9 20.6 L137.5 21.5 L134.9 22.4 L134 25 L133.1 22.4 L130.5 21.5 L133.1 20.6 Z" fill="#f0c463" />
    <circle cx="119" cy="19" r="1.6" fill="#ffffff" />
    <circle cx="137" cy="52" r="1.4" fill="#9feaff" />
    <circle cx="103" cy="45" r="1.5" fill="#f0c463" />
  </g>
</svg>`;

export const WIZARD: Character = {
  id: 'wizard',
  partIds: [...CORE_PART_IDS, 'hat', 'beard', 'orb', 'sparkles'],
  svg: WIZARD_SVG,
};
