/**
 * Alma Pass 1 — Chantier 2 : brise-glace Messages.
 * S'affiche quand un thread est vide et qu'il y a un contexte sit ou mission.
 * Vouvoiement/tutoiement selon l'audience.
 */
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { trackEvent } from "@/lib/analytics";
import AlmaBubble from "./AlmaBubble";

interface AlmaMessageOpenerProps {
  audience: "owner" | "sitter";
  otherFirstName: string | null | undefined;
  sitId?: string | null;
  missionId?: string | null;
  otherUserId: string;
  onDraftReady: (text: string) => void;
}

export function AlmaMessageOpener({
  audience,
  otherFirstName,
  sitId,
  missionId,
  otherUserId,
  onDraftReady,
}: AlmaMessageOpenerProps) {
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(false);
  const prenom = otherFirstName || (audience === "owner" ? "cette personne" : "la personne");

  useEffect(() => {
    void trackEvent("alma_message_opener_seen", {
      metadata: { audience, has_sit: !!sitId, has_mission: !!missionId },
    });
  }, [audience, sitId, missionId]);

  if (dismissed) return null;

  const message = audience === "owner"
    ? `Vous voulez que je vous prépare un premier message à partir de votre annonce et du profil de ${prenom} ? Vous relisez avant d'envoyer.`
    : `Tu veux, je te prépare un premier message à partir de cette annonce et de ta bio ? Tu gardes le contrôle.`;

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("draft-conversation-opener", {
        body: {
          thread_context: {
            sit_id: sitId ?? undefined,
            mission_id: missionId ?? undefined,
            other_user_id: otherUserId,
          },
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const draft = (data as any)?.draft as string;
      if (!draft) throw new Error("Aucun brouillon reçu");
      onDraftReady(draft);
      void trackEvent("alma_message_opener_generated", {
        metadata: { audience, has_sit: !!sitId, has_mission: !!missionId },
      });
      setDismissed(true);
      toast({
        title: "Brouillon Alma prêt",
        description: audience === "owner"
          ? "Vous pouvez relire et ajuster avant d'envoyer."
          : "Tu peux relire et ajuster avant d'envoyer.",
      });
    } catch (e: any) {
      toast({
        title: "Alma indisponible",
        description: e?.message || "Réessayez dans un instant.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="px-4 pt-3">
      <AlmaBubble
        audience={audience}
        variant="inline"
        loading={loading}
        onDismiss={() => setDismissed(true)}
        actions={
          <>
            <Button size="sm" onClick={handleGenerate} disabled={loading}>
              Oui, préparer un message
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setDismissed(true)}>
              Non merci
            </Button>
          </>
        }
      >
        {message}
      </AlmaBubble>
    </div>
  );
}

export default AlmaMessageOpener;
