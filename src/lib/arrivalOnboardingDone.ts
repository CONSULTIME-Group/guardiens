/**
 * Lot ONB1 (08/11/2026) : la fin du parcours d'arrivée v2 (G3 pour un gardien,
 * P3 pour un propriétaire, G1 pour l'entraide) vaut onboarding terminé. Avant ce lot, G3 n'écrivait
 * ni profiles.onboarding_completed ni l'événement onboarding_completed : l'admin
 * affichait 50 % d'onboarding terminé chez les gardiens du 01 au 06/11 pour
 * 77 % en réalité, et l'ancienne fenêtre d'accueil se rouvrait après le parcours.
 * Jamais bloquant : un échec d'écriture laisse la personne avancer.
 */
import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/lib/analytics";

/** G3 gardien, P3 propriétaire, G1 pour l'entraide (seul le lieu est exigé). */
export type ArrivalEndStep = "G3" | "P3" | "G1";

const END_SOURCE: Record<ArrivalEndStep, string> = {
  G3: "/arrivee/vous-connaitre",
  P3: "/arrivee/affinites",
  G1: "/arrivee/vous",
};

export async function markArrivalOnboardingDone(
  userId: string,
  step: ArrivalEndStep,
  role: string | null | undefined,
): Promise<void> {
  try {
    await supabase.from("profiles").update({ onboarding_completed: true }).eq("id", userId);
  } catch {
    /* sans effet sur la navigation */
  }
  void trackEvent("onboarding_completed", {
    source: END_SOURCE[step],
    metadata: { via: "arrival_v2", step, role: role ?? null },
  });
}
