/**
 * The dragon — a crimson, comic-inked fire-breather modeled on classic
 * heraldic red-dragon art. Menacing by construction: every shape carries a
 * dark ink outline, the palette is deep brick red with flat shadow tones,
 * the head is a roaring crocodilian wedge with a fire-lit mouth, and the
 * silhouette bristles — ridged swept horns, ear frills, dorsal spikes down
 * the neck, flank spikes, clawed digitigrade haunches, and a tail that
 * sweeps along the ground to a pointed tip.
 *
 * Anatomy notes (why it reads as a dragon, not a dog with wings): the head is
 * a tapering skull-plus-jaw in PROFILE, jaws open mid-roar, carried on a
 * thick S-curved neck that joins the BACK of the skull and rises from the
 * shoulders; the throat and belly are plated with overlapping gold crescents.
 * The whole neck lives inside #head, so the presenting head-sway pivots at
 * the neck root and the head serpentines.
 *
 * Dragon-specific animatable parts (beyond the core contract in character.ts):
 *   #wing-left / #wing-right — flap on stage, pump with the stride
 *   #tail                    — sways on stage, streams while walking
 *   #fire + #fire-inner      — the breath: a blast while greeting, periodic
 *                              puffs while presenting; hidden at rest
 *   #smoke                   — nostril smoke chasing each presenting puff
 *
 * NOTE: styles.css pins several dragon pivots in view-box px (wings' shoulder
 * hinges, the tail root, the neck root, the fire's mouth). If you move those
 * joints here, update the matching transform-origins in styles.css.
 *
 * The README embeds this character from `docs/dragon.svg`. After editing the
 * SVG, regenerate that file (its content is `DRAGON.svg` plus a trailing
 * newline) — `characters.test.ts` fails if the two drift apart.
 */

import { CORE_PART_IDS, type Character } from './character.ts';

/**
 * Draw order (back to front): shadow, tail, wings, legs, resting arm, body
 * (gold belly plates + flank spikes + scale rows), waving arm, head (thick
 * crescent-plated neck with dorsal spikes, ridged horns, roaring skull/jaw,
 * glowing mouth, ember eye — with the fire and nostril smoke at the maw).
 *
 * The fire is drawn pointing LEFT from the mouth inside a wrapper rotated 30°
 * clockwise, so it breathes up-and-away from the speech bubble; it is hidden
 * (opacity 0) until the waving blast / presenting puffs animate it.
 */
const DRAGON_SVG = `<svg viewBox="0 0 140 190" width="140" height="190" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="scaleFill" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#cd4534" />
      <stop offset="0.55" stop-color="#a5281f" />
      <stop offset="1" stop-color="#7c1a15" />
    </linearGradient>
    <linearGradient id="dragonHeadFill" x1="0.2" y1="0" x2="0.8" y2="1">
      <stop offset="0" stop-color="#cd4a36" />
      <stop offset="0.6" stop-color="#a5281f" />
      <stop offset="1" stop-color="#801b16" />
    </linearGradient>
    <linearGradient id="wingFill" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#b04a33" />
      <stop offset="1" stop-color="#6e2318" />
    </linearGradient>
    <linearGradient id="dragonGoldFill" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ecd29b" />
      <stop offset="1" stop-color="#cfa75c" />
    </linearGradient>
    <radialGradient id="mouthGlow" cx="0.7" cy="0.5" r="0.8">
      <stop offset="0" stop-color="#ffb23d" />
      <stop offset="0.55" stop-color="#e0622a" />
      <stop offset="1" stop-color="#7c1a15" />
    </radialGradient>
  </defs>

  <!-- Ground shadow -->
  <ellipse cx="72" cy="183" rx="40" ry="6" fill="#000000" opacity="0.16" />

  <!-- Tail: sweeps low along the ground to the right, gold under-bands,
       dorsal ridge spikes, tapering to a point -->
  <g id="tail">
    <path d="M82 144 C96 154 108 166 120 171 C128 174 133 170 134 161 C134 171 129 177 121 176 C107 173 92 162 78 152 Z" fill="url(#scaleFill)" stroke="#2e0b0d" stroke-width="1.6" />
    <path d="M94 158 Q98 163 103 165" stroke="url(#dragonGoldFill)" stroke-width="4" fill="none" />
    <path d="M108 166 Q112 170 117 171" stroke="url(#dragonGoldFill)" stroke-width="3.4" fill="none" />
    <path d="M123 172 Q126 173 129 172" stroke="url(#dragonGoldFill)" stroke-width="2.6" fill="none" />
    <path d="M92 154 L97 146 L101 156 Z" fill="#5c1512" stroke="#2e0b0d" stroke-width="1" />
    <path d="M105 162 L110 155 L114 165 Z" fill="#5c1512" stroke="#2e0b0d" stroke-width="1" />
    <path d="M117 169 L122 163 L125 172 Z" fill="#5c1512" stroke="#2e0b0d" stroke-width="1" />
  </g>

  <!-- Wings: bat wings with deep concave scallops and long ink finger bones;
       the near wing is raised high, the far wing folds behind the neck -->
  <g id="wing-left">
    <path d="M52 90 Q32 62 18 32 Q10 52 6 74 Q13 64 16 86 Q22 74 27 98 Q32 86 37 108 Q42 96 52 98 Z" fill="url(#wingFill)" stroke="#2e0b0d" stroke-width="1.6" />
    <path d="M24 46 L6 74" stroke="#2e0b0d" stroke-width="2" fill="none" />
    <path d="M24 46 L16 86" stroke="#2e0b0d" stroke-width="2" fill="none" />
    <path d="M24 46 L27 98" stroke="#2e0b0d" stroke-width="2" fill="none" />
    <path d="M24 46 L37 108" stroke="#2e0b0d" stroke-width="2" fill="none" />
    <path d="M52 90 Q32 62 18 32" stroke="#2e0b0d" stroke-width="5.5" stroke-linecap="round" fill="none" />
    <path d="M18 32 L11 22 L21 28 Z" fill="#5c1512" stroke="#2e0b0d" stroke-width="1" />
  </g>
  <g id="wing-right">
    <path d="M86 90 Q104 54 126 22 Q136 40 139 58 Q131 50 134 78 Q125 64 122 96 Q114 80 108 110 Q101 94 92 100 Z" fill="url(#wingFill)" stroke="#2e0b0d" stroke-width="1.6" />
    <path d="M112 44 L139 58" stroke="#2e0b0d" stroke-width="2" fill="none" />
    <path d="M112 44 L134 78" stroke="#2e0b0d" stroke-width="2" fill="none" />
    <path d="M112 44 L122 96" stroke="#2e0b0d" stroke-width="2" fill="none" />
    <path d="M112 44 L108 110" stroke="#2e0b0d" stroke-width="2" fill="none" />
    <path d="M86 90 Q104 54 126 22" stroke="#2e0b0d" stroke-width="5.5" stroke-linecap="round" fill="none" />
    <path d="M126 22 L133 11 L122 18 Z" fill="#5c1512" stroke="#2e0b0d" stroke-width="1" />
  </g>

  <!-- Legs: muscular digitigrade haunches, dark claws, scale arcs -->
  <g id="leg-left">
    <path d="M46 132 Q41 150 48 163 Q54 171 64 169 L66 148 Q64 136 57 131 Z" fill="url(#scaleFill)" stroke="#2e0b0d" stroke-width="1.6" />
    <path d="M49 143 Q52 146 55 143 M57 143 Q60 146 63 143" stroke="#2e0b0d" stroke-width="1" fill="none" opacity="0.35" />
    <path d="M47 167 Q44 175 52 177 L66 177 Q66 170 61 167 Z" fill="#8a1f18" stroke="#2e0b0d" stroke-width="1.4" />
    <path d="M50 172 L41 178 L51 180 Z" fill="#5c3226" stroke="#2e0b0d" stroke-width="1" />
    <path d="M56 174 L50 182 L60 181 Z" fill="#5c3226" stroke="#2e0b0d" stroke-width="1" />
    <path d="M62 175 L59 183 L67 180 Z" fill="#5c3226" stroke="#2e0b0d" stroke-width="1" />
  </g>
  <g id="leg-right">
    <path d="M68 132 Q63 150 70 163 Q76 171 86 169 L88 148 Q86 136 79 131 Z" fill="#9c241c" stroke="#2e0b0d" stroke-width="1.6" />
    <path d="M71 143 Q74 146 77 143 M79 143 Q82 146 85 143" stroke="#2e0b0d" stroke-width="1" fill="none" opacity="0.35" />
    <path d="M69 167 Q66 175 74 177 L88 177 Q88 170 83 167 Z" fill="#7c1a15" stroke="#2e0b0d" stroke-width="1.4" />
    <path d="M72 172 L63 178 L73 180 Z" fill="#5c3226" stroke="#2e0b0d" stroke-width="1" />
    <path d="M78 174 L72 182 L82 181 Z" fill="#5c3226" stroke="#2e0b0d" stroke-width="1" />
    <path d="M84 175 L81 183 L89 180 Z" fill="#5c3226" stroke="#2e0b0d" stroke-width="1" />
  </g>

  <!-- Resting arm: foreleg reaching down, claws curled -->
  <g id="arm-rest">
    <path d="M48 102 Q37 110 36 123" stroke="#2e0b0d" stroke-width="15" stroke-linecap="round" fill="none" />
    <path d="M48 102 Q37 110 36 123" stroke="#a5281f" stroke-width="11.5" stroke-linecap="round" fill="none" />
    <circle cx="36" cy="126" r="6.5" fill="#8a1f18" stroke="#2e0b0d" stroke-width="1.4" />
    <path d="M32 129 L25 137 L34 135 Z" fill="#5c3226" stroke="#2e0b0d" stroke-width="1" />
    <path d="M38 131 L37 140 L44 134 Z" fill="#5c3226" stroke="#2e0b0d" stroke-width="1" />
  </g>

  <!-- Body: compact muscular torso, narrow gold belly column, flank spikes,
       flat shadow down the right side, scale arcs on the margins -->
  <g id="body">
    <path d="M54 92 L88 92 Q94 96 92 106 Q96 122 94 138 Q92 152 70 154 Q46 152 44 138 Q42 122 47 106 Q45 96 54 92 Z" fill="url(#scaleFill)" stroke="#2e0b0d" stroke-width="1.6" />
    <path d="M87 96 Q92 118 89 144 Q92 140 93 124 Q94 106 87 96 Z" fill="#7c1a15" opacity="0.8" />
    <path d="M45 106 L34 112 L45 119 Z" fill="#5c1512" stroke="#2e0b0d" stroke-width="1" />
    <path d="M44 124 L33 130 L44 136 Z" fill="#5c1512" stroke="#2e0b0d" stroke-width="1" />
    <path d="M93 106 L104 112 L93 119 Z" fill="#5c1512" stroke="#2e0b0d" stroke-width="1" />
    <path d="M94 124 L105 130 L94 136 Z" fill="#5c1512" stroke="#2e0b0d" stroke-width="1" />
    <path d="M69 102 Q77 104 79 120 Q80 138 69 144 Q58 138 59 120 Q61 104 69 102 Z" fill="url(#dragonGoldFill)" stroke="#2e0b0d" stroke-width="1.4" />
    <path d="M60 113 Q69 118 78 113" stroke="#a87b33" stroke-width="1.8" fill="none" />
    <path d="M59 124 Q69 129 79 124" stroke="#a87b33" stroke-width="1.8" fill="none" />
    <path d="M60 134 Q69 139 78 134" stroke="#a87b33" stroke-width="1.8" fill="none" />
    <path d="M62 141 Q69 145 76 141" stroke="#a87b33" stroke-width="1.8" fill="none" />
    <path d="M47 112 Q50 115 53 112 M47 126 Q50 129 53 126 M48 140 Q51 143 54 140" stroke="#2e0b0d" stroke-width="1" fill="none" opacity="0.35" />
    <path d="M85 112 Q88 115 91 112 M85 126 Q88 129 91 126 M84 140 Q87 143 90 140" stroke="#2e0b0d" stroke-width="1" fill="none" opacity="0.35" />
  </g>

  <!-- Greeting arm: drawn RAISED (same shoulder geometry as the knight so the
       shared tuck/wave choreography fits); three dark claws on the paw -->
  <g id="arm-wave">
    <path d="M93 99 Q114 70 120 50" stroke="#2e0b0d" stroke-width="17" stroke-linecap="round" fill="none" />
    <path d="M93 99 Q114 70 120 50" stroke="#a5281f" stroke-width="13.5" stroke-linecap="round" fill="none" />
    <circle cx="121" cy="47" r="9.5" fill="#8a1f18" stroke="#2e0b0d" stroke-width="1.4" />
    <path d="M113 41 L107 31 L117 35 Z" fill="#5c3226" stroke="#2e0b0d" stroke-width="1" />
    <path d="M120 38 L119 27 L127 34 Z" fill="#5c3226" stroke="#2e0b0d" stroke-width="1" />
    <path d="M127 42 L134 33 L131 44 Z" fill="#5c3226" stroke="#2e0b0d" stroke-width="1" />
  </g>

  <!-- Head: thick arched neck plated with overlapping gold crescents and a
       spiked dorsal ridge, carrying a roaring wedge skull — ridged swept
       horns, ear frills, glowing open maw with interlocked fangs -->
  <g id="head">
    <g id="smoke">
      <circle cx="17" cy="14" r="3" fill="#b9c3cd" opacity="0.55" />
      <circle cx="13" cy="6" r="2.2" fill="#c9d2da" opacity="0.4" />
    </g>
    <path d="M48 44 C41 62 44 82 58 96 L92 98 C86 74 76 52 62 34 Z" fill="url(#dragonHeadFill)" stroke="#2e0b0d" stroke-width="1.6" />
    <path d="M62 38 C74 56 82 76 88 96 L92 98 C86 72 76 50 66 36 Z" fill="#7c1a15" opacity="0.8" />
    <path d="M63 42 L72 35 L68 48 Z" fill="#5c1512" stroke="#2e0b0d" stroke-width="1" />
    <path d="M71 56 L80 49 L76 62 Z" fill="#5c1512" stroke="#2e0b0d" stroke-width="1" />
    <path d="M77 70 L85 64 L82 76 Z" fill="#5c1512" stroke="#2e0b0d" stroke-width="1" />
    <path d="M82 84 L89 78 L87 90 Z" fill="#5c1512" stroke="#2e0b0d" stroke-width="1" />
    <path d="M45 47 Q52 53 58 46 L58 52 Q51 59 45 53 Z" fill="url(#dragonGoldFill)" stroke="#2e0b0d" stroke-width="1" />
    <path d="M44 56 Q51 62 59 55 L59 61 Q51 68 44 62 Z" fill="url(#dragonGoldFill)" stroke="#2e0b0d" stroke-width="1" />
    <path d="M44 65 Q52 71 61 64 L61 70 Q52 77 44 71 Z" fill="url(#dragonGoldFill)" stroke="#2e0b0d" stroke-width="1" />
    <path d="M46 74 Q55 80 64 73 L64 79 Q55 86 46 80 Z" fill="url(#dragonGoldFill)" stroke="#2e0b0d" stroke-width="1" />
    <path d="M49 83 Q58 89 68 82 L68 88 Q58 95 49 89 Z" fill="url(#dragonGoldFill)" stroke="#2e0b0d" stroke-width="1" />
    <path d="M53 91 Q63 97 72 90 L72 96 Q63 103 53 97 Z" fill="url(#dragonGoldFill)" stroke="#2e0b0d" stroke-width="1" />
    <g transform="translate(6 8) scale(0.88)">
    <path d="M62 13 C70 4 80 -3 92 -5 C84 3 76 9 70 18 Z" fill="url(#dragonGoldFill)" stroke="#2e0b0d" stroke-width="1.4" />
    <path d="M84 -3 C87 -4 90 -5 92 -5 C89 -2 87 0 84 2 Z" fill="#5c3226" />
    <path d="M70 6 Q75 3 80 1 M66 12 Q71 9 76 6" stroke="#a87b33" stroke-width="1.2" fill="none" />
    <path d="M56 17 C60 8 66 1 74 -3 C69 5 65 11 62 20 Z" fill="url(#dragonGoldFill)" stroke="#2e0b0d" stroke-width="1.2" />
    <path d="M62 12 Q48 12 40 18 Q30 20 22 25 Q18 27 20 30 L22 33 Q32 36 44 39 L58 44 Q64 42 65 36 Q66 22 62 12 Z" fill="url(#dragonHeadFill)" stroke="#2e0b0d" stroke-width="1.6" />
    <path d="M21 32 Q38 38 57 45 Q40 50 24 52 Q18 42 21 32 Z" fill="url(#mouthGlow)" stroke="#2e0b0d" stroke-width="1.2" />
    <path d="M28 33 L31 41 L35 34.5 Z" fill="#f4ead2" stroke="#2e0b0d" stroke-width="0.8" />
    <path d="M37 35.5 L40 43 L44 37 Z" fill="#f4ead2" stroke="#2e0b0d" stroke-width="0.8" />
    <path d="M46 38 L48.5 45.5 L52.5 39.5 Z" fill="#f4ead2" stroke="#2e0b0d" stroke-width="0.8" />
    <path d="M58 44 Q40 48 22 52 Q19 56 24 60 Q42 64 54 56 Q59 50 58 44 Z" fill="url(#dragonHeadFill)" stroke="#2e0b0d" stroke-width="1.6" />
    <path d="M26 51.5 L28 45.5 L31.5 52 Z" fill="#f4ead2" stroke="#2e0b0d" stroke-width="0.8" />
    <path d="M35 52.5 L37 46.5 L40.5 53 Z" fill="#f4ead2" stroke="#2e0b0d" stroke-width="0.8" />
    <path d="M26 57 Q37 60.5 48 58" stroke="url(#dragonGoldFill)" stroke-width="2.6" fill="none" />
    <path d="M58 38 L72 32 L61 45 Z" fill="#8a1f18" stroke="#2e0b0d" stroke-width="1.2" />
    <path d="M60 45 L75 44 L62 53 Z" fill="#7c1a15" stroke="#2e0b0d" stroke-width="1.2" />
    <ellipse cx="25" cy="22" rx="1.8" ry="2.4" fill="#2e0b0d" />
    <circle cx="25" cy="22.5" r="0.8" fill="#ff6b2e" opacity="0.8" />
    <path d="M35 19 L53 15.5" stroke="#2e0b0d" stroke-width="3.5" stroke-linecap="round" fill="none" />
    <g id="eyes">
      <path d="M35 21.5 Q43 15.5 53 17.5 Q51 25 44 24.5 Q38 24 35 21.5 Z" fill="#ff8c1f" opacity="0.45" />
      <path d="M36.5 21.3 Q43 16.8 51.5 18.2 Q50 23.8 44 23.4 Q39 23 36.5 21.3 Z" fill="#ffb640" />
      <path d="M43 17.8 L44.8 20.4 L43.6 23.4 L41.8 20.6 Z" fill="#331208" />
      <circle cx="46.5" cy="19.3" r="1" fill="#fff3cc" opacity="0.9" />
    </g>
    </g>
    <g id="fire">
      <g transform="translate(25 45) rotate(30)">
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
