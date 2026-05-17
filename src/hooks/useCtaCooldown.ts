import { useEffect, useState } from "react";

/**
 * Cooldown léger pour limiter la fatigue de répétition d'un CTA promotionnel.
 *
 * Pourquoi côté UI (localStorage) plutôt que serveur :
 * - le CTA est cosmétique, pas un canal d'acquisition critique → pas besoin
 *   de persister cross-device.
 * - on évite un appel réseau sur un dashboard déjà chargé.
 *
 * Règle :
 * - chaque affichage est compté (max 1 par 24h pour éviter les doubles renders).
 * - au-delà de `softThreshold` impressions dans `windowDays`, on bascule en
 *   variante "discrète" (lien texte au lieu de bouton plein).
 * - si l'utilisateur clique "Ne plus me proposer", on cache jusqu'à `snoozeDays`.
 */

type CtaCooldownState = {
  variant: "primary" | "soft" | "hidden";
  recordImpression: () => void;
  snooze: () => void;
};

type Stored = {
  impressions: number[]; // timestamps ms
  snoozedUntil: number | null;
};

const DEFAULT: Stored = { impressions: [], snoozedUntil: null };

const read = (key: string): Stored => {
  if (typeof window === "undefined") return DEFAULT;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return DEFAULT;
    const parsed = JSON.parse(raw);
    return {
      impressions: Array.isArray(parsed.impressions) ? parsed.impressions : [],
      snoozedUntil: typeof parsed.snoozedUntil === "number" ? parsed.snoozedUntil : null,
    };
  } catch {
    return DEFAULT;
  }
};

const write = (key: string, value: Stored) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // localStorage plein ou bloqué → on dégrade silencieusement
  }
};

export function useCtaCooldown(
  key: string,
  opts: {
    softThreshold?: number; // impressions avant bascule en variante discrète
    windowDays?: number; // fenêtre glissante
    snoozeDays?: number; // durée du masquage explicite
  } = {}
): CtaCooldownState {
  const { softThreshold = 3, windowDays = 7, snoozeDays = 30 } = opts;
  const storageKey = `cta_cooldown:${key}`;
  const [tick, setTick] = useState(0);

  const now = Date.now();
  const windowMs = windowDays * 24 * 60 * 60 * 1000;
  const state = read(storageKey);

  const recentImpressions = state.impressions.filter((t) => now - t < windowMs);
  const snoozed = state.snoozedUntil && state.snoozedUntil > now;

  let variant: CtaCooldownState["variant"] = "primary";
  if (snoozed) variant = "hidden";
  else if (recentImpressions.length >= softThreshold) variant = "soft";

  // Enregistre l'impression au mount, max 1 par 24h.
  useEffect(() => {
    const fresh = read(storageKey);
    const last = fresh.impressions[fresh.impressions.length - 1] ?? 0;
    if (now - last < 24 * 60 * 60 * 1000) return;
    const next: Stored = {
      ...fresh,
      impressions: [...fresh.impressions.filter((t) => now - t < windowMs), now],
    };
    write(storageKey, next);
    // pas de setTick : on n'a pas besoin de re-render pour cette impression
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  const recordImpression = () => {
    const fresh = read(storageKey);
    write(storageKey, {
      ...fresh,
      impressions: [...fresh.impressions, Date.now()],
    });
    setTick((t) => t + 1);
  };

  const snooze = () => {
    write(storageKey, {
      ...read(storageKey),
      snoozedUntil: Date.now() + snoozeDays * 24 * 60 * 60 * 1000,
    });
    setTick((t) => t + 1);
  };

  return { variant, recordImpression, snooze };
}
