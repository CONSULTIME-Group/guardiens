// Hook utilitaire : appelle moderate-content et renvoie le verdict.
// Tolérant aux erreurs : si l'IA est indisponible, renvoie status 'ok' (fail-open
// modéré, car bloquer un utilisateur sur indisponibilité IA = pire UX).

import { supabase } from "@/integrations/supabase/client";

export type ModerationVerdict = {
  status: "ok" | "warning" | "block";
  reasons: string[];
  suggestion?: string;
};

export async function moderateContent(
  contentType: "sit" | "message" | "bio",
  text: string,
): Promise<ModerationVerdict> {
  try {
    const { data, error } = await supabase.functions.invoke("moderate-content", {
      body: { content_type: contentType, text },
    });
    if (error) throw error;
    const d = data as any;
    if (!d || d.error) return { status: "ok", reasons: [] };
    return {
      status: d.status ?? "ok",
      reasons: Array.isArray(d.reasons) ? d.reasons : [],
      suggestion: d.suggestion,
    };
  } catch (e) {
    console.warn("moderation unavailable", e);
    return { status: "ok", reasons: [] };
  }
}
