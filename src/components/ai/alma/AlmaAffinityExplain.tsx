/**
 * Alma Pass 1 — Chantier 5
 * CTA "Comprendre mon score" affiché à côté du badge d'affinité.
 * Sur clic, appelle `explain-affinity-score` et affiche l'explication
 * narrative (matched + missing avec suggestions actionnables) dans un AlmaBubble.
 */
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { trackEvent } from "@/lib/analytics";
import { AlmaBubble, AlmaAudience } from "./AlmaBubble";
import type { AffinityResult } from "@/lib/affinityScore";

interface AlmaAffinityExplainProps {
  audience: AlmaAudience;
  mode: "sitter_view" | "owner_view";
  result: AffinityResult;
  context: string;
  targetId?: string;
}

interface ExplainResponse {
  score: number;
  total: number;
  matched_narratives: { label: string; text: string }[];
  missing_narratives: {
    label: string;
    text: string;
    suggestion: string;
    field_to_update?: string | null;
  }[];
}

export function AlmaAffinityExplain({
  audience,
  mode,
  result,
  context,
  targetId,
}: AlmaAffinityExplainProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ExplainResponse | null>(null);

  const handleClick = async () => {
    trackEvent("alma_affinity_explain_clicked", {
      source: context,
      metadata: { sit_id: targetId, score: result.score },
    });
    setOpen(true);
    if (data) return;
    setLoading(true);
    setError(null);
    try {
      const { data: resp, error: fnError } = await supabase.functions.invoke(
        "explain-affinity-score",
        {
          body: {
            mode,
            score: result.score,
            total: result.total,
            matched: (result.matched || []).map((label) => ({ label })),
            missing: [],
          },
        },
      );
      if (fnError) throw fnError;
      setData(resp as ExplainResponse);
      trackEvent("alma_affinity_explanation_seen", { mode, sit_id: targetId });
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Alma n'a pas pu formuler l'explication pour le moment.",
      );
    } finally {
      setLoading(false);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={handleClick}
        className="text-xs font-medium text-primary hover:underline"
      >
        Comprendre mon score
      </button>
    );
  }

  return (
    <AlmaBubble
      audience={audience}
      variant="inline"
      loading={loading}
      onDismiss={() => setOpen(false)}
      title={`Votre affinité, ${result.score}%`}
    >
      {error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : data ? (
        <div className="space-y-3">
          {data.matched_narratives.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                Ce qui matche
              </p>
              <ul className="space-y-1">
                {data.matched_narratives.map((n) => (
                  <li key={n.label} className="text-sm">
                    · {n.text}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {data.missing_narratives.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                À compléter
              </p>
              <ul className="space-y-2">
                {data.missing_narratives.map((n) => (
                  <li key={n.label} className="text-sm">
                    <p>{n.text}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {n.suggestion}
                      </span>
                      {n.field_to_update && (
                        <Button
                          asChild
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            trackEvent("alma_affinity_profile_action_clicked", {
                              target_field: n.field_to_update ?? undefined,
                            })
                          }
                        >
                          <a href="/profile">Compléter</a>
                        </Button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Alma prépare votre explication…
        </p>
      )}
    </AlmaBubble>
  );
}

export default AlmaAffinityExplain;
