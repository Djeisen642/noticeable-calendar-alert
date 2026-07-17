/**
 * The dragon — a crimson, sharp-angled fire-breather. Deliberately menacing,
 * not cute: shape language leans on triangles everywhere (swept-back horns,
 * jagged wing tears, side spikes, fangs), a heavy brow ridge over narrow
 * ember-glow eyes, a wedge-shaped muzzle with visible teeth, and an armored
 * chest whose plate seams glow like a molten core.
 *
 * Dragon-specific animatable parts (beyond the core contract in character.ts):
 *   #wing-left / #wing-right — flap on stage, pump with the stride
 *   #tail                    — sways on stage, streams while walking
 *   #fire + #fire-inner      — the breath: a blast while greeting, periodic
 *                              puffs while presenting; hidden at rest
 *   #smoke                   — nostril smoke chasing each presenting puff
 *
 * NOTE: styles.css pins several dragon pivots in view-box px (wings' shoulder
 * hinges, the tail root, the head's neck, the fire's mouth). If you move those
 * joints here, update the matching transform-origins in styles.css.
 *
 * The README embeds this character from `docs/dragon.svg`. After editing the
 * SVG, regenerate that file (its content is `DRAGON.svg` plus a trailing
 * newline) — `characters.test.ts` fails if the two drift apart.
 */

import { CORE_PART_IDS, type Character } from './character.ts';

/**
 * Draw order (back to front): shadow, tail, wings, legs, resting arm, body
 * (plates + side spikes), waving arm, head (horns, brow, muzzle, eyes — with
 * the fire breath and nostril smoke anchored at the mouth, on top).
 *
 * The fire is drawn pointing LEFT from the mouth inside a wrapper rotated 38°
 * clockwise, so it breathes up-and-away from the speech bubble; it is hidden
 * (opacity 0) until the waving blast / presenting puffs animate it.
 */
const DRAGON_SVG = `<svg viewBox="0 0 140 190" width="140" height="190" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="scaleFill" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#d84f41" />
      <stop offset="0.55" stop-color="#ad2b26" />
      <stop offset="1" stop-color="#841d1b" />
    </linearGradient>
    <linearGradient id="dragonHeadFill" x1="0.2" y1="0" x2="0.8" y2="1">
      <stop offset="0" stop-color="#d85545" />
      <stop offset="0.6" stop-color="#b02c26" />
      <stop offset="1" stop-color="#8a1f1d" />
    </linearGradient>
    <linearGradient id="wingFill" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#6e1a22" />
      <stop offset="1" stop-color="#3a0f16" />
    </linearGradient>
    <linearGradient id="hornFill" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#5c2a2e" />
      <stop offset="1" stop-color="#2e1114" />
    </linearGradient>
    <linearGradient id="clawFill" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#d9c294" />
      <stop offset="1" stop-color="#b0925e" />
    </linearGradient>
  </defs>

  <!-- Ground shadow -->
  <ellipse cx="68" cy="183" rx="34" ry="6" fill="#000000" opacity="0.16" />

  <!-- Tail: curls out to the right, ridged with spikes, tipped with a barb -->
  <g id="tail">
    <path d="M90 150 Q118 164 126 146" stroke="url(#scaleFill)" stroke-width="14" stroke-linecap="round" fill="none" />
    <path d="M124 150 Q129 140 127 128" stroke="#a8302b" stroke-width="8" stroke-linecap="round" fill="none" />
    <path d="M104 150 L108 140 L113 151 Z" fill="url(#hornFill)" />
    <path d="M118 155 L124 147 L127 158 Z" fill="url(#hornFill)" />
    <path d="M127 104 L139 124 L127 118 L115 124 Z" fill="url(#hornFill)" />
  </g>

  <!-- Wings: tall bat wings, torn along the trailing edge, ember-lit ribs -->
  <g id="wing-left">
    <path d="M46 90 Q24 66 8 50 L2 96 L12 86 L14 104 L24 92 L27 112 L36 100 L39 118 L46 108 Z" fill="url(#wingFill)" />
    <path d="M8 50 L4 92" stroke="#ff6b2e" stroke-width="1.5" fill="none" opacity="0.35" />
    <path d="M10 52 L15 100" stroke="#ff6b2e" stroke-width="1.5" fill="none" opacity="0.35" />
    <path d="M14 56 L26 108" stroke="#ff6b2e" stroke-width="1.5" fill="none" opacity="0.35" />
    <path d="M20 62 L37 114" stroke="#ff6b2e" stroke-width="1.5" fill="none" opacity="0.35" />
    <path d="M46 90 Q24 66 8 50" stroke="#33121a" stroke-width="6" stroke-linecap="round" fill="none" />
    <path d="M8 50 L0 40 L10 46 Z" fill="url(#hornFill)" />
  </g>
  <g id="wing-right">
    <path d="M92 90 Q114 66 132 48 L138 94 L128 84 L126 102 L116 90 L113 110 L104 98 L101 116 L94 106 Z" fill="url(#wingFill)" />
    <path d="M132 48 L136 90" stroke="#ff6b2e" stroke-width="1.5" fill="none" opacity="0.35" />
    <path d="M130 50 L125 98" stroke="#ff6b2e" stroke-width="1.5" fill="none" opacity="0.35" />
    <path d="M126 54 L114 106" stroke="#ff6b2e" stroke-width="1.5" fill="none" opacity="0.35" />
    <path d="M120 60 L103 112" stroke="#ff6b2e" stroke-width="1.5" fill="none" opacity="0.35" />
    <path d="M92 90 Q114 66 132 48" stroke="#33121a" stroke-width="6" stroke-linecap="round" fill="none" />
    <path d="M132 48 L140 38 L130 44 Z" fill="url(#hornFill)" />
  </g>

  <!-- Legs: stout haunches + three long bone claws each -->
  <g id="leg-left">
    <rect x="53" y="146" width="13" height="30" rx="6.5" fill="#a8302b" />
    <ellipse cx="57" cy="175" rx="12" ry="6.5" fill="#7c1b18" />
    <path d="M48 171 L40 179 L50 180 Z" fill="url(#clawFill)" />
    <path d="M54 174 L49 183 L59 181 Z" fill="url(#clawFill)" />
    <path d="M60 175 L58 184 L66 181 Z" fill="url(#clawFill)" />
  </g>
  <g id="leg-right">
    <rect x="70" y="146" width="13" height="30" rx="6.5" fill="#9c2823" />
    <ellipse cx="78" cy="175" rx="12" ry="6.5" fill="#701714" />
    <path d="M69 171 L61 179 L71 180 Z" fill="url(#clawFill)" />
    <path d="M75 174 L70 183 L80 181 Z" fill="url(#clawFill)" />
    <path d="M81 175 L79 184 L87 181 Z" fill="url(#clawFill)" />
  </g>

  <!-- Resting arm: hangs at the side, claws curled -->
  <g id="arm-rest">
    <path d="M44 100 Q35 109 34 121" stroke="#a8302b" stroke-width="12" stroke-linecap="round" fill="none" />
    <circle cx="34" cy="124" r="6.5" fill="#7c1b18" />
    <path d="M30 127 L24 135 L32 133 Z" fill="url(#clawFill)" />
    <path d="M35 129 L34 138 L41 132 Z" fill="url(#clawFill)" />
  </g>

  <!-- Body: scaled torso, armored chest plates over a molten-glow core,
       triple spikes down both flanks -->
  <g id="body">
    <rect x="38" y="84" width="62" height="74" rx="20" fill="url(#scaleFill)" />
    <path d="M40 94 L28 100 L40 108 Z" fill="url(#hornFill)" />
    <path d="M40 112 L29 118 L40 125 Z" fill="url(#hornFill)" />
    <path d="M40 130 L30 135 L40 141 Z" fill="url(#hornFill)" />
    <path d="M98 94 L110 100 L98 108 Z" fill="url(#hornFill)" />
    <path d="M98 112 L109 118 L98 125 Z" fill="url(#hornFill)" />
    <path d="M98 130 L108 135 L98 141 Z" fill="url(#hornFill)" />
    <rect x="52" y="92" width="34" height="14" rx="4" fill="#5c242b" />
    <rect x="50" y="107" width="38" height="14" rx="4" fill="#552128" />
    <rect x="52" y="122" width="34" height="14" rx="4" fill="#4e1e25" />
    <rect x="55" y="137" width="28" height="12" rx="4" fill="#471b22" />
    <path d="M54 106.5 L84 106.5" stroke="#ff6b2e" stroke-width="2" stroke-linecap="round" fill="none" opacity="0.7" />
    <path d="M52 121.5 L86 121.5" stroke="#ff6b2e" stroke-width="2" stroke-linecap="round" fill="none" opacity="0.7" />
    <path d="M54 136.2 L84 136.2" stroke="#ff6b2e" stroke-width="2" stroke-linecap="round" fill="none" opacity="0.65" />
    <path d="M69 96 L69 145" stroke="#ff6b2e" stroke-width="1.6" stroke-linecap="round" fill="none" opacity="0.4" />
    <path d="M42 96 Q40 118 44 134" stroke="#ffffff" stroke-width="4" stroke-linecap="round" fill="none" opacity="0.18" />
  </g>

  <!-- Greeting arm: drawn RAISED (same shoulder geometry as the knight so the
       shared tuck/wave choreography fits); three bone claws on the paw -->
  <g id="arm-wave">
    <path d="M93 99 Q114 70 120 50" stroke="#a8302b" stroke-width="14" stroke-linecap="round" fill="none" />
    <circle cx="121" cy="47" r="9.5" fill="#7c1b18" />
    <path d="M113 41 L107 31 L117 35 Z" fill="url(#clawFill)" />
    <path d="M120 38 L119 27 L127 34 Z" fill="url(#clawFill)" />
    <path d="M127 42 L134 33 L131 44 Z" fill="url(#clawFill)" />
  </g>

  <!-- Head: wedge skull under a heavy brow, long fanged muzzle, swept-back
       horns, jaw spikes — with the fire and nostril smoke at the mouth -->
  <g id="head">
    <g id="smoke">
      <circle cx="20" cy="46" r="3" fill="#b9c3cd" opacity="0.55" />
      <circle cx="16" cy="38" r="2.2" fill="#c9d2da" opacity="0.4" />
    </g>
    <path d="M62 28 C66 14 74 4 86 -2 C76 10 72 18 70 28 Z" fill="url(#hornFill)" />
    <path d="M84 26 C92 12 104 4 116 2 C104 14 98 22 94 32 Z" fill="url(#hornFill)" />
    <path d="M72 24 L76 10 L81 23 Z" fill="url(#hornFill)" />
    <ellipse cx="78" cy="48" rx="27" ry="23" fill="url(#dragonHeadFill)" />
    <path d="M100 50 L112 46 L101 57 Z" fill="url(#hornFill)" />
    <path d="M99 60 L110 62 L100 68 Z" fill="url(#hornFill)" />
    <path d="M56 46 L24 52 L18 60 L28 68 L58 70 Z" fill="url(#dragonHeadFill)" />
    <path d="M28 68 L24 76 L58 78 L58 70 Z" fill="#7c1b18" />
    <path d="M28 68 L30 61 L33 68 Z" fill="url(#clawFill)" />
    <path d="M31 68 L33.5 73 L36 68 Z" fill="#efe4c8" />
    <path d="M38 68.5 L40.5 74 L43 69 Z" fill="#efe4c8" />
    <path d="M45 69 L47.5 74.5 L50 69 Z" fill="#efe4c8" />
    <path d="M52 70 L54.5 78 L57 70 Z" fill="#efe4c8" />
    <path d="M22 55 L28 57" stroke="#33121a" stroke-width="2" stroke-linecap="round" fill="none" />
    <path d="M56 33 L74 39" stroke="#33121a" stroke-width="5" stroke-linecap="round" fill="none" />
    <path d="M100 33 L82 39" stroke="#33121a" stroke-width="5" stroke-linecap="round" fill="none" />
    <g id="eyes">
      <path d="M54 41 L73 44.5 L72 52 L55 48 Z" fill="#ff8c1f" opacity="0.4" />
      <path d="M102 41 L83 44.5 L84 52 L101 48 Z" fill="#ff8c1f" opacity="0.4" />
      <path d="M56 42.5 L71.5 45.5 L70.8 50.5 L56.5 46.8 Z" fill="#ff9d2e" />
      <path d="M100 42.5 L84.5 45.5 L85.2 50.5 L99.5 46.8 Z" fill="#ff9d2e" />
      <path d="M58 43.8 L69.5 46.2 L69.2 49.2 L58.4 46.4 Z" fill="#ffd75e" />
      <path d="M98 43.8 L86.5 46.2 L86.8 49.2 L97.6 46.4 Z" fill="#ffd75e" />
    </g>
    <g id="fire">
      <g transform="translate(22 64) rotate(38)">
        <path d="M0 0 C -13 -11 -28 -16 -40 -13 C -35 -9 -36 -6 -45 -8 C -54 -9 -59 -4 -63 1 C -57 4 -53 8 -44 8 C -48 12 -44 15 -35 13 C -22 17 -10 10 0 0 Z" fill="#ff5f24" />
        <path d="M0 0 C -10 -8 -22 -11 -31 -9 C -27 -6 -28 -4 -36 -5 C -42 -5 -46 -2 -49 1 C -44 4 -40 5 -33 5 C -36 8 -33 10 -27 9 C -17 10 -8 6 0 0 Z" fill="#ff9d33" />
        <g id="fire-inner">
          <path d="M0 0 C -8 -5 -16 -7 -22 -5 C -26 -4 -31 -1 -34 1 C -29 3 -25 4 -20 4 C -13 5 -5 4 0 0 Z" fill="#ffe066" />
          <path d="M0 0 C -5 -3 -10 -4 -15 -3 C -18 -1 -19 0 -21 1 C -16 3 -10 3 -5 1 Z" fill="#fff3cc" />
        </g>
        <circle cx="-57" cy="-10" r="2.4" fill="#ff9d33" />
        <circle cx="-66" cy="3" r="2" fill="#ff5f24" />
        <circle cx="-50" cy="10" r="1.7" fill="#ff9d33" />
      </g>
    </g>
  </g>
</svg>`;

export const DRAGON: Character = {
  id: 'dragon',
  partIds: [...CORE_PART_IDS, 'wing-left', 'wing-right', 'tail', 'fire', 'fire-inner', 'smoke'],
  svg: DRAGON_SVG,
};
