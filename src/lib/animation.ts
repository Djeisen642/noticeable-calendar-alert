/**
 * Character animation orchestration.
 *
 * The heavy lifting (movement, the wave, the bubble fade) is done by CSS
 * `@keyframes` and transitions defined in `styles.css` — the GPU compositor
 * handles those for free. This module is just a tiny state machine that toggles
 * classes/attributes and awaits the corresponding DOM events.
 */

import type { CountdownDisplay, Urgency } from './countdown.ts';

/**
 * The character's lifecycle on stage:
 *   idle → walking (entrance) → waving (greeting) → presenting (bubble up,
 *   breathing/blinking) → walking (exit) → idle.
 */
export type CharacterState = 'idle' | 'walking' | 'waving' | 'presenting';

/** The DOM nodes the animator drives. Resolved once at startup. */
export interface OverlayElements {
  readonly stage: HTMLElement;
  readonly character: HTMLElement;
  readonly bubble: HTMLElement;
  readonly title: HTMLElement;
  readonly time: HTMLElement;
  readonly joinButton: HTMLButtonElement;
  readonly dismissButton: HTMLButtonElement;
}

/** Content rendered into the speech bubble for an upcoming/active meeting. */
export interface MeetingBubbleContent extends CountdownDisplay {
  readonly kind: 'meeting';
  readonly title: string;
  readonly joinUrl: string | null;
}

/**
 * Content rendered into the speech bubble when a previously-working Google
 * Calendar connection has silently lapsed (e.g. a revoked/expired refresh
 * token) and needs a fresh interactive sign-in. Reuses the same walk-in/wave
 * entrance as a meeting alert so a dead connection can't go unnoticed until a
 * meeting is actually missed.
 */
export interface ReconnectBubbleContent {
  readonly kind: 'reconnect';
  readonly title: string;
  readonly message: string;
}

export type BubbleContent = MeetingBubbleContent | ReconnectBubbleContent;

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Fallback timeouts for `awaitTransition`. Each MUST stay greater than the
 * matching CSS duration in `styles.css`, so a real transition is always awaited
 * to completion while a missed `transitionend` still can't wedge the sequence.
 * Keep them above their CSS counterparts:
 *   WALK_TIMEOUT_MS        > --walk-duration (1100ms)
 *   BUBBLE_FADE_TIMEOUT_MS > .bubble opacity transition (320ms)
 */
const WALK_TIMEOUT_MS = 1400;
const BUBBLE_FADE_TIMEOUT_MS = 600;
/**
 * How long the greeting plays before the bubble appears: long enough for the
 * arm to raise (~260ms transition in styles.css) plus two full wave cycles.
 */
const WAVE_HOLD_MS = 1400;

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
 *   off-screen right → walk in → stop → wave → fade in the speech bubble →
 *   settle into presenting (breathing, blinking), and the reverse on dismissal.
 */
export class OverlayAnimator {
  private readonly el: OverlayElements;
  private state: CharacterState = 'idle';
  /** Last urgency pushed to the DOM, so the per-second tick skips no-op writes. */
  private urgency: Urgency | null = null;

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
    await awaitTransition(this.el.character, 'transform', WALK_TIMEOUT_MS);

    // 2. Plant feet, raise the arm, and wave.
    this.setState('waving');
    await sleep(WAVE_HOLD_MS);

    // 3. Fade in the speech bubble.
    this.el.bubble.classList.remove('is-hidden');
    // Force a reflow so the opacity transition actually runs.
    void this.el.bubble.offsetWidth;
    this.el.bubble.classList.add('is-visible');

    // 4. Settle in: lower the arm and idle (breathe/blink) beside the bubble.
    this.setState('presenting');
  }

  /** Reverse of `present`: hide the bubble, then walk the character off. */
  async dismiss(): Promise<void> {
    this.el.bubble.classList.remove('is-visible');
    await awaitTransition(this.el.bubble, 'opacity', BUBBLE_FADE_TIMEOUT_MS);
    this.el.bubble.classList.add('is-hidden');

    this.setState('walking');
    this.el.character.classList.remove('is-onstage');
    await awaitTransition(this.el.character, 'transform', WALK_TIMEOUT_MS);

    this.setState('idle');
  }

  private renderBubble(content: BubbleContent): void {
    this.el.title.textContent = content.title;

    if (content.kind === 'reconnect') {
      this.el.time.textContent = content.message;
      // Borrow the same red/pulsing/hop treatment as an imminent meeting —
      // a lapsed connection silently kills every future alert, which is at
      // least as urgent as any single meeting.
      this.setUrgency('now');
      this.el.bubble.setAttribute('aria-label', 'Calendar connection lost');
      this.el.joinButton.hidden = false;
      this.el.joinButton.textContent = 'Reconnect';
      this.el.joinButton.dataset.url = '';
      return;
    }

    this.el.bubble.setAttribute('aria-label', 'Upcoming meeting reminder');
    this.el.joinButton.textContent = 'Join Call';
    this.el.time.textContent = content.countdown;
    this.setUrgency(content.urgency);

    const hasLink = content.joinUrl !== null && content.joinUrl.length > 0;
    this.el.joinButton.hidden = !hasLink;
    this.el.joinButton.dataset.url = content.joinUrl ?? '';
  }

  /** Update just the countdown (text + urgency) without replaying the entrance. */
  updateCountdown(display: CountdownDisplay): void {
    this.el.time.textContent = display.countdown;
    this.setUrgency(display.urgency);
  }

  /**
   * Reflect urgency on the stage — the one shared ancestor — so the character
   * hop and the countdown color/pulse in styles.css can never disagree. Writes
   * are skipped while the level is unchanged (it flips at most twice per alert,
   * but this is called every second).
   */
  private setUrgency(urgency: Urgency): void {
    if (urgency === this.urgency) return;
    this.urgency = urgency;
    this.el.stage.dataset.urgency = urgency;
  }

  private setState(state: CharacterState): void {
    this.state = state;
    this.el.character.dataset.state = state;
  }
}
