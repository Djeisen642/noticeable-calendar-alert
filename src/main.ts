/**
 * Application entry point.
 *
 * Wires the (mocked) calendar sync to the overlay animator: poll for the next
 * meeting, and when it enters the lead window, run the attention sequence —
 * disabling click-through so the "Join Call" button is usable, then restoring
 * it once the character leaves.
 */

import { OverlayAnimator, type OverlayElements } from './lib/animation.ts';
import { MockCalendarSync, type CalendarEvent, type CalendarSync } from './lib/calendar.ts';
import {
  getCountdownDelta,
  formatCountdown,
  shouldAlert,
  type CountdownDelta,
} from './lib/countdown.ts';
import { setClickThrough, openExternal, showOverlay, hideOverlay } from './lib/tauri.ts';

/** How far ahead of a meeting to fire the overlay. */
const LEAD_TIME_MINUTES = 5;
/** How often to re-evaluate the calendar / tick the countdown. */
const POLL_INTERVAL_MS = 1_000;

/** Resolve a required element or fail loudly at startup. */
function mustGet<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (el === null) {
    throw new Error(`Missing required element #${id}`);
  }
  return el as T;
}

function resolveElements(): OverlayElements {
  return {
    stage: mustGet('stage'),
    character: mustGet('character'),
    bubble: mustGet('bubble'),
    title: mustGet('bubble-title'),
    time: mustGet('bubble-time'),
    joinButton: mustGet<HTMLButtonElement>('join-button'),
  };
}

/**
 * Owns the present/dismiss lifecycle for a single alert so we never double-fire
 * for the same meeting.
 */
class AlertController {
  private readonly calendar: CalendarSync;
  private readonly animator: OverlayAnimator;
  private readonly elements: OverlayElements;
  private activeEventId: string | null = null;

  constructor(calendar: CalendarSync, animator: OverlayAnimator, elements: OverlayElements) {
    this.calendar = calendar;
    this.animator = animator;
    this.elements = elements;

    this.elements.joinButton.addEventListener('click', () => {
      const url = this.elements.joinButton.dataset.url;
      if (url) void openExternal(url);
      void this.dismiss();
    });
  }

  /** Single tick: refresh the countdown or decide whether to fire/clear. */
  async tick(): Promise<void> {
    const events = await this.calendar.getUpcomingEvents(LEAD_TIME_MINUTES * 60_000);
    const next = events.at(0) ?? null;
    const now = new Date();

    if (next === null) {
      if (this.activeEventId !== null) await this.dismiss();
      return;
    }

    const delta = getCountdownDelta(next.start, now);

    if (this.activeEventId === next.id) {
      // Already showing this meeting — just keep the countdown fresh.
      this.animator.updateCountdown(formatCountdown(delta));
      if (delta.isPast) await this.dismiss();
      return;
    }

    if (shouldAlert(next.start, now, LEAD_TIME_MINUTES)) {
      await this.present(next, delta);
    }
  }

  private async present(event: CalendarEvent, delta: CountdownDelta): Promise<void> {
    this.activeEventId = event.id;
    await showOverlay();
    // Make the window interactive so the Join button is clickable.
    await setClickThrough(false);
    await this.animator.present({
      title: event.title,
      countdown: formatCountdown(delta),
      joinUrl: event.joinUrl,
    });
  }

  private async dismiss(): Promise<void> {
    this.activeEventId = null;
    await this.animator.dismiss();
    // Restore click-through and tuck the window away.
    await setClickThrough(true);
    await hideOverlay();
  }
}

function bootstrap(): void {
  const elements = resolveElements();
  const animator = new OverlayAnimator(elements);
  // Swap MockCalendarSync for the real GoogleCalendarSync once OAuth lands.
  const calendar = new MockCalendarSync();
  const controller = new AlertController(calendar, animator, elements);

  const loop = (): void => {
    void controller.tick();
  };
  loop();
  window.setInterval(loop, POLL_INTERVAL_MS);
}

window.addEventListener('DOMContentLoaded', bootstrap);
