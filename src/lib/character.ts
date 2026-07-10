/**
 * The vector character — a friendly herald knight — as a single self-contained
 * module.
 *
 * Keeping the SVG here (instead of inlined in `index.html`) gives the mascot
 * one obvious home: every animatable part has a stable id that `styles.css`
 * targets, and `character.test.ts` guards those ids (in both directions: the
 * SVG defines each exactly once, and every id selector in styles.css names a
 * declared part) so a redesign can't silently break the choreography.
 *
 * Animatable parts (each id is a CSS animation hook — see styles.css):
 *   #leg-left / #leg-right — alternate stepping while walking
 *   #arm-rest             — the sword arm, blade point-down at the side;
 *                           swings counter to the legs while walking
 *   #arm-wave             — the greeting arm; tucked down while walking,
 *                           raised + waved on arrival, lowered while presenting
 *   #body                 — breathes gently while presenting
 *   #head                 — subtle sway while presenting
 *   #eyes                 — periodic blink whenever the character is on stage
 *   #plume                — the helm's crimson plume; sways on stage
 *   #cape                 — the cape; billows softly whenever on stage
 */

/** Every part id the CSS choreography depends on. */
export const CHARACTER_PART_IDS = [
  'cape',
  'leg-left',
  'leg-right',
  'arm-rest',
  'arm-wave',
  'body',
  'head',
  'eyes',
  'plume',
] as const;

/**
 * Static, trusted markup — no user or calendar data ever flows through here.
 * Draw order (back to front): shadow, cape, legs, tucked arm, body, waving
 * arm, head (plume drawn behind the helm).
 */
export const CHARACTER_SVG = `<svg viewBox="0 0 140 190" width="140" height="190" xmlns="http://www.w3.org/2000/svg">
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
      <stop offset="0" stop-color="#eef2f8" />
      <stop offset="0.5" stop-color="#c3cddd" />
      <stop offset="1" stop-color="#93a0b6" />
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

  <!-- Sword arm (tucked at the side), gold vambrace band. The longsword is
       drawn vertical through the fist, then angled 20deg outward so the long
       blade clears the ground in a heroic guard stance. Drawn before the fist
       so the gauntlet grips it. -->
  <g id="arm-rest">
    <rect x="29" y="92" width="14" height="46" rx="7" fill="#97a2b8" />
    <rect x="29" y="118" width="14" height="9" rx="4.5" fill="url(#goldFill)" />
    <g transform="rotate(10 33 140)">
      <circle cx="33" cy="124" r="5" fill="url(#goldFill)" />
      <circle cx="33" cy="124" r="2.4" fill="#b23a48" />
      <rect x="30.2" y="126" width="5.6" height="20" rx="2.4" fill="#6b3f22" />
      <path d="M28.2 151 L30.5 178 L33 186 L35.5 178 L37.8 151 Z" fill="url(#bladeFill)" />
      <rect x="32.3" y="154" width="1.4" height="27" rx="0.7" fill="#93a0b6" />
      <line x1="29.8" y1="154" x2="31.6" y2="180" stroke="#ffffff" stroke-width="0.9" opacity="0.6" />
      <path d="M20 149.5 Q33 143.5 46 149.5 Q33 155.5 20 149.5 Z" fill="url(#goldFill)" />
      <circle cx="33" cy="149.4" r="2.8" fill="#c9952f" />
    </g>
    <circle cx="36" cy="140" r="8.5" fill="#6d788f" />
    <circle cx="36" cy="140" r="8.5" fill="none" stroke="#5d6880" stroke-width="1.5" />
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

  <!-- Head: plumed helm, gold brow band, visor slit with expressive eyes -->
  <g id="head">
    <g id="plume">
      <path d="M64 22 Q52 0 18 3 Q36 8 30 16 Q46 17 42 24 Q56 22 58 27 Z" fill="#8c2438" />
      <path d="M66 21 Q58 1 34 2 Q49 8 44 16 Q57 17 54 24 Q63 22 64 26 Z" fill="#c23a50" />
      <path d="M68 20 Q64 4 50 3 Q60 9 55 16 Q64 17 62 23 Q67 21 68 24 Z" fill="#e05a6d" />
      <path d="M63 16 Q56 6 44 5" stroke="#f28a99" stroke-width="2.4" stroke-linecap="round" fill="none" />
      <rect x="60" y="15" width="16" height="9" rx="4" fill="url(#goldFill)" />
    </g>
    <circle cx="69" cy="50" r="32" fill="url(#helmFill)" />
    <path d="M44 32 Q56 20 72 20" stroke="#ffffff" stroke-width="4" stroke-linecap="round" fill="none" opacity="0.5" />
    <path d="M40 38 Q69 29 98 38" stroke="url(#goldFill)" stroke-width="4.5" fill="none" stroke-linecap="round" />
    <rect x="43" y="41" width="52" height="15" rx="7.5" fill="#1b1f2b" />
    <circle cx="47.5" cy="48.5" r="1.6" fill="#c9952f" />
    <circle cx="90.5" cy="48.5" r="1.6" fill="#c9952f" />
    <g id="eyes">
      <ellipse cx="60" cy="48" rx="5.2" ry="4.6" fill="#ffffff" />
      <ellipse cx="80" cy="48" rx="5.2" ry="4.6" fill="#ffffff" />
      <circle cx="60.6" cy="48.5" r="3.1" fill="#2b2b3a" />
      <circle cx="80.6" cy="48.5" r="3.1" fill="#2b2b3a" />
      <circle cx="61.7" cy="47" r="1.2" fill="#ffffff" />
      <circle cx="81.7" cy="47" r="1.2" fill="#ffffff" />
    </g>
    <line x1="61" y1="63" x2="61" y2="71" stroke="#6d788f" stroke-width="2.4" stroke-linecap="round" />
    <line x1="69" y1="64" x2="69" y2="73" stroke="#6d788f" stroke-width="2.4" stroke-linecap="round" />
    <line x1="77" y1="63" x2="77" y2="71" stroke="#6d788f" stroke-width="2.4" stroke-linecap="round" />
    <path d="M45 66 Q69 84 93 66" stroke="#8a96ac" stroke-width="2" fill="none" opacity="0.7" />
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
