/**
 * Question « Vous partez quand ? » (lot N4), ré-exportation de la logique
 * partagée avec les fonctions serveur, plus l'appel à la fonction ma-periode.
 */
import { supabase } from "@/integrations/supabase/client";
import type { DeparturePeriod, Readiness } from "../../supabase/functions/_shared/owner-departure-logic.ts";

export * from "../../supabase/functions/_shared/owner-departure-logic.ts";

export interface DeparturePayload {
  ok: true;
  first_name: string;
  city: string | null;
  pet_names: string[];
  readiness: Readiness;
  nearby: { count: number; sitters: Array<{ id: string; firstName: string; avatarUrl?: string; distanceKm: number }> } | null;
  period: DeparturePeriod | null;
  answered_at: string | null;
  alma_state: "ask" | "known" | "hidden";
  holdout: boolean;
  has_published: boolean;
  upcoming_sit_id?: string | null;
}
export type DepartureResult = DeparturePayload | { ok: false; state?: string; reason?: string };

export async function callMaPeriode(body: { mode: "peek" | "save"; token?: string; period?: DeparturePeriod }): Promise<DepartureResult> {
  const { data, error } = await supabase.functions.invoke("ma-periode", { body });
  if (error) {
    const ctx = (error as { context?: Response }).context;
    try { return ctx ? await ctx.json() : { ok: false, reason: "error" }; } catch { return { ok: false, reason: "error" }; }
  }
  return data as DepartureResult;
}
