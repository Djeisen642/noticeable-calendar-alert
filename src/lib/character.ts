/**
 * The vector characters — a rotating cast of mascots, as a single
 * self-contained module. Each alert brings the next character in the roster
 * on stage (knight, then dragon, then back around).
 *
 * Keeping the SVGs here (instead of inlined in `index.html`) gives the cast
 * one obvious home: every animatable part has a stable id that `styles.css`
 * targets, and `character.test.ts` guards those ids (in both directions: each
 * character defines each of its ids exactly once, and every id selector in
 * styles.css names a part some character declares) so a redesign can't
 * silently break the choreography.
 *
 * Shared choreography contract (every character MUST define these ids —
 * `OverlayAnimator`'s walk/wave/present states depend on them):
 *   #leg-left / #leg-right — alternate stepping while walking
 *   #arm-rest             — the resting arm; sways gently while walking
 *   #arm-wave             — the greeting arm; drawn RAISED, tucked down while
 *                           walking, waved on arrival, lowered while presenting
 *   #body                 — breathes gently while presenting
 *   #head                 — subtle sway while presenting
 *   #eyes                 — periodic blink whenever the character is on stage
 *
 * Character-specific parts (only that character's SVG defines them; the CSS
 * rules targeting them are inert for everyone else):
 *   knight — #plume (helm plume sway), #cape (billow)
 *   dragon — #wing-left / #wing-right (flap), #tail (sway), #fire +
 *            #fire-inner (the breath: a blast while greeting, periodic puffs
 *            while presenting), #smoke (nostril puffs after each breath)
 *
 * The README embeds the cast from `docs/<id>.svg`. After editing a
 * character's SVG, regenerate its file (content is the SVG plus a trailing
 * newline) — `character.test.ts` fails if the two drift apart.
 */

/** Ids every character must define — the animator's choreography contract. */
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
 * The knight. Draw order (back to front): shadow, cape, legs, sword arm +
 * greatsword, body, waving arm, head (plume drawn behind the helm).
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

/**
 * The dragon. Draw order (back to front): shadow, tail, wings, legs, resting
 * arm, body (belly plates + side spikes), waving arm, head (horns, crest,
 * frills, muzzle, eyes — with the fire breath and nostril smoke anchored at
 * the mouth, on top of everything).
 *
 * The fire is drawn pointing LEFT from the mouth inside a wrapper rotated 38°
 * clockwise, so it breathes up-and-away from the speech bubble; it is hidden
 * (opacity 0) until the waving blast / presenting puffs animate it.
 */
const DRAGON_SVG = `<svg viewBox="0 0 140 190" width="140" height="190" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="scaleFill" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#7ede9a" />
      <stop offset="0.55" stop-color="#4db071" />
      <stop offset="1" stop-color="#3a9257" />
    </linearGradient>
    <linearGradient id="dragonHeadFill" x1="0.2" y1="0" x2="0.8" y2="1">
      <stop offset="0" stop-color="#8ae6a4" />
      <stop offset="0.6" stop-color="#54b877" />
      <stop offset="1" stop-color="#3e9a5e" />
    </linearGradient>
    <linearGradient id="bellyFill" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#f9edc4" />
      <stop offset="1" stop-color="#e2c88f" />
    </linearGradient>
    <linearGradient id="wingFill" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffab63" />
      <stop offset="1" stop-color="#e2672f" />
    </linearGradient>
    <linearGradient id="hornFill" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#f7ecce" />
      <stop offset="1" stop-color="#d9c496" />
    </linearGradient>
  </defs>

  <!-- Ground shadow -->
  <ellipse cx="68" cy="183" rx="34" ry="6" fill="#000000" opacity="0.16" />

  <!-- Tail: curls out to the right, tipped with a cream spade -->
  <g id="tail">
    <path d="M90 150 Q118 164 126 146" stroke="url(#scaleFill)" stroke-width="14" stroke-linecap="round" fill="none" />
    <path d="M124 150 Q129 140 127 128" stroke="#4aa869" stroke-width="8" stroke-linecap="round" fill="none" />
    <path d="M127 109 L137 124 L127 120 L117 124 Z" fill="url(#hornFill)" />
  </g>

  <!-- Wings: bat-style, fire-orange membrane on dark-green bones -->
  <g id="wing-left">
    <path d="M47 92 Q26 70 9 62 L3 100 Q11 95 15 105 Q23 99 26 111 Q34 105 37 117 Q42 112 48 118 Z" fill="url(#wingFill)" />
    <path d="M9 63 L5 98" stroke="#c2531f" stroke-width="1.6" fill="none" opacity="0.5" />
    <path d="M11 64 L16 102" stroke="#c2531f" stroke-width="1.6" fill="none" opacity="0.5" />
    <path d="M14 66 L26 108" stroke="#c2531f" stroke-width="1.6" fill="none" opacity="0.5" />
    <path d="M47 92 Q26 70 9 62" stroke="#2f7a49" stroke-width="6" stroke-linecap="round" fill="none" />
    <path d="M9 62 L2 55 L12 57 Z" fill="url(#hornFill)" />
  </g>
  <g id="wing-right">
    <path d="M92 90 Q113 68 130 60 L136 98 Q128 93 124 103 Q116 97 113 109 Q105 103 102 115 Q97 110 91 116 Z" fill="url(#wingFill)" />
    <path d="M130 61 L134 96" stroke="#c2531f" stroke-width="1.6" fill="none" opacity="0.5" />
    <path d="M128 62 L123 100" stroke="#c2531f" stroke-width="1.6" fill="none" opacity="0.5" />
    <path d="M125 64 L113 106" stroke="#c2531f" stroke-width="1.6" fill="none" opacity="0.5" />
    <path d="M92 90 Q113 68 130 60" stroke="#2f7a49" stroke-width="6" stroke-linecap="round" fill="none" />
    <path d="M130 60 L137 53 L127 55 Z" fill="url(#hornFill)" />
  </g>

  <!-- Legs: stout haunches + three-clawed feet -->
  <g id="leg-left">
    <rect x="53" y="146" width="13" height="30" rx="6.5" fill="#4aa869" />
    <ellipse cx="57" cy="175" rx="12" ry="6.5" fill="#3a9257" />
    <path d="M49 172 L43 178 L51 180 Z" fill="url(#hornFill)" />
    <path d="M54 175 L50 182 L58 181 Z" fill="url(#hornFill)" />
    <path d="M60 176 L58 183 L65 181 Z" fill="url(#hornFill)" />
  </g>
  <g id="leg-right">
    <rect x="70" y="146" width="13" height="30" rx="6.5" fill="#3f9c60" />
    <ellipse cx="78" cy="175" rx="12" ry="6.5" fill="#338553" />
    <path d="M70 172 L64 178 L72 180 Z" fill="url(#hornFill)" />
    <path d="M75 175 L71 182 L79 181 Z" fill="url(#hornFill)" />
    <path d="M81 176 L79 183 L86 181 Z" fill="url(#hornFill)" />
  </g>

  <!-- Resting arm: hangs at the side, two little claws on the paw -->
  <g id="arm-rest">
    <path d="M44 100 Q35 109 34 121" stroke="#4aa869" stroke-width="12" stroke-linecap="round" fill="none" />
    <circle cx="34" cy="124" r="6.5" fill="#3a9257" />
    <path d="M30 127 L25 134 L32 133 Z" fill="url(#hornFill)" />
    <path d="M35 129 L34 137 L41 132 Z" fill="url(#hornFill)" />
  </g>

  <!-- Body: scaled torso, cream belly plates, spikes along both sides -->
  <g id="body">
    <rect x="38" y="84" width="62" height="74" rx="26" fill="url(#scaleFill)" />
    <path d="M40 98 L31 103 L40 109 Z" fill="#2f7a49" />
    <path d="M40 116 L32 121 L40 126 Z" fill="#2f7a49" />
    <path d="M98 98 L107 103 L98 109 Z" fill="#2f7a49" />
    <path d="M98 116 L106 121 L98 126 Z" fill="#2f7a49" />
    <path d="M69 90 Q88 90 90 116 Q91 146 69 152 Q47 146 48 116 Q50 90 69 90 Z" fill="url(#bellyFill)" />
    <path d="M51 106 Q69 112 87 106" stroke="#d9bc85" stroke-width="2.5" fill="none" />
    <path d="M50 120 Q69 126 88 120" stroke="#d9bc85" stroke-width="2.5" fill="none" />
    <path d="M51 134 Q69 140 87 134" stroke="#d9bc85" stroke-width="2.5" fill="none" />
    <path d="M55 145 Q69 150 83 145" stroke="#d9bc85" stroke-width="2.5" fill="none" />
    <path d="M42 96 Q40 118 44 134" stroke="#ffffff" stroke-width="4" stroke-linecap="round" fill="none" opacity="0.3" />
  </g>

  <!-- Greeting arm: drawn RAISED (same shoulder geometry as the knight so the
       shared tuck/wave choreography fits); three cream claws on the paw -->
  <g id="arm-wave">
    <path d="M93 99 Q114 70 120 50" stroke="#4aa869" stroke-width="14" stroke-linecap="round" fill="none" />
    <circle cx="121" cy="47" r="9.5" fill="#3a9257" />
    <path d="M114 41 L109 32 L118 36 Z" fill="url(#hornFill)" />
    <path d="M120 38 L119 28 L126 35 Z" fill="url(#hornFill)" />
    <path d="M127 42 L133 34 L130 44 Z" fill="url(#hornFill)" />
  </g>

  <!-- Head: horned skull with a muzzle to the left, amber slit-pupil eyes,
       cheek frills, and the fire/smoke anchored at the mouth -->
  <g id="head">
    <g id="smoke">
      <circle cx="30" cy="48" r="3" fill="#b9c3cd" opacity="0.55" />
      <circle cx="26" cy="40" r="2.2" fill="#c9d2da" opacity="0.4" />
    </g>
    <path d="M57 26 C51 14 55 5 66 1 C60 10 62 17 65 24 Z" fill="url(#hornFill)" />
    <path d="M90 27 C97 16 95 6 105 3 C98 12 98 19 94 26 Z" fill="url(#hornFill)" />
    <path d="M70 18 L74 8 L79 18 Z" fill="#2f7a49" />
    <path d="M82 21 L88 13 L90 23 Z" fill="#2f7a49" />
    <circle cx="73" cy="50" r="30" fill="url(#dragonHeadFill)" />
    <path d="M50 34 Q61 22 76 21" stroke="#ffffff" stroke-width="4" stroke-linecap="round" fill="none" opacity="0.35" />
    <path d="M100 42 L112 39 L101 49 Z" fill="#2f7a49" />
    <path d="M101 52 L114 52 L102 60 Z" fill="#3a9257" />
    <ellipse cx="46" cy="60" rx="20" ry="14" fill="url(#bellyFill)" />
    <ellipse cx="33" cy="55" rx="2.6" ry="3.4" fill="#7a5c37" />
    <ellipse cx="40" cy="51" rx="2" ry="2.6" fill="#7a5c37" opacity="0.85" />
    <path d="M27 65 Q44 74 61 69" stroke="#2c6b43" stroke-width="3" stroke-linecap="round" fill="none" />
    <path d="M36 69.5 L39 76 L42 70 Z" fill="#ffffff" />
    <path d="M52 34 Q59 30 66 33" stroke="#2f7a49" stroke-width="3" stroke-linecap="round" fill="none" />
    <path d="M80 33 Q87 30 94 34" stroke="#2f7a49" stroke-width="3" stroke-linecap="round" fill="none" />
    <g id="eyes">
      <ellipse cx="60" cy="42" rx="6.2" ry="7.8" fill="#ffdf6b" />
      <ellipse cx="86" cy="42" rx="6.2" ry="7.8" fill="#ffdf6b" />
      <ellipse cx="59.4" cy="42.6" rx="2.3" ry="5.6" fill="#26200f" />
      <ellipse cx="85.4" cy="42.6" rx="2.3" ry="5.6" fill="#26200f" />
      <circle cx="58" cy="39" r="1.5" fill="#ffffff" />
      <circle cx="84" cy="39" r="1.5" fill="#ffffff" />
    </g>
    <g id="fire">
      <g transform="translate(29 61) rotate(38)">
        <path d="M0 0 C -13 -11 -28 -16 -40 -13 C -35 -9 -36 -6 -45 -8 C -54 -9 -59 -4 -63 1 C -57 4 -53 8 -44 8 C -48 12 -44 15 -35 13 C -22 17 -10 10 0 0 Z" fill="#ff6b2e" />
        <path d="M0 0 C -10 -8 -22 -11 -31 -9 C -27 -6 -28 -4 -36 -5 C -42 -5 -46 -2 -49 1 C -44 4 -40 5 -33 5 C -36 8 -33 10 -27 9 C -17 10 -8 6 0 0 Z" fill="#ffa63d" />
        <g id="fire-inner">
          <path d="M0 0 C -8 -5 -16 -7 -22 -5 C -26 -4 -31 -1 -34 1 C -29 3 -25 4 -20 4 C -13 5 -5 4 0 0 Z" fill="#ffe66b" />
          <path d="M0 0 C -5 -3 -10 -4 -15 -3 C -18 -1 -19 0 -21 1 C -16 3 -10 3 -5 1 Z" fill="#fff6d8" />
        </g>
        <circle cx="-57" cy="-10" r="2.4" fill="#ffa63d" />
        <circle cx="-66" cy="3" r="2" fill="#ff6b2e" />
        <circle cx="-50" cy="10" r="1.7" fill="#ffa63d" />
      </g>
    </g>
  </g>
</svg>`;

export const KNIGHT: Character = {
  id: 'knight',
  partIds: [...CORE_PART_IDS, 'cape', 'plume'],
  svg: KNIGHT_SVG,
};

export const DRAGON: Character = {
  id: 'dragon',
  partIds: [...CORE_PART_IDS, 'wing-left', 'wing-right', 'tail', 'fire', 'fire-inner', 'smoke'],
  svg: DRAGON_SVG,
};

/** The cast, in the order alerts cycle through it. */
export const CHARACTERS: readonly Character[] = [KNIGHT, DRAGON];

/**
 * Round-robin over the cast: `current` is who's up next (mounted at startup so
 * the stage is never empty), `advance()` hands them over and moves the
 * pointer, so each presentation brings the next character on stage.
 */
export class CharacterRotation {
  private readonly roster: readonly Character[];
  private index = 0;

  constructor(roster: readonly Character[] = CHARACTERS) {
    if (roster.length === 0) throw new Error('CharacterRotation needs at least one character');
    this.roster = roster;
  }

  get current(): Character {
    return this.roster[this.index];
  }

  advance(): Character {
    const next = this.current;
    this.index = (this.index + 1) % this.roster.length;
    return next;
  }
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
