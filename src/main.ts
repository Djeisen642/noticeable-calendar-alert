/**
 * Application entry point.
 *
 * Wires the (mocked) calendar sync to the overlay animator: poll for the next
 * meeting, and when it enters the lead window, run the attention sequence —
 * disabling click-through so the "Join Call" button is usable, then restoring
 * it once the character leaves.
 */

import { OverlayAnimator, type OverlayElements } from './lib/animation.ts';
import type { CalendarEvent, CalendarSync } from './lib/calendar.ts';
import { createCalendarSync } from './lib/google/config.ts';
import { getCountdownDelta, formatCountdown, type CountdownDelta } from './lib/countdown.ts';
import { shouldPresent } from './lib/alert.ts';
import { authMenuLabel, authToggleAction } from './lib/tray.ts';
import { MS_PER_SECOND, MS_PER_MINUTE } from './lib/time.ts';
import {
  setClickThrough,
  openExternal,
  showOverlay,
  hideOverlay,
  onAuthToggleRequested,
  setAuthMenuLabel,
} from './lib/tauri.ts';

/** How far ahead of a meeting to fire the overlay. */
const LEAD_TIME_MINUTES = 5;
/**
 * How often to hit the calendar API. Kept deliberately slow: the real Google
 * Calendar API is rate-limited, so we cache results and never fetch on the UI
 * cadence.
 */
const FETCH_INTERVAL_MS = 30 * MS_PER_SECOND;
/** How often to refresh the countdown UI from the cached event. No network. */
const TICK_INTERVAL_MS = MS_PER_SECOND;

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
  /** The last event the user dismissed, so we don't immediately re-present it. */
  private dismissedEventId: string | null = null;
  /** Cached soonest event; refreshed on the slow fetch cadence. */
  private next: CalendarEvent | null = null;
  /** True while a present/dismiss animation is in flight (mutual exclusion). */
  private busy = false;

  constructor(calendar: CalendarSync, animator: OverlayAnimator, elements: OverlayElements) {
    this.calendar = calendar;
    this.animator = animator;
    this.elements = elements;

    this.elements.joinButton.addEventListener('click', () => {
      const url = this.elements.joinButton.dataset.url;
      if (url) void openExternal(url);
      void this.runExclusive(() => this.dismiss());
    });
  }

  /**
   * Handle the tray's single auth item: sign in when signed out, otherwise sign
   * out. The label is resynced afterward so the menu always reflects state.
   */
  async toggleAuth(): Promise<void> {
    if (authToggleAction(await this.calendar.isSignedIn()) === 'signOut') {
      await this.signOut();
    } else {
      await this.signIn();
    }
    await this.syncAuthMenu();
  }

  /** Push the current sign-in state to the tray menu label. */
  async syncAuthMenu(): Promise<void> {
    await setAuthMenuLabel(authMenuLabel(await this.calendar.isSignedIn()));
  }

  /** Run the interactive Google sign-in, then refresh immediately. */
  async signIn(): Promise<void> {
    try {
      await this.calendar.authenticate();
      await this.refresh();
    } catch (error) {
      console.error('Google sign-in failed', error);
    }
  }

  /** Forget the account and dismiss any overlay that's currently showing. */
  async signOut(): Promise<void> {
    try {
      await this.calendar.signOut();
      this.next = null;
      await this.tick(); // tears down a visible overlay now that next is null
    } catch (error) {
      console.error('Google sign-out failed', error);
    }
  }

  /** Slow path: refresh the cached event from the calendar API. */
  async refresh(): Promise<void> {
    try {
      const events = await this.calendar.getUpcomingEvents(LEAD_TIME_MINUTES * MS_PER_MINUTE);
      this.next = events.at(0) ?? null;
    } catch (error) {
      console.error('Calendar refresh failed', error);
    }
  }

  /**
   * Fast path: drive the overlay from the cached event. Never touches the
   * network. Re-entrant ticks are dropped so animations never overlap.
   */
  tick(): Promise<void> {
    return this.runExclusive(async () => {
      const next = this.next;
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

      if (
        shouldPresent(next, now, LEAD_TIME_MINUTES, {
          activeEventId: this.activeEventId,
          dismissedEventId: this.dismissedEventId,
        })
      ) {
        await this.present(next, delta);
      }
    });
  }

  /** Serialize overlay mutations so present/dismiss can never interleave. */
  private async runExclusive(fn: () => Promise<void>): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    try {
      await fn();
    } finally {
      this.busy = false;
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
    // Remember what we dismissed so a still-upcoming meeting doesn't pop back
    // up on the next tick (e.g. right after the user clicks "Join Call").
    this.dismissedEventId = this.activeEventId;
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
  // Real GoogleCalendarSync when configured + in the desktop app; mock otherwise.
  const calendar = createCalendarSync();
  const controller = new AlertController(calendar, animator, elements);

  // The tray's single auth item toggles sign-in/out; sync its label to the
  // current state up front (e.g. "Sign out" when a token is already stored).
  void onAuthToggleRequested(() => void controller.toggleAuth());
  void controller.syncAuthMenu();

  // Slow cadence: fetch the calendar. Fast cadence: tick the countdown UI.
  void controller.refresh();
  window.setInterval(() => void controller.refresh(), FETCH_INTERVAL_MS);

  void controller.tick();
  window.setInterval(() => void controller.tick(), TICK_INTERVAL_MS);
}

window.addEventListener('DOMContentLoaded', bootstrap);
