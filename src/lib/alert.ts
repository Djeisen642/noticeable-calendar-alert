/**
 * Pure decision logic for the overlay lifecycle, extracted so it can be
 * unit-tested away from the DOM/Tauri wiring in `main.ts`.
 */

import type { CalendarEvent } from './calendar.ts';
import { shouldAlert } from './countdown.ts';

export interface AlertState {
  /** The event currently on screen, if any. */
  readonly activeEventId: string | null;
  /** The last event the user actively dismissed (e.g. clicked "Join Call"). */
  readonly dismissedEventId: string | null;
}

/**
 * Whether `event` should be freshly presented now.
 *
 * Crucially, an event the user already dismissed is NOT re-presented while it
 * is still upcoming — otherwise clicking "Join Call" (which dismisses the
 * overlay) would just make it pop straight back up on the next tick.
 */
export function shouldPresent(
  event: CalendarEvent,
  now: Date,
  leadTimeMinutes: number,
  state: AlertState,
): boolean {
  if (event.id === state.activeEventId) {
    return false; // already showing
  }
  if (event.id === state.dismissedEventId) {
    return false; // the user already handled this one
  }
  return shouldAlert(event.start, now, leadTimeMinutes);
}
