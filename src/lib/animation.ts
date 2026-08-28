/**
 * Character animation orchestration.
 *
 * The heavy lifting (movement, the wave, the bubble fade) is done by CSS
 * `@keyframes` and transitions defined in `styles.css` — the GPU compositor
 * handles those for free. This module is just a tiny state machine that toggles
 * classes/attributes and awaits the corresponding DOM events.
 */

import { DETAILS_LABEL, JOIN_LABEL, resolveMeetingAction } from './action.ts';
import type { BubbleContent, MeetingChoice } from './bubble.ts';
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
  /** Host for the per-meeting pick list, used only when meetings collide. */
  readonly choices: HTMLElement;
  readonly joinButton: HTMLButtonElement;
  readonly dismissButton: HTMLButtonElement;
}

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
      this.renderChoices([], 0, null);
      this.el.joinButton.hidden = false;
      this.el.joinButton.textContent = 'Reconnect';
      this.el.joinButton.dataset.url = '';
      return;
    }

    this.el.time.textContent = content.countdown;
    this.setUrgency(content.urgency);
    const [only] = content.meetings;

    if (content.meetings.length > 1) {
      // Several meetings start at the same moment: no single primary button can
      // be right, so the bubble lists them and the user picks one.
      this.el.bubble.setAttribute('aria-label', 'Several meetings starting at once');
      this.renderChoices(content.meetings, content.hiddenCount, content.calendarUrl);
      this.el.joinButton.hidden = true;
      this.el.joinButton.dataset.url = '';
      return;
    }

    this.el.bubble.setAttribute('aria-label', 'Upcoming meeting reminder');
    this.renderChoices([], 0, null);
    // A meeting without a video link still gets a button — it points at the
    // event's own calendar page instead of a call. Only when there's neither
    // does the button disappear.
    const action = only === undefined ? null : resolveMeetingAction(only);
    this.el.joinButton.hidden = action === null;
    this.el.joinButton.textContent = action?.label ?? JOIN_LABEL;
    this.el.joinButton.dataset.url = action?.url ?? '';
  }

  /**
   * Fill (or clear) the pick list shown when meetings collide.
   *
   * Each row resolves its own action (lib/action.ts) exactly as the single
   * button does: the call when there is one, otherwise the event's calendar
   * page, otherwise nothing to click. The row is labelled with the meeting
   * title — that is what the user is choosing between — and a details-only row
   * is styled apart and tagged, so a glance says which of the clashing
   * meetings is an actual call.
   *
   * Titles come from calendar data — untrusted input — so every node is built
   * with `createElement`/`textContent`, never `innerHTML`. A meeting with
   * neither link still gets a row (hiding it would be worse than showing it is
   * unreachable), just not a clickable one.
   */
  private renderChoices(
    meetings: readonly MeetingChoice[],
    hiddenCount: number,
    calendarUrl: string | null,
  ): void {
    this.el.choices.replaceChildren();
    this.el.choices.hidden = meetings.length === 0;
    if (meetings.length === 0) return;

    for (const meeting of meetings) {
      const item = document.createElement('li');
      item.className = 'bubble__choice';
      const action = resolveMeetingAction(meeting);

      if (action === null) {
        const label = document.createElement('span');
        label.className = 'bubble__choice-label';
        label.textContent = meeting.title;
        const note = document.createElement('span');
        note.className = 'bubble__choice-note';
        note.textContent = 'No link';
        item.append(label, note);
        this.el.choices.append(item);
        continue;
      }

      const button = document.createElement('button');
      button.type = 'button';
      button.className =
        action.kind === 'join'
          ? 'bubble__join bubble__join--choice'
          : 'bubble__join bubble__join--choice bubble__join--details';
      button.textContent = meeting.title;
      // The visible text is the title; the accessible name says what clicking
      // it actually does, which the title alone doesn't convey.
      button.setAttribute('aria-label', `${action.label}: ${meeting.title}`);
      button.dataset.url = action.url;
      item.append(button);

      if (action.kind === 'details') {
        const note = document.createElement('span');
        note.className = 'bubble__choice-note';
        note.textContent = DETAILS_LABEL;
        item.append(note);
      }

      this.el.choices.append(item);
    }

    if (hiddenCount > 0) {
      this.el.choices.append(this.buildOverflowRow(hiddenCount, calendarUrl));
    }
  }

  /**
   * The "+N more" row closing a capped pick list.
   *
   * The count is always shown, so a clash the list could not fit is disclosed
   * rather than silently trimmed. When the calendar link resolves it is a
   * button that opens the day's Google Calendar view — the one place that can
   * show the rest — and otherwise a plain label, since a button that goes
   * nowhere is worse than none.
   */
  private buildOverflowRow(hiddenCount: number, calendarUrl: string | null): HTMLLIElement {
    const item = document.createElement('li');
    item.className = 'bubble__choice bubble__choice--more';
    const text = `+${String(hiddenCount)} more`;

    if (calendarUrl === null) {
      const label = document.createElement('span');
      label.className = 'bubble__choice-note';
      label.textContent = text;
      item.append(label);
      return item;
    }

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'bubble__more';
    button.textContent = text;
    button.setAttribute('aria-label', 'View all meetings in Google Calendar');
    button.dataset.url = calendarUrl;
    item.append(button);
    return item;
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
