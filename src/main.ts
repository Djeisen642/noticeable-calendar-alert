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
import { demoBubbleContent } from './lib/demo.ts';
import { nextFetchDelayMs } from './lib/poll.ts';
import { authMenuLabel, authToggleAction, formatTrayStatus, type SyncState } from './lib/tray.ts';
import { describeError } from './lib/errors.ts';
import { MS_PER_SECOND, MS_PER_MINUTE } from './lib/time.ts';
import {
  setClickThrough,
  openExternal,
  showOverlay,
  hideOverlay,
  onAuthToggleRequested,
  onSyncNowRequested,
  onTestOverlayRequested,
  setAuthMenuLabel,
  setTrayStatus,
  showError,
} from './lib/tauri.ts';

/** How far ahead of a meeting to fire the overlay. */
const LEAD_TIME_MINUTES = 5;
/**
 * How far ahead to fetch events. This is deliberately *much* wider than the
 * alert lead: `this.next` feeds both the tray "next meeting" line and the
 * adaptive poll cadence (`nextFetchDelayMs`, which scales from "within the hour"
 * down to idle), so it must surface the soonest meeting whenever it is — not
 * only once it's inside the 5-minute alert window. `tick()`/`shouldPresent`
 * still gate the actual overlay on `LEAD_TIME_MINUTES`.
 */
const FETCH_HORIZON_MINUTES = 24 * 60;
/** How often to refresh the countdown UI from the cached event. No network. */
const TICK_INTERVAL_MS = MS_PER_SECOND;
/** How long the tray "Test Overlay" preview stays up before auto-dismissing. */
const DEMO_HOLD_MS = 6 * MS_PER_SECOND;

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
  /** Outcome of the most recent calendar fetch, for the tray sync-health line. */
  private lastSync: SyncState | null = null;
  /** Cached sign-in state so the per-second status re-render needs no keychain. */
  private signedIn = false;
  /** Last text pushed to each tray line, so we only re-push when it changes. */
  private lastConnection: string | null = null;
  private lastMeeting: string | null = null;
  /** True while a present/dismiss animation is in flight (mutual exclusion). */
  private busy = false;
  /** True while a calendar fetch is in flight, so fetches never overlap. */
  private refreshing = false;
  /** True while the adaptive poll loop is active (paused while signed out). */
  private polling = false;
  /** Pending poll-loop timer, so it can be cancelled on sign-out. */
  private pollTimer: number | undefined;
  /** Pending auto-dismiss timer for a "Test Overlay" preview, if any. */
  private demoTimer: number | undefined;

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

  /** Push the current sign-in state to the tray menu label and status lines. */
  async syncAuthMenu(): Promise<void> {
    this.signedIn = await this.calendar.isSignedIn();
    await setAuthMenuLabel(authMenuLabel(this.signedIn));
    this.updateStatus();
  }

  /**
   * Re-render the two tray status lines from cached state and push them only if
   * the text changed. No network or I/O, so it's cheap to call every tick — that
   * keeps the next-meeting countdown live, so it's current the instant the menu
   * is opened (visibility of system status) without spamming identical updates.
   */
  updateStatus(): void {
    const status = formatTrayStatus({
      signedIn: this.signedIn,
      lastSync: this.lastSync,
      next: this.next === null ? null : { title: this.next.title, start: this.next.start },
      now: new Date(),
    });
    if (status.connection === this.lastConnection && status.meeting === this.lastMeeting) {
      return;
    }
    this.lastConnection = status.connection;
    this.lastMeeting = status.meeting;
    void setTrayStatus(status.connection, status.meeting);
  }

  /** Run the interactive Google sign-in, then start polling immediately. */
  async signIn(): Promise<void> {
    try {
      await this.calendar.authenticate();
      this.signedIn = true;
      this.startPolling(); // immediate fetch + resume the adaptive loop
    } catch (error) {
      console.error('Google sign-in failed', error);
      await showError('Google sign-in failed', describeError(error));
    }
  }

  /** Forget the account and dismiss any overlay that's currently showing. */
  async signOut(): Promise<void> {
    try {
      await this.calendar.signOut();
      this.signedIn = false;
      this.stopPolling(); // nothing to poll once the account is gone
      this.next = null;
      this.lastSync = null;
      await this.tick(); // tears down a visible overlay now that next is null
    } catch (error) {
      console.error('Google sign-out failed', error);
      await showError('Google sign-out failed', describeError(error));
    }
  }

  /**
   * Start the adaptive calendar-poll loop. Self-scheduling via `setTimeout`
   * (see lib/poll.ts) so fetches never overlap and the cadence can vary each
   * cycle. A no-op while signed out — there's nothing to poll until the user
   * signs in, which restarts the loop.
   */
  startPolling(): void {
    if (this.polling) return;
    this.polling = true;
    void this.poll();
  }

  /** Halt the poll loop (e.g. on sign-out). */
  stopPolling(): void {
    this.polling = false;
    if (this.pollTimer !== undefined) {
      window.clearTimeout(this.pollTimer);
      this.pollTimer = undefined;
    }
  }

  /** One poll iteration: fetch if signed in, then schedule the next. */
  private async poll(): Promise<void> {
    if (!this.polling) return;
    if (!(await this.calendar.isSignedIn())) {
      this.signedIn = false;
      this.polling = false; // nothing to poll until sign-in restarts the loop
      this.updateStatus(); // reflect a token that lapsed out from under us
      return;
    }
    this.signedIn = true;
    await this.refresh();
    if (!this.polling) return; // stopped (e.g. signed out) during the fetch
    this.pollTimer = window.setTimeout(
      () => void this.poll(),
      nextFetchDelayMs(this.next, new Date()),
    );
  }

  /** Manual "Sync now" from the tray: fetch immediately, but only if signed in. */
  async syncNow(): Promise<void> {
    if (await this.calendar.isSignedIn()) {
      this.signedIn = true;
      await this.refresh();
    }
  }

  /**
   * Tray "Test Overlay": play the full attention sequence with placeholder
   * content so the overlay can be previewed even when no real meeting is near.
   * Auto-dismisses after a short hold. Won't stomp a real alert that's already
   * on screen, and the auto-dismiss bows out if a real meeting has since claimed
   * the overlay.
   */
  async demo(): Promise<void> {
    let presented = false;
    await this.runExclusive(async () => {
      if (this.activeEventId !== null) return; // a real alert owns the overlay
      presented = true;
      await showOverlay();
      await setClickThrough(false);
      await this.animator.present(demoBubbleContent());
    });
    if (!presented) return;

    if (this.demoTimer !== undefined) window.clearTimeout(this.demoTimer);
    this.demoTimer = window.setTimeout(() => {
      this.demoTimer = undefined;
      // Only tear down the preview if a real meeting hasn't taken over since.
      if (this.activeEventId === null) void this.runExclusive(() => this.dismiss());
    }, DEMO_HOLD_MS);
  }

  /**
   * Slow path: refresh the cached event from the calendar API. The scheduled
   * poll and a manual "Sync now" can both call this, so an in-flight guard keeps
   * fetches from overlapping; a click during a fetch is simply coalesced into
   * the one already running (which refreshes the status for everyone).
   */
  async refresh(): Promise<void> {
    if (this.refreshing) return;
    this.refreshing = true;
    try {
      const events = await this.calendar.getUpcomingEvents(FETCH_HORIZON_MINUTES * MS_PER_MINUTE);
      this.next = events.at(0) ?? null;
      this.lastSync = { ok: true, at: new Date() };
    } catch (error) {
      console.error('Calendar refresh failed', error);
      // Carry the reason into the tray; the console log above is invisible while
      // the overlay window is hidden, so the status line is the user's only clue.
      this.lastSync = { ok: false, at: new Date(), detail: describeError(error) };
    } finally {
      this.refreshing = false;
    }
    this.updateStatus();
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
    // Any dismissal (Join click, countdown elapsing, sign-out) supersedes a
    // pending "Test Overlay" auto-dismiss, so cancel it to avoid a stray teardown.
    if (this.demoTimer !== undefined) {
      window.clearTimeout(this.demoTimer);
      this.demoTimer = undefined;
    }
    // Remember what we dismissed so a still-upcoming meeting doesn't pop back
    // up on the next tick (e.g. right after the user clicks "Join Call"). Guard
    // against a null active id — tearing down a "Test Overlay" preview must not
    // erase the memory of a real meeting the user previously dismissed.
    if (this.activeEventId !== null) {
      this.dismissedEventId = this.activeEventId;
    }
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

  // The tray's "Sync now" item forces an immediate fetch outside the adaptive
  // poll cadence (a no-op while signed out).
  void onSyncNowRequested(() => void controller.syncNow());

  // The tray's "Test Overlay" item previews the alert with placeholder content,
  // independent of calendar state.
  void onTestOverlayRequested(() => void controller.demo());

  // Adaptive cadence: a self-scheduling calendar-poll loop (see lib/poll.ts),
  // but only while signed in — there's nothing to sync otherwise, and sign-in
  // restarts it.
  controller.startPolling();

  // Fast cadence (no network): drive the overlay countdown AND re-render the
  // tray status from cache, so the tray's next-meeting countdown stays live and
  // is current the moment the menu is opened.
  const tick = (): void => {
    void controller.tick();
    controller.updateStatus();
  };
  tick();
  window.setInterval(tick, TICK_INTERVAL_MS);
}

window.addEventListener('DOMContentLoaded', bootstrap);
