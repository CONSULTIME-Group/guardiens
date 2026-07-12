import { useState, useCallback } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export type MessageAiAction = "warmer" | "proofread" | "shorten";

interface Options {
  getBody: () => string;
  setBody: (next: string) => void;
}

/**
 * Petit hook partagé pour la barre « Assistant IA » des messages 1:1 admin.
 * Appelle l'edge function `admin-draft-mass-email` avec `format: 'message'`,
 * gère loading, erreurs (402, 429) et remplace le contenu du textarea.
 */
export function useMessageAiAssistant({ getBody, setBody }: Options) {
  const [loading, setLoading] = useState<MessageAiAction | null>(null);

  const run = useCallback(
    async (action: MessageAiAction) => {
      const current = (getBody() || "").trim();
      if (!current) {
        toast.info("Écrivez d'abord quelques mots, l'IA les retravaillera");
        return;
      }
      setLoading(action);
      try {
        const { data, error } = await supabase.functions.invoke("admin-draft-mass-email", {
          body: { action, format: "message", body: current },
        });
        if (error) {
          const status = (error as { context?: { status?: number }; status?: number }).context?.status
            ?? (error as { status?: number }).status;
          if (status === 402) {
            toast.error("Crédits IA épuisés");
          } else if (status === 429) {
            toast.error("Trop de requêtes, réessayez dans un instant");
          } else {
            toast.error("L'assistant IA n'a pas pu répondre");
          }
          return;
        }
        const nextBody = typeof (data as { body?: unknown })?.body === "string"
          ? (data as { body: string }).body
          : "";
        if (!nextBody.trim()) {
          toast.error("L'assistant IA n'a pas pu répondre");
          return;
        }
        setBody(nextBody);
      } catch {
        toast.error("L'assistant IA n'a pas pu répondre");
      } finally {
        setLoading(null);
      }
    },
    [getBody, setBody],
  );

  return { run, loading, isLoading: loading !== null };
}
