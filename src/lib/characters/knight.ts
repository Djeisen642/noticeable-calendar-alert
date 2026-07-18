/**
 * The knight — a valiant herald, gauntlet resting on the pommel of a planted
 * greatsword.
 *
 * Knight-specific animatable parts (beyond the core contract in character.ts):
 *   #plume — the helm's crimson plume; sways on stage
 *   #cape  — the cape; billows softly whenever on stage
 *
 * The README embeds this character from `docs/knight.svg`. After editing the
 * SVG, regenerate that file (its content is `KNIGHT.svg` plus a trailing
 * newline) — `characters.test.ts` fails if the two drift apart.
 */

import { CORE_PART_IDS, type Character } from './character.ts';

/**
 * Draw order (back to front): shadow, cape, legs, sword arm + greatsword,
 * body, waving arm, head (plume drawn behind the helm).
 */
const KNIGHT_SVG = `<svg viewBox="0 0 140 190" width="140" height="190" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="armorFill" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#dbe3ee" />
      <stop offset="0.55" stop-color="#aab4c8" />
      <stop offset="1" stop-color="#8a96ac" />
    </linearGradient>
    <linearGradient id="helmFill" x1="0.2" y1="0" x2="0.8" y2="1">
      <stop offset="0" stop-color="#e6ecf5" />
      <stop offset="0.6" stop-color="#b3bdd0" />
      <stop offset="1" stop-color="#8e9ab0" />
    </linearGradient>
    <linearGradient id="capeFill" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#c23a50" />
      <stop offset="1" stop-color="#8c2438" />
    </linearGradient>
    <linearGradient id="goldFill" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#f0c463" />
      <stop offset="1" stop-color="#c9952f" />
    </linearGradient>
    <linearGradient id="bladeFill" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#f2f6fb" />
      <stop offset="0.5" stop-color="#c3cddd" />
      <stop offset="1" stop-color="#8e9ab0" />
    </linearGradient>
  </defs>

  <!-- Ground shadow -->
  <ellipse cx="68" cy="183" rx="34" ry="6" fill="#000000" opacity="0.16" />

  <!-- Cape (hangs from the shoulders, behind everything) -->
  <g id="cape">
    <path d="M44 88 Q20 120 24 162 Q36 152 48 160 Q64 150 80 160 Q94 152 108 158 Q112 118 94 88 Z" fill="url(#capeFill)" />
    <path d="M48 92 Q30 122 32 154 Q42 146 52 152 Q46 122 52 94 Z" fill="#7a1f31" opacity="0.55" />
    <path d="M90 92 Q102 122 104 152 Q96 146 88 150 Q94 122 86 94 Z" fill="#7a1f31" opacity="0.35" />
  </g>

  <!-- Legs: greaves with knee cops + sabatons -->
  <g id="leg-left">
    <rect x="53" y="146" width="13" height="30" rx="6.5" fill="#8a96ac" />
    <circle cx="59.5" cy="150" r="5" fill="#a5b0c4" />
    <ellipse cx="58" cy="177" rx="11.5" ry="6" fill="#5d6880" />
    <ellipse cx="56" cy="175.5" rx="7" ry="3.4" fill="#7e8aa2" />
  </g>
  <g id="leg-right">
    <rect x="70" y="146" width="13" height="30" rx="6.5" fill="#7e8aa2" />
    <circle cx="76.5" cy="150" r="5" fill="#97a2b8" />
    <ellipse cx="78" cy="177" rx="11.5" ry="6" fill="#535d74" />
    <ellipse cx="76" cy="175.5" rx="7" ry="3.4" fill="#727e96" />
  </g>

  <!-- Sword arm: the gauntlet rests on the pommel of a GREATSWORD planted at
       his side — wide bright blade, grand gold crossguard with ball finials,
       tip at the ground. Hilt drawn before the fist so the hand sits on top.
       NOTE: styles.css pins this group's swing pivot to the shoulder at
       36px 97px (view-box coords) because the sword stretches the bounding
       box. -->
  <g id="arm-rest">
    <path d="M36 98 Q28.5 97 25 102" stroke="#97a2b8" stroke-width="13" stroke-linecap="round" fill="none" />
    <circle cx="24" cy="106" r="5" fill="url(#goldFill)" />
    <rect x="21.2" y="107" width="5.6" height="12" rx="2.4" fill="#6b3f22" />
    <rect x="9" y="118" width="30" height="5.5" rx="2.75" fill="url(#goldFill)" />
    <circle cx="10" cy="120.7" r="3" fill="#c9952f" />
    <circle cx="38" cy="120.7" r="3" fill="#c9952f" />
    <path d="M18.3 123.5 L20.6 166 L24 179.5 L27.4 166 L29.7 123.5 Z" fill="url(#bladeFill)" />
    <rect x="22.9" y="126" width="2.2" height="42" rx="1.1" fill="#93a0b6" />
    <line x1="19.6" y1="127" x2="21.8" y2="168" stroke="#ffffff" stroke-width="1" opacity="0.7" />
    <path d="M19.5 135 L20.5 138.5 L24 139.5 L20.5 140.5 L19.5 144 L18.5 140.5 L15 139.5 L18.5 138.5 Z" fill="#ffffff" opacity="0.9" />
    <circle cx="24" cy="102.5" r="8.5" fill="#6d788f" />
    <circle cx="24" cy="102.5" r="8.5" fill="none" stroke="#5d6880" stroke-width="1.5" />
  </g>

  <!-- Body: cuirass, faulds, gold belt + buckle, crest shield, pauldrons -->
  <g id="body">
    <rect x="38" y="84" width="62" height="74" rx="26" fill="url(#armorFill)" />
    <path d="M42 96 Q40 118 44 134" stroke="#ffffff" stroke-width="4" stroke-linecap="round" fill="none" opacity="0.35" />
    <rect x="40" y="136" width="58" height="11" rx="5.5" fill="#97a2b8" />
    <rect x="43" y="145" width="52" height="10" rx="5" fill="#8a96ac" />
    <rect x="38" y="126" width="62" height="9" fill="url(#goldFill)" />
    <rect x="63" y="124" width="12" height="13" rx="2.5" fill="#c9952f" />
    <rect x="65.5" y="126.5" width="7" height="8" rx="1.5" fill="#f0c463" />
    <path d="M69 96 L82 101 L82 112 Q82 122 69 127 Q56 122 56 112 L56 101 Z" fill="#b23a48" />
    <path d="M69 96 L82 101 L82 112 Q82 122 69 127 Q56 122 56 112 L56 101 Z" fill="none" stroke="#f0c463" stroke-width="2" />
    <rect x="66.6" y="103" width="4.8" height="15" rx="1.6" fill="#f0c463" />
    <rect x="61.5" y="107.5" width="15" height="4.8" rx="1.6" fill="#f0c463" />
    <circle cx="45" cy="93" r="10" fill="#b3bdd0" />
    <circle cx="45" cy="93" r="10" fill="none" stroke="#8a96ac" stroke-width="2" />
    <circle cx="93" cy="93" r="10" fill="#c3cddd" />
    <circle cx="93" cy="93" r="10" fill="none" stroke="#97a2b8" stroke-width="2" />
    <circle cx="45" cy="93" r="2.2" fill="url(#goldFill)" />
    <circle cx="93" cy="93" r="2.2" fill="url(#goldFill)" />
  </g>

  <!-- Greeting arm: drawn RAISED; CSS rotates it down at the shoulder while
       walking, releases it to wave on arrival, and lowers it while presenting -->
  <g id="arm-wave">
    <path d="M93 99 Q114 70 120 50" stroke="#97a2b8" stroke-width="14" stroke-linecap="round" fill="none" />
    <path d="M111 68 Q116 58 119 52" stroke="url(#goldFill)" stroke-width="14" stroke-linecap="butt" fill="none" />
    <circle cx="121" cy="47" r="9.5" fill="#6d788f" />
    <circle cx="121" cy="47" r="9.5" fill="none" stroke="#5d6880" stroke-width="1.5" />
  </g>

  <!-- Head: helm with a grand flowing plume, angular visor, and heroic
       glowing eyes inside it -->
  <g id="head">
    <g id="plume">
      <path d="M64 22 Q50 -2 16 3 Q36 8 29 17 Q46 18 42 25 Q56 23 58 28 Z" fill="#8c2438" />
      <path d="M66 21 Q57 0 32 1 Q48 7 43 16 Q56 17 53 24 Q63 22 64 26 Z" fill="#c23a50" />
      <path d="M68 20 Q63 3 48 2 Q58 9 53 16 Q63 17 61 23 Q67 21 68 24 Z" fill="#e05a6d" />
      <path d="M62 15 Q55 5 43 3" stroke="#f28a99" stroke-width="2.4" stroke-linecap="round" fill="none" />
      <rect x="60" y="15" width="16" height="9" rx="4" fill="url(#goldFill)" />
    </g>
    <circle cx="69" cy="50" r="32" fill="url(#helmFill)" />
    <path d="M44 32 Q56 20 72 20" stroke="#ffffff" stroke-width="4" stroke-linecap="round" fill="none" opacity="0.5" />
    <path d="M40 37 L69 30.5 L98 37" stroke="url(#goldFill)" stroke-width="4.5" fill="none" stroke-linecap="round" />
    <path d="M43 41.5 L69 45.5 L95 41.5 L96.5 50 L92 56.5 L46 56.5 L41.5 50 Z" fill="#1b1f2b" />
    <g id="eyes">
      <path d="M48 43.5 L66 47.5 L65.5 53.5 L48 49.5 Z" fill="#7fd4ff" opacity="0.35" />
      <path d="M90 43.5 L72 47.5 L72.5 53.5 L90 49.5 Z" fill="#7fd4ff" opacity="0.35" />
      <path d="M50 45 L64.5 48.3 L64.2 51.8 L50 48.6 Z" fill="#eaf7ff" />
      <path d="M88 45 L73.5 48.3 L73.8 51.8 L88 48.6 Z" fill="#eaf7ff" />
    </g>
    <line x1="61" y1="63" x2="61" y2="71" stroke="#6d788f" stroke-width="2.4" stroke-linecap="round" />
    <line x1="69" y1="64" x2="69" y2="73" stroke="#6d788f" stroke-width="2.4" stroke-linecap="round" />
    <line x1="77" y1="63" x2="77" y2="71" stroke="#6d788f" stroke-width="2.4" stroke-linecap="round" />
  </g>
</svg>`;

export const KNIGHT: Character = {
  id: 'knight',
  partIds: [...CORE_PART_IDS, 'cape', 'plume'],
  svg: KNIGHT_SVG,
};
