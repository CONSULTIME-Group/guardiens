/**
 * Alma Pass 1 — Chantier 3 : bulle motivation sitter.
 * Apparaît quand motivation < 50 caractères et propose 3 brouillons via l'edge
 * function existante `generate-bio-drafts` (le prompt system persona reste côté serveur).
 * Tutoiement (audience sitter).
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { trackEvent } from "@/lib/analytics";
import AlmaBubble from "./AlmaBubble";

type Draft = { tone: "chaleureux" | "professionnel" | "concis"; text: string };

interface Props {
  currentValue: string;
  onPick: (text: string) => void;
}

export function AlmaMotivationBubble({ currentValue, onPick }: Props) {
  const [loading, setLoading] = useState(false);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    void trackEvent("alma_bio_bubble_seen", { metadata: { field: "motivation" } });
  }, []);

  if (dismissed) return null;

  const generate = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-bio-drafts", {
        body: {
          answers: {
            experience: currentValue || "à compléter",
            animals: "à compléter",
            motivation: currentValue || "envie de garder des animaux et des maisons",
            availability: "",
            style: "",
          },
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const list = ((data as any)?.drafts || []) as Draft[];
      setDrafts(list);
      await trackEvent("alma_bio_drafts_generated", { metadata: { count: list.length } });
    } catch (e: any) {
      toast({ title: "Alma indisponible", description: e?.message || "Réessaie plus tard.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-3">
      <AlmaBubble
        audience="sitter"
        variant="inline"
        loading={loading}
        onDismiss={() => setDismissed(true)}
        actions={
          drafts.length === 0 ? (
            <>
              <Button type="button" size="sm" onClick={generate} disabled={loading}>
                Générer un brouillon avec Alma
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setDismissed(true)}>
                Non merci
              </Button>
            </>
          ) : null
        }
      >
        {drafts.length === 0 ? (
          <p>Votre motivation fait moins de 50 caractères. Je vous propose 3 versions à partir de vos réponses. Vous choisissez, vous ajustez.</p>
        ) : (
          <div className="space-y-2">
            <p>Voici 3 propositions. Clique sur celle qui te ressemble le plus.</p>
            <div className="space-y-2">
              {drafts.map((d, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    onPick(d.text);
                    void trackEvent("alma_bio_draft_selected", { metadata: { draft_index: i, tone: d.tone } });
                    setDismissed(true);
                    toast({ title: "Brouillon inséré", description: "Tu peux le modifier librement." });
                  }}
                  className="w-full text-left rounded-lg border border-border p-2.5 hover:border-primary transition"
                >
                  <span className="text-[10px] uppercase tracking-wider text-primary font-semibold">
                    {d.tone}
                  </span>
                  <p className="text-xs mt-1 whitespace-pre-wrap text-foreground/80">{d.text}</p>
                </button>
              ))}
            </div>
          </div>
        )}
      </AlmaBubble>
    </div>
  );
}

export default AlmaMotivationBubble;
