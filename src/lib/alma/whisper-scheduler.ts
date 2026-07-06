/**
 * Alma Pass 4 — scheduler des whispers narratifs.
 *
 * Rôles :
 *  - Vérifier si un whisper peut être émis (canEmit) selon fréquence user,
 *    cooldown global, blacklist type, mode silencieux post-dismiss.
 *  - Choisir le prochain whisper à afficher dans une queue (pickNext) selon
 *    priorité (P0 > P1 > P2) puis récence.
 *
 * Aucune dépendance React : logique pure, testable en isolation.
 */
import {
  AlmaWhisper,
  AlmaWhisperType,
  FREQUENCY_CONFIG,
  AlmaFrequency,
  WHISPER_PRIORITY,
} from "./whisper-types";

export interface SchedulerState {
  frequency: AlmaFrequency;
  emittedCount: number;
  lastEmittedAt: number | null;
  sessionMuted: boolean; // true après 2 dismiss volontaires dans la session
  dismissedInSession: number;
  blacklistedTypes: Set<AlmaWhisperType>;
  lastDismissedAt: number | null;
  lastDismissReason: string | null;
}

export const DISMISS_COOLDOWN_MS = 15 * 60 * 1000;
export const SESSION_MUTE_THRESHOLD = 2;

export function makeInitialState(
  frequency: AlmaFrequency = "balanced",
  blacklisted: AlmaWhisperType[] = [],
): SchedulerState {
  return {
    frequency,
    emittedCount: 0,
    lastEmittedAt: null,
    sessionMuted: false,
    dismissedInSession: 0,
    blacklistedTypes: new Set(blacklisted),
    lastDismissedAt: null,
    lastDismissReason: null,
  };
}

export interface CanEmitResult {
  ok: boolean;
  reason?: "silent" | "quota" | "cooldown" | "blacklisted" | "muted" | "dismiss_cooldown";
}

export function canEmit(
  state: SchedulerState,
  type: AlmaWhisperType,
  now: number = Date.now(),
): CanEmitResult {
  const cfg = FREQUENCY_CONFIG[state.frequency];
  if (cfg.maxPerSession === 0) return { ok: false, reason: "silent" };
  if (state.sessionMuted) return { ok: false, reason: "muted" };
  if (state.blacklistedTypes.has(type)) return { ok: false, reason: "blacklisted" };
  if (state.emittedCount >= cfg.maxPerSession) return { ok: false, reason: "quota" };

  if (state.lastEmittedAt !== null && now - state.lastEmittedAt < cfg.cooldownMs) {
    return { ok: false, reason: "cooldown" };
  }
  if (
    state.lastDismissedAt !== null &&
    state.lastDismissReason === "closed_manually" &&
    now - state.lastDismissedAt < DISMISS_COOLDOWN_MS
  ) {
    return { ok: false, reason: "dismiss_cooldown" };
  }
  return { ok: true };
}

export function pickNext(
  queue: AlmaWhisper[],
  state: SchedulerState,
  now: number = Date.now(),
): AlmaWhisper | null {
  const eligible = queue.filter((w) => canEmit(state, w.type, now).ok);
  if (eligible.length === 0) return null;
  // Priorité P0 > P1 > P2, puis dernier arrivé (index le plus grand)
  const order: Record<string, number> = { P0: 0, P1: 1, P2: 2 };
  eligible.sort((a, b) => {
    const pa = order[WHISPER_PRIORITY[a.type]];
    const pb = order[WHISPER_PRIORITY[b.type]];
    if (pa !== pb) return pa - pb;
    // même priorité : le plus récent (fin de queue) gagne
    return queue.indexOf(b) - queue.indexOf(a);
  });
  return eligible[0];
}

export function onEmit(state: SchedulerState, now: number = Date.now()): SchedulerState {
  return {
    ...state,
    emittedCount: state.emittedCount + 1,
    lastEmittedAt: now,
  };
}

export function onDismiss(
  state: SchedulerState,
  reason: "action_clicked" | "closed_manually" | "timeout" | "navigation",
  now: number = Date.now(),
): SchedulerState {
  const isVoluntary = reason === "closed_manually";
  const nextDismissed = state.dismissedInSession + (isVoluntary ? 1 : 0);
  return {
    ...state,
    lastDismissedAt: now,
    lastDismissReason: reason,
    dismissedInSession: nextDismissed,
    sessionMuted: nextDismissed >= SESSION_MUTE_THRESHOLD,
  };
}
