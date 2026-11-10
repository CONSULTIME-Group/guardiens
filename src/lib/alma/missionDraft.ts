/**
 * Lot ALMA2 (10/11/2026) : brouillon d'un besoin d'entraide par Alma
 * (fonction serveur draft-mission-from-prompt). Rien n'est enregistré :
 * titre et description arrivent dans le formulaire, le membre relit.
 */
import { supabase } from "@/integrations/supabase/client";

export type MissionDraftResult =
  | { ok: true; title: string; description: string; warnings: string[] }
  | { ok: false; message: string };

const FALLBACK = "Je n'arrive pas à vous aider à rédiger là tout de suite. Écrivez votre besoin avec vos mots, c'est ce qui marche le mieux.";

export function readMissionDraft(data: unknown, error: unknown): MissionDraftResult {
  const d = (data ?? {}) as Record<string, unknown>;
  if (error) return { ok: false, message: typeof d.error === "string" ? d.error : FALLBACK };
  if (d.available === false) return { ok: false, message: typeof d.message === "string" ? d.message : FALLBACK };
  if (typeof d.error === "string") return { ok: false, message: d.error };
  const title = typeof d.title === "string" ? d.title.trim() : "";
  const description = typeof d.description === "string" ? d.description.trim() : "";
  if (!title || !description) return { ok: false, message: FALLBACK };
  const warnings = Array.isArray(d.warnings) ? d.warnings.filter((w): w is string => typeof w === "string") : [];
  return { ok: true, title, description, warnings };
}

export async function draftMissionFromPhrase(phrase: string): Promise<MissionDraftResult> {
  try {
    const { data, error } = await supabase.functions.invoke("draft-mission-from-prompt", { body: { prompt: phrase } });
    return readMissionDraft(data, error);
  } catch {
    return { ok: false, message: FALLBACK };
  }
}
