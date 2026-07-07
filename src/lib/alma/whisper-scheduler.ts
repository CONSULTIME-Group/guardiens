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
  CULTURAL_FACT_LIMITS,
  AlmaFrequency,
  WHISPER_PRIORITY,
} from "./whisper-types";

export interface SchedulerState {
  frequency: AlmaFrequency;
  emittedCount: number;
  lastEmittedAt: number | null;
  /** Compteur dédié aux faits culturels P3 : cadence indépendante des actionnables. */
  culturalEmittedCount: number;
  culturalLastEmittedAt: number | null;
  sessionMuted: boolean; // true après N dismiss volontaires (seuil selon fréquence)
  dismissedInSession: number;
  blacklistedTypes: Set<AlmaWhisperType>;
  lastDismissedAt: number | null;
  lastDismissReason: string | null;
}

export const DISMISS_COOLDOWN_MS = 15 * 60 * 1000;

/**
 * Seuil de mute automatique après fermetures volontaires successives.
 * Modulé par la fréquence : plus l'utilisateur a demandé de présence, plus
 * il faut de dismissals explicites avant de couper la session.
 */
export const SESSION_MUTE_THRESHOLD_BY_FREQUENCY: Record<AlmaFrequency, number> = {
  silent: 1,
  low: 2,
  balanced: 4,
  talkative: 6,
};
/** Rétro-compatibilité tests / imports existants. */
export const SESSION_MUTE_THRESHOLD = SESSION_MUTE_THRESHOLD_BY_FREQUENCY.balanced;

export function makeInitialState(
  frequency: AlmaFrequency = "balanced",
  blacklisted: AlmaWhisperType[] = [],
): SchedulerState {
  return {
    frequency,
    emittedCount: 0,
    lastEmittedAt: null,
    culturalEmittedCount: 0,
    culturalLastEmittedAt: null,
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
  const isCultural = type === "cultural_fact";
  const isP0 = WHISPER_PRIORITY[type] === "P0";
  const cfg = isCultural
    ? CULTURAL_FACT_LIMITS[state.frequency]
    : FREQUENCY_CONFIG[state.frequency];
  if (cfg.maxPerSession === 0 && !isP0) return { ok: false, reason: "silent" };
  // Les whispers critiques P0 ignorent le mute de session et le cooldown ambiant.
  if (state.sessionMuted && !isP0) return { ok: false, reason: "muted" };
  if (state.blacklistedTypes.has(type)) return { ok: false, reason: "blacklisted" };

  const count = isCultural ? state.culturalEmittedCount : state.emittedCount;
  const last = isCultural ? state.culturalLastEmittedAt : state.lastEmittedAt;

  if (!isP0 && count >= cfg.maxPerSession) return { ok: false, reason: "quota" };
  if (!isP0 && last !== null && now - last < cfg.cooldownMs) {
    return { ok: false, reason: "cooldown" };
  }
  if (
    !isP0 &&
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
  // Priorité P0 > P1 > P2 > P3, puis dernier arrivé (index le plus grand)
  const order: Record<string, number> = { P0: 0, P1: 1, P2: 2, P3: 3 };
  eligible.sort((a, b) => {
    const pa = order[WHISPER_PRIORITY[a.type]];
    const pb = order[WHISPER_PRIORITY[b.type]];
    if (pa !== pb) return pa - pb;
    // même priorité : le plus récent (fin de queue) gagne
    return queue.indexOf(b) - queue.indexOf(a);
  });
  // Un cultural_fact (P3) ne passe jamais si un whisper P0/P1/P2 est éligible.
  const top = eligible[0];
  if (top.type === "cultural_fact") {
    const hasActionable = eligible.some((w) => w.type !== "cultural_fact");
    if (hasActionable) return null;
  }
  return top;
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
