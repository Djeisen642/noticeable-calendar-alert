/**
 * Character animation orchestration.
 *
 * The heavy lifting (movement, the wave, the bubble fade) is done by CSS
 * `@keyframes` and transitions defined in `styles.css` — the GPU compositor
 * handles those for free. This module is just a tiny state machine that toggles
 * classes/attributes and awaits the corresponding DOM events.
 */

export type CharacterState = 'idle' | 'walking' | 'waving';

/** The DOM nodes the animator drives. Resolved once at startup. */
export interface OverlayElements {
  readonly stage: HTMLElement;
  readonly character: HTMLElement;
  readonly bubble: HTMLElement;
  readonly title: HTMLElement;
  readonly time: HTMLElement;
  readonly joinButton: HTMLButtonElement;
}

/** Content rendered into the speech bubble. */
export interface BubbleContent {
  readonly title: string;
  readonly countdown: string;
  readonly joinUrl: string | null;
}

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Await a specific CSS transition on `el`, with a timeout fallback so a missed
 * `transitionend` (e.g. when the property doesn't actually change) can never
 * wedge the sequence.
 */
function awaitTransition(el: HTMLElement, property: string, timeoutMs: number): Promise<void> {
  return new Promise((resolve) => {
    let done = false;
    const finish = (): void => {
      if (done) return;
      done = true;
      el.removeEventListener('transitionend', onEnd);
      resolve();
    };
    const onEnd = (event: TransitionEvent): void => {
      if (event.target === el && event.propertyName === property) finish();
    };
    el.addEventListener('transitionend', onEnd);
    setTimeout(finish, timeoutMs);
  });
}

/**
 * Drives the full attention sequence:
 *   off-screen right → walk in → stop → wave → fade in the speech bubble,
 * and the reverse on dismissal.
 */
export class OverlayAnimator {
  private readonly el: OverlayElements;
  private state: CharacterState = 'idle';

  constructor(elements: OverlayElements) {
    this.el = elements;
  }

  get currentState(): CharacterState {
    return this.state;
  }

  /** Run the entrance and reveal the bubble. Idempotent while already shown. */
  async present(content: BubbleContent): Promise<void> {
    this.renderBubble(content);

    // 1. Walk in from off-screen right (CSS transitions the transform).
    this.setState('walking');
    this.el.character.classList.add('is-onstage');
    await awaitTransition(this.el.character, 'transform', 1400);

    // 2. Plant feet and wave.
    this.setState('waving');
    await sleep(900);

    // 3. Fade in the speech bubble.
    this.el.bubble.classList.remove('is-hidden');
    // Force a reflow so the opacity transition actually runs.
    void this.el.bubble.offsetWidth;
    this.el.bubble.classList.add('is-visible');
  }

  /** Reverse of `present`: hide the bubble, then walk the character off. */
  async dismiss(): Promise<void> {
    this.el.bubble.classList.remove('is-visible');
    await awaitTransition(this.el.bubble, 'opacity', 600);
    this.el.bubble.classList.add('is-hidden');

    this.setState('walking');
    this.el.character.classList.remove('is-onstage');
    await awaitTransition(this.el.character, 'transform', 1400);

    this.setState('idle');
  }

  private renderBubble(content: BubbleContent): void {
    this.el.title.textContent = content.title;
    this.el.time.textContent = content.countdown;

    const hasLink = content.joinUrl !== null && content.joinUrl.length > 0;
    this.el.joinButton.hidden = !hasLink;
    this.el.joinButton.dataset.url = content.joinUrl ?? '';
  }

  /** Update just the countdown text without replaying the entrance. */
  updateCountdown(countdown: string): void {
    this.el.time.textContent = countdown;
  }

  private setState(state: CharacterState): void {
    this.state = state;
    this.el.character.dataset.state = state;
  }
}
