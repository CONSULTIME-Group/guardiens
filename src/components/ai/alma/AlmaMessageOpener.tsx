/**
 * Alma Pass 1 — Chantier 2 : brise-glace Messages.
 * S'affiche quand un thread est vide et qu'il y a un contexte sit ou mission.
 * Vouvoiement/tutoiement selon l'audience.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { trackEvent } from "@/lib/analytics";

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
    : `Voulez-vous que je vous prépare un premier message à partir de cette annonce et de votre bio ? Vous gardez le contrôle.`;

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
        description: "Vous pouvez relire et ajuster avant d'envoyer.",
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
      <div
        className="bg-card border border-dashed border-border rounded-2xl p-4 flex gap-3 items-start"
      >
        <div
          className="w-[34px] h-[34px] rounded-full shrink-0"
          style={{
            background:
              "radial-gradient(circle at 30% 30%, hsl(var(--hero-paper)) 0%, hsl(var(--primary) / 0.18) 100%)",
          }}
          aria-hidden="true"
        />
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-bold text-primary">Alma</p>
          <p className="font-heading italic text-[13.5px] text-foreground/90 leading-relaxed mt-0.5">
            {message}
          </p>
          <div className="flex items-center gap-4 mt-2">
            <button
              type="button"
              onClick={handleGenerate}
              disabled={loading}
              className="text-[12px] font-bold text-primary hover:underline disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? "Préparation…" : "Utiliser cette réponse"}
            </button>
            <button
              type="button"
              onClick={() => setDismissed(true)}
              className="text-[12px] text-muted-foreground hover:text-foreground transition-colors"
            >
              Non merci
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AlmaMessageOpener;

