/**
 * The vector character — a grim herald knight, scimitar raised — as a single
 * self-contained module.
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
      <stop offset="0" stop-color="#aeb7c6" />
      <stop offset="0.55" stop-color="#7c8697" />
      <stop offset="1" stop-color="#596274" />
    </linearGradient>
    <linearGradient id="helmFill" x1="0.2" y1="0" x2="0.8" y2="1">
      <stop offset="0" stop-color="#c2cbd9" />
      <stop offset="0.6" stop-color="#8d97ab" />
      <stop offset="1" stop-color="#6a7386" />
    </linearGradient>
    <linearGradient id="capeFill" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#9c2438" />
      <stop offset="1" stop-color="#5f1220" />
    </linearGradient>
    <linearGradient id="goldFill" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#f0c463" />
      <stop offset="1" stop-color="#c9952f" />
    </linearGradient>
    <linearGradient id="bladeFill" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#7d8aa0" />
      <stop offset="0.5" stop-color="#525c70" />
      <stop offset="1" stop-color="#343b4a" />
    </linearGradient>
  </defs>

  <!-- Ground shadow -->
  <ellipse cx="68" cy="183" rx="34" ry="6" fill="#000000" opacity="0.16" />

  <!-- Cape (hangs from the shoulders, behind everything) -->
  <g id="cape">
    <path d="M44 88 Q20 120 24 162 Q36 152 48 160 Q64 150 80 160 Q94 152 108 158 Q112 118 94 88 Z" fill="url(#capeFill)" />
    <path d="M48 92 Q30 122 32 154 Q42 146 52 152 Q46 122 52 94 Z" fill="#47101d" opacity="0.55" />
    <path d="M90 92 Q102 122 104 152 Q96 146 88 150 Q94 122 86 94 Z" fill="#47101d" opacity="0.35" />
  </g>

  <!-- Legs: greaves with knee cops + sabatons -->
  <g id="leg-left">
    <rect x="53" y="146" width="13" height="30" rx="6.5" fill="#6b7488" />
    <circle cx="59.5" cy="150" r="5" fill="#7f8a9e" />
    <ellipse cx="58" cy="177" rx="11.5" ry="6" fill="#414959" />
    <ellipse cx="56" cy="175.5" rx="7" ry="3.4" fill="#5c6577" />
  </g>
  <g id="leg-right">
    <rect x="70" y="146" width="13" height="30" rx="6.5" fill="#5f6879" />
    <circle cx="76.5" cy="150" r="5" fill="#737e92" />
    <ellipse cx="78" cy="177" rx="11.5" ry="6" fill="#3a4150" />
    <ellipse cx="76" cy="175.5" rx="7" ry="3.4" fill="#525b6c" />
  </g>

  <!-- Sword arm: bent at the elbow so the forearm raises the fist to waist
       height, with the scimitar continuing that line — a long curved blade
       (cutting edge outward, flared toward the sharp tip) standing beside the
       helm. Gold vambrace on the forearm; blade/grip drawn before the fist so
       the gauntlet grips it just under the gold guard. NOTE: styles.css pins
       this group's swing pivot to the shoulder at 36px 97px (view-box coords)
       because the blade stretches the group's bounding box. -->
  <g id="arm-rest">
    <path d="M36 98 Q31 106 29.5 117" stroke="#737e92" stroke-width="13" stroke-linecap="round" fill="none" />
    <path d="M29.5 117 Q26 112 22.5 105" stroke="#737e92" stroke-width="12" stroke-linecap="round" fill="none" />
    <path d="M27.5 113.5 Q26 111 24.5 108.5" stroke="url(#goldFill)" stroke-width="12" stroke-linecap="butt" fill="none" />
    <path d="M16 93 C11 75 6 57 0.5 38 L0 26 C7 34 11 44 12.5 53 L18 50.5 C21 66 24 80 26 93 Z" fill="url(#bladeFill)" />
    <path d="M13.5 84 C9.5 70 6 56 2.5 40" stroke="#ffffff" stroke-width="1.3" fill="none" opacity="0.75" />
    <path d="M10.5 96 Q21 90 31.5 93.5 Q21 100 10.5 96 Z" fill="url(#goldFill)" />
    <rect x="18.2" y="95.5" width="5.6" height="13" rx="2.4" fill="#4a2c18" transform="rotate(-10 21 101)" />
    <circle cx="23" cy="112.5" r="4.5" fill="url(#goldFill)" />
    <circle cx="23" cy="112.5" r="2.2" fill="#b23a48" />
    <circle cx="21" cy="101" r="8.5" fill="#4f5866" />
    <circle cx="21" cy="101" r="8.5" fill="none" stroke="#3a4150" stroke-width="1.5" />
  </g>

  <!-- Body: cuirass, faulds, gold belt + buckle, crest shield, pauldrons -->
  <g id="body">
    <rect x="38" y="84" width="62" height="74" rx="26" fill="url(#armorFill)" />
    <path d="M42 96 Q40 118 44 134" stroke="#ffffff" stroke-width="4" stroke-linecap="round" fill="none" opacity="0.22" />
    <rect x="40" y="136" width="58" height="11" rx="5.5" fill="#6b7488" />
    <rect x="43" y="145" width="52" height="10" rx="5" fill="#5f6879" />
    <rect x="38" y="126" width="62" height="9" fill="url(#goldFill)" />
    <rect x="63" y="124" width="12" height="13" rx="2.5" fill="#c9952f" />
    <rect x="65.5" y="126.5" width="7" height="8" rx="1.5" fill="#f0c463" />
    <path d="M69 96 L82 101 L82 112 Q82 122 69 127 Q56 122 56 112 L56 101 Z" fill="#b23a48" />
    <path d="M69 96 L82 101 L82 112 Q82 122 69 127 Q56 122 56 112 L56 101 Z" fill="none" stroke="#f0c463" stroke-width="2" />
    <rect x="66.6" y="103" width="4.8" height="15" rx="1.6" fill="#f0c463" />
    <rect x="61.5" y="107.5" width="15" height="4.8" rx="1.6" fill="#f0c463" />
    <path d="M37 88 L44 74 L50 87 Z" fill="#7c8697" />
    <path d="M89 87 L95 73 L101 87 Z" fill="#8d97ab" />
    <circle cx="45" cy="93" r="10" fill="#8d97ab" />
    <circle cx="45" cy="93" r="10" fill="none" stroke="#5c6577" stroke-width="2" />
    <circle cx="93" cy="93" r="10" fill="#9aa4b6" />
    <circle cx="93" cy="93" r="10" fill="none" stroke="#6a7386" stroke-width="2" />
    <circle cx="45" cy="93" r="2.2" fill="url(#goldFill)" />
    <circle cx="93" cy="93" r="2.2" fill="url(#goldFill)" />
  </g>

  <!-- Greeting arm: drawn RAISED; CSS rotates it down at the shoulder while
       walking, releases it to wave on arrival, and lowers it while presenting -->
  <g id="arm-wave">
    <path d="M93 99 Q114 70 120 50" stroke="#737e92" stroke-width="14" stroke-linecap="round" fill="none" />
    <path d="M111 68 Q116 58 119 52" stroke="url(#goldFill)" stroke-width="14" stroke-linecap="butt" fill="none" />
    <circle cx="121" cy="47" r="9.5" fill="#4f5866" />
    <circle cx="121" cy="47" r="9.5" fill="none" stroke="#3a4150" stroke-width="1.5" />
  </g>

  <!-- Head: helm with a jagged flame plume, scowling angular visor, and
       ember slit eyes glowing inside it. No smile, no sparkles. -->
  <g id="head">
    <g id="plume">
      <path d="M66 21 L28 1 L43 13 L16 12 L39 21 L56 26 Z" fill="#5f1220" />
      <path d="M67 20 L39 3 L50 13 L28 16 L51 22 L63 25 Z" fill="#9c2438" />
      <path d="M68 19 L51 6 L57 14 L43 17 L59 21 L66 23 Z" fill="#c73a50" />
      <rect x="60" y="15" width="16" height="9" rx="4" fill="url(#goldFill)" />
    </g>
    <circle cx="69" cy="50" r="32" fill="url(#helmFill)" />
    <path d="M44 32 Q56 20 72 20" stroke="#ffffff" stroke-width="4" stroke-linecap="round" fill="none" opacity="0.3" />
    <path d="M40 37 L69 30.5 L98 37" stroke="url(#goldFill)" stroke-width="4.5" fill="none" stroke-linecap="round" />
    <path d="M43 41 L69 47 L95 41 L96.5 50 L92 57 L46 57 L41.5 50 Z" fill="#14171f" />
    <g id="eyes">
      <path d="M47.5 42.5 L66.5 48 L66 55 L47.5 49.5 Z" fill="#ff3b1f" opacity="0.3" />
      <path d="M90.5 42.5 L71.5 48 L72 55 L90.5 49.5 Z" fill="#ff3b1f" opacity="0.3" />
      <path d="M49 44 L65 48.7 L64.6 52.6 L49 47.9 Z" fill="#ff6a3d" />
      <path d="M89 44 L73 48.7 L73.4 52.6 L89 47.9 Z" fill="#ff6a3d" />
      <path d="M51 45.4 L63 48.9 L62.8 50.7 L51 47.2 Z" fill="#ffd9a0" />
      <path d="M87 45.4 L75 48.9 L75.2 50.7 L87 47.2 Z" fill="#ffd9a0" />
    </g>
    <line x1="61" y1="63" x2="61" y2="71" stroke="#4a5364" stroke-width="2.4" stroke-linecap="round" />
    <line x1="69" y1="64" x2="69" y2="73" stroke="#4a5364" stroke-width="2.4" stroke-linecap="round" />
    <line x1="77" y1="63" x2="77" y2="71" stroke="#4a5364" stroke-width="2.4" stroke-linecap="round" />
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
