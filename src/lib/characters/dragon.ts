/**
 * The dragon — a crimson fire-breather in flat, ink-outlined vector style:
 * clean solid fills, a heavy dark outline around every shape, a continuous
 * cream underside running from the chin down the throat to the belly, two
 * swept-back horns over a jagged head crest, a white slit eye under an angry
 * brow spike, a single dominant veined bat wing per side, and a long smooth
 * tail sweeping the ground to a point.
 *
 * Anatomy notes (why it reads as a dragon, not a dog with wings): the head is
 * a tapering skull-plus-jaw in PROFILE, jaws open mid-roar, carried on a
 * thick S-curved neck that joins the BACK of the skull and rises from the
 * shoulders. The whole neck lives inside #head, so the presenting head-sway
 * pivots at the neck root and the head serpentines.
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
 * Flat palette (matches the guide art): body red, darker red for horns /
 * crest / wing membranes / shadow shapes, cream for the underside and claws,
 * and one dark ink for every outline.
 *
 * Draw order (back to front): shadow, tail, wings, legs, resting arm, body
 * (cream belly), waving arm, head (neck with cream throat, crest, horns,
 * roaring skull/jaw, eye — with the fire and nostril smoke at the maw).
 *
 * The fire is drawn pointing LEFT from the mouth inside a wrapper rotated 30°
 * clockwise, so it breathes up-and-away from the speech bubble; it is hidden
 * (opacity 0) until the waving blast / presenting puffs animate it.
 */
const DRAGON_SVG = `<svg viewBox="0 0 140 190" width="140" height="190" xmlns="http://www.w3.org/2000/svg">
  <!-- Ground shadow -->
  <ellipse cx="84" cy="191" rx="48" ry="5" fill="#000000" opacity="0.16" />

  <!-- Rock perch: low-poly slate outcrop. Drawn first so the tail sweeps and
       the feet grip in FRONT of it. Static — it slides in with the character
       (no part id, no animation). The dragon itself is lifted 18px by the
       wrapper below so it stands on the ridge; the ridge dips under the feet
       so the claws hang over the rock face. -->
  <path d="M26 182 L36 162 L52 168 L68 159 L86 166 L104 157 L122 166 L140 176 L136 194 L34 193 Z" fill="#4d6390" stroke="#2c3a52" stroke-width="1.8" />
  <path d="M36 162 L52 168 L44 193 L34 193 L26 182 Z" fill="#5d76a8" stroke="#2c3a52" stroke-width="1.1" />
  <path d="M104 157 L122 166 L116 193 L78 193 L86 166 Z" fill="#415580" stroke="#2c3a52" stroke-width="1.1" />
  <path d="M122 166 L140 176 L136 194 L116 193 Z" fill="#384a70" stroke="#2c3a52" stroke-width="1.1" />

  <!-- Everything below rides 18px high so the dragon perches on the rock.
       NOTE: the view-box-pinned pivots in styles.css (wings, tail, neck,
       fire) are specified in FINAL coordinates, i.e. already minus 18. -->
  <g transform="translate(0 -18)">

  <!-- Tail: long smooth taper sweeping the ground, curling up at the tip -->
  <g id="tail">
    <path d="M82 142 C98 154 112 168 123 172 C131 174 135 168 134 159 C136 170 130 178 121 177 C107 174 91 161 78 150 Z" fill="#d9453a" stroke="#3d1210" stroke-width="1.8" />
    <path d="M92 158 C104 168 114 173 122 174" stroke="#9c2620" stroke-width="1.6" fill="none" opacity="0.7" />
  </g>

  <!-- Wings: bat wings with an elbow thumb-spike and dark vein lines; the
       near wing rises high, the far wing folds smaller behind the neck -->
  <!-- The wings deliberately overflow the 140x190 canvas (the svg renders
       with overflow: visible) into the overlay window's headroom — tips must
       stay within ~16px of the canvas right edge and above-canvas space so
       the window never clips them. -->
  <g id="wing-left">
    <path d="M52 90 Q40 56 22 18 Q14 32 14 54 Q20 52 16 78 Q24 72 22 96 Q30 86 36 104 Q44 94 52 98 Z" fill="#b5342a" stroke="#3d1210" stroke-width="1.8" />
    <path d="M26 44 L14 54 M26 44 L16 78 M26 44 L22 96 M26 44 L36 104" stroke="#8a1f1a" stroke-width="1.5" fill="none" />
    <path d="M27 40 L20 30 L30 34 Z" fill="#9c2620" stroke="#3d1210" stroke-width="1.2" />
  </g>
  <g id="wing-right">
    <path d="M86 88 Q100 48 128 -4 Q140 16 146 34 Q136 30 140 62 Q128 52 126 88 Q114 74 108 106 Q100 92 92 100 Z" fill="#c93a2f" stroke="#3d1210" stroke-width="1.8" />
    <path d="M106 40 L146 34 M106 40 L140 62 M106 40 L126 88 M106 40 L108 106" stroke="#8a1f1a" stroke-width="1.6" fill="none" />
    <path d="M104 36 L98 24 L109 30 Z" fill="#9c2620" stroke="#3d1210" stroke-width="1.2" />
  </g>

  <!-- Legs: muscular haunches, red feet, cream claws -->
  <g id="leg-left">
    <path d="M46 130 Q40 150 48 164 Q54 172 64 170 L66 146 Q64 135 56 130 Z" fill="#d9453a" stroke="#3d1210" stroke-width="1.8" />
    <path d="M47 167 Q44 175 52 177 L66 177 Q66 170 61 166 Z" fill="#c93a2f" stroke="#3d1210" stroke-width="1.6" />
    <path d="M50 172 L41 178 L51 180 Z" fill="#f5e9d0" stroke="#3d1210" stroke-width="1.1" />
    <path d="M56 174 L50 182 L60 181 Z" fill="#f5e9d0" stroke="#3d1210" stroke-width="1.1" />
    <path d="M62 175 L59 183 L67 180 Z" fill="#f5e9d0" stroke="#3d1210" stroke-width="1.1" />
  </g>
  <g id="leg-right">
    <path d="M68 130 Q62 150 70 164 Q76 172 86 170 L88 146 Q86 135 78 130 Z" fill="#c93a2f" stroke="#3d1210" stroke-width="1.8" />
    <path d="M69 167 Q66 175 74 177 L88 177 Q88 170 83 166 Z" fill="#b5342a" stroke="#3d1210" stroke-width="1.6" />
    <path d="M72 172 L63 178 L73 180 Z" fill="#f5e9d0" stroke="#3d1210" stroke-width="1.1" />
    <path d="M78 174 L72 182 L82 181 Z" fill="#f5e9d0" stroke="#3d1210" stroke-width="1.1" />
    <path d="M84 175 L81 183 L89 180 Z" fill="#f5e9d0" stroke="#3d1210" stroke-width="1.1" />
  </g>

  <!-- Resting arm: foreleg reaching down, cream claws curled -->
  <g id="arm-rest">
    <path d="M48 102 Q37 110 36 123" stroke="#3d1210" stroke-width="15" stroke-linecap="round" fill="none" />
    <path d="M48 102 Q37 110 36 123" stroke="#d9453a" stroke-width="11.5" stroke-linecap="round" fill="none" />
    <circle cx="36" cy="126" r="6.5" fill="#c93a2f" stroke="#3d1210" stroke-width="1.6" />
    <path d="M32 129 L25 137 L34 135 Z" fill="#f5e9d0" stroke="#3d1210" stroke-width="1.1" />
    <path d="M38 131 L37 140 L44 134 Z" fill="#f5e9d0" stroke="#3d1210" stroke-width="1.1" />
  </g>

  <!-- Body: forward-leaning torso; the cream underside continues down from
       the throat over the chest and belly; flat shadow along the right -->
  <g id="body">
    <path d="M54 90 L88 92 Q94 96 92 106 Q97 122 95 140 Q92 154 70 156 Q46 153 44 138 Q42 120 47 104 Q45 95 54 90 Z" fill="#d9453a" stroke="#3d1210" stroke-width="1.8" />
    <path d="M87 98 Q92 120 89 144 Q92 138 93 124 Q94 108 87 98 Z" fill="#9c2620" opacity="0.75" />
    <path d="M62 93 Q75 97 77 116 Q79 140 66 150 Q56 143 56 120 Q56 102 62 93 Z" fill="#f5e9d0" stroke="#3d1210" stroke-width="1.5" />
    <path d="M59 112 Q68 116 76 112 M58 124 Q68 128 77 124 M59 136 Q68 140 76 136" stroke="#d9c5a0" stroke-width="1.6" fill="none" />
  </g>

  <!-- Second foreleg. The dragon does NOT wave — styles.css zeroes its
       --arm-tuck and suppresses the wave keyframes, so this arm hangs at
       rest (swinging naturally with the stride) and the greeting is carried
       by the fire blast instead. The #arm-wave id stays because it is part
       of the core choreography contract. -->
  <g id="arm-wave">
    <path d="M90 102 Q101 110 102 122" stroke="#3d1210" stroke-width="15" stroke-linecap="round" fill="none" />
    <path d="M90 102 Q101 110 102 122" stroke="#d9453a" stroke-width="11.5" stroke-linecap="round" fill="none" />
    <circle cx="102" cy="125" r="6.5" fill="#c93a2f" stroke="#3d1210" stroke-width="1.6" />
    <path d="M106 128 L113 136 L104 134 Z" fill="#f5e9d0" stroke="#3d1210" stroke-width="1.1" />
    <path d="M100 130 L101 139 L94 133 Z" fill="#f5e9d0" stroke="#3d1210" stroke-width="1.1" />
  </g>

  <!-- Head: thick S-curved neck with a smooth cream throat strip, carrying a
       roaring profile skull — jagged crest fan, two swept horns, brow spike
       over a white slit eye, open fanged jaw with the fire at the maw -->
  <g id="head">
    <g id="smoke">
      <circle cx="16" cy="12" r="3" fill="#b9c3cd" opacity="0.55" />
      <circle cx="12" cy="4" r="2.2" fill="#c9d2da" opacity="0.4" />
    </g>
    <path d="M48 42 C41 60 44 82 58 102 L92 104 C86 76 76 52 62 32 Z" fill="#d9453a" />
    <path d="M48 42 C41 60 44 82 58 102" stroke="#3d1210" stroke-width="1.8" fill="none" />
    <path d="M62 32 C76 52 86 76 92 104" stroke="#3d1210" stroke-width="1.8" fill="none" />
    <path d="M64 38 C75 56 83 76 88 100 L92 104 C86 72 76 50 68 38 Z" fill="#9c2620" opacity="0.75" />
    <path d="M49 44 C44 62 47 80 59 101 L68 102 C57 82 53 62 57 46 Z" fill="#f5e9d0" />
    <path d="M49 44 C44 62 47 80 59 101" stroke="#3d1210" stroke-width="1.5" fill="none" />
    <path d="M57 46 C53 62 57 82 68 102" stroke="#3d1210" stroke-width="1.5" fill="none" />
    <g transform="translate(6 8) scale(0.88)">
    <path d="M56 10 L74 2 L62 15 L80 12 L64 21 L82 22 L64 27 Z" fill="#9c2620" stroke="#3d1210" stroke-width="1.3" />
    <path d="M56 14 C68 4 82 -2 96 -4 C84 4 72 10 64 22 Z" fill="#9c2620" stroke="#3d1210" stroke-width="1.4" />
    <path d="M54 20 C62 12 72 6 82 4 C72 12 64 18 60 26 Z" fill="#8a1f1a" stroke="#3d1210" stroke-width="1.2" />
    <path d="M62 12 Q48 12 40 18 Q30 20 22 25 Q18 27 20 30 L22 33 Q32 36 44 39 L58 44 Q64 42 65 36 Q66 22 62 12 Z" fill="#d9453a" stroke="#3d1210" stroke-width="1.8" />
    <path d="M36 16 L42 8 L46 17 Z" fill="#9c2620" stroke="#3d1210" stroke-width="1.2" />
    <path d="M21 32 Q38 38 57 45 Q40 50 24 52 Q18 42 21 32 Z" fill="#7c1512" stroke="#3d1210" stroke-width="1.4" />
    <path d="M28 33 L31 41 L35 34.5 Z" fill="#ffffff" stroke="#3d1210" stroke-width="0.8" />
    <path d="M37 35.5 L40 43 L44 37 Z" fill="#ffffff" stroke="#3d1210" stroke-width="0.8" />
    <path d="M46 38 L48.5 45.5 L52.5 39.5 Z" fill="#ffffff" stroke="#3d1210" stroke-width="0.8" />
    <path d="M58 44 Q40 48 22 52 Q19 56 24 60 Q42 64 54 56 Q59 50 58 44 Z" fill="#d9453a" stroke="#3d1210" stroke-width="1.8" />
    <path d="M26 51.5 L28 45.5 L31.5 52 Z" fill="#ffffff" stroke="#3d1210" stroke-width="0.8" />
    <path d="M35 52.5 L37 46.5 L40.5 53 Z" fill="#ffffff" stroke="#3d1210" stroke-width="0.8" />
    <path d="M24 58 L18 66 L28 62 Z" fill="#9c2620" stroke="#3d1210" stroke-width="1.1" />
    <path d="M58 38 L72 32 L61 45 Z" fill="#9c2620" stroke="#3d1210" stroke-width="1.2" />
    <path d="M60 45 L74 44 L62 53 Z" fill="#8a1f1a" stroke="#3d1210" stroke-width="1.2" />
    <ellipse cx="25" cy="22" rx="1.8" ry="2.4" fill="#3d1210" />
    <path d="M33 16 L40 10 L42 18 Z" fill="#9c2620" stroke="#3d1210" stroke-width="1.1" />
    <path d="M36 20.5 L53 17" stroke="#3d1210" stroke-width="2.5" stroke-linecap="round" fill="none" />
    <g id="eyes">
      <path d="M36 21.5 Q44 17.5 53 19 Q51 25 44 24.5 Q39 24 36 21.5 Z" fill="#f5e9d0" stroke="#3d1210" stroke-width="1" />
      <path d="M44 18.6 L45.6 21.2 L44.4 24.2 L42.8 21.4 Z" fill="#3d1210" />
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
  </g>
</svg>`;

export const DRAGON: Character = {
  id: 'dragon',
  partIds: [...CORE_PART_IDS, 'wing-left', 'wing-right', 'tail', 'fire', 'fire-inner', 'smoke'],
  svg: DRAGON_SVG,
};
