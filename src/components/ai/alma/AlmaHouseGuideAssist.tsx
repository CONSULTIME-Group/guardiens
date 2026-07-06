/**
 * Alma Pass 2 — Chantier 1
 * Bulle dédiée au guide maison génératif : propose à l'owner de générer 4 trames
 * (WiFi, voisinage, vétérinaire, urgences). Au clic, appelle `generate-house-guide`
 * et remonte les 4 trames au parent via `onDrafts`, qui les pré-remplit dans les
 * champs du formulaire avec un badge "Brouillon Alma, à personnaliser".
 */
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { trackEvent } from "@/lib/analytics";
import { toast } from "sonner";
import { AlmaBubble } from "./AlmaBubble";

export interface HouseGuideDrafts {
  wifi_info: string;
  neighborhood: string;
  veterinary: string;
  emergency: string;
}

interface Props {
  onDrafts: (drafts: HouseGuideDrafts) => void;
  className?: string;
}

export function AlmaHouseGuideAssist({ onDrafts, className }: Props) {
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // trace impression une seule fois
  if (typeof window !== "undefined" && !(window as any).__almaHouseGuideSeen) {
    (window as any).__almaHouseGuideSeen = true;
    void trackEvent("alma_house_guide_bubble_seen");
  }

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-house-guide", { body: {} });
      if (error) throw error;
      const drafts = (data as any)?.drafts as HouseGuideDrafts | undefined;
      if (!drafts) throw new Error("Réponse Alma vide");
      onDrafts(drafts);
      setGenerated(true);
      void trackEvent("alma_house_guide_generated");
      toast.success("Trames Alma pré-remplies. Relisez et personnalisez chaque section.");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Alma n'a pas pu générer les trames.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (dismissed) return null;

  return (
    <AlmaBubble
      audience="owner"
      variant="dashboard"
      loading={loading}
      onDismiss={() => setDismissed(true)}
      className={className}
      title="Le guide maison, ce que vos gardiens consultent le plus"
      actions={
        !generated ? (
          <Button size="sm" onClick={handleGenerate} disabled={loading}>
            <Sparkles className="h-3.5 w-3.5 mr-1.5" />
            Générer les 4 trames
          </Button>
        ) : (
          <span className="text-xs text-muted-foreground">
            Trames pré-remplies dans les sections WiFi, Instructions générales, Contacts d'urgence. À relire.
          </span>
        )
      }
    >
      <p>
        Je vous propose une trame WiFi, voisinage, vétérinaire, urgences à partir de votre ville et de votre logement.
        Vous relisez et vous ajustez.
      </p>
    </AlmaBubble>
  );
}

export default AlmaHouseGuideAssist;
