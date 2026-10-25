import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { logger } from "@/lib/logger";
import MissionResponseCard from "@/components/missions/MissionResponseCard";
import { Button } from "@/components/ui/button";

interface Props {
  projet: { id: string; user_id: string; title?: string | null; status?: string | null };
  currentUserId: string;
  /** Nombre de candidatures lues, pour le lien de l'encadré latéral. */
  onCountChange?: (count: number) => void;
}

export const PROJET_RESPONSES_ANCHOR = "candidatures";

/**
 * Lot X2 : candidatures reçues par le porteur d'un projet participatif.
 * Lecture de small_mission_responses du projet (politique « Owner and
 * responder can read mission responses »), prénoms et portraits par la vue
 * public_profiles, cartes MissionResponseCard en variante « projet ».
 *
 * Lot X3b (décision du fondateur du 13/10/2026) : « Choisir » une personne
 * (accept_mission_response, autres candidatures laissées en attente) passe
 * le projet en cours et ferme les candidatures ; « Rouvrir les candidatures »
 * le remet au statut ouvert, les personnes retenues restent retenues.
 */
const ProjetOwnerResponses = ({ projet, currentUserId, onCountChange }: Props) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [responses, setResponses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [status, setStatus] = useState<string>(projet.status || "open");
  const [reopening, setReopening] = useState(false);
  useEffect(() => { setStatus(projet.status || "open"); }, [projet.status]);

  const load = useCallback(async () => {
    setFailed(false);
    try {
      const { data, error } = await supabase
        .from("small_mission_responses")
        .select("*")
        .eq("mission_id", projet.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const rows = ((data as any[]) ?? []).slice();
      const ids = Array.from(new Set(rows.map((r) => r.responder_id).filter(Boolean))) as string[];
      if (ids.length > 0) {
        const { data: profs } = await supabase
          .from("public_profiles")
          .select("id, first_name, avatar_url, identity_verified, created_at")
          .in("id", ids);
        const byId = new Map<string, any>();
        // Lot E19 : identité vérifiée et ancienneté sur la carte de réponse.
        ((profs as any[]) ?? []).forEach((p) => byId.set(p.id, {
          first_name: p.first_name,
          avatar_url: p.avatar_url,
          identity_verified: p.identity_verified === true,
          created_at: p.created_at ?? null,
        }));
        rows.forEach((r) => { r.responder = r.responder_id ? byId.get(r.responder_id) ?? null : null; });
      }
      setResponses(rows);
    } catch (err) {
      logger.error("[ProjetOwnerResponses.load]", { err: String(err) });
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [projet.id]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { onCountChange?.(responses.length); }, [responses.length, onCountChange]);

  const openConversation = async (r: { id: string; conversation_id?: string | null }) => {
    let convId = r.conversation_id ?? null;
    if (!convId) {
      const { data, error } = await supabase.rpc("open_mission_response_conversation", { p_response_id: r.id });
      if (error) logger.error("[ProjetOwnerResponses.openConversation]", { err: error.message });
      convId = (data as string | null) ?? null;
    }
    navigate(convId ? `/messages/${convId}` : "/messages");
  };

  const decline = async (r: any) => {
    if (processingId) return;
    setProcessingId(r.id);
    try {
      const { error } = await supabase
        .from("small_mission_responses")
        .update({ status: "declined" as any })
        .eq("id", r.id);
      if (error) throw error;
      setResponses((prev) => prev.map((x) => (x.id === r.id ? { ...x, status: "declined" } : x)));
      supabase.functions.invoke("notify-mission-event", {
        body: {
          event_type: "mission_declined",
          mission_id: projet.id,
          actor_id: currentUserId,
          target_ids: [r.responder_id],
        },
      }).catch(() => {});
    } catch (err: any) {
      logger.error("[ProjetOwnerResponses.decline]", { err: String(err) });
      toast({ variant: "destructive", title: "Candidature inchangée", description: err?.message || "Réessayez dans un instant." });
    } finally {
      setProcessingId(null);
    }
  };

  // Lot X3b : choisir une personne, le projet passe en cours (candidatures fermées).
  const choose = async (r: any) => {
    if (processingId) return;
    setProcessingId(r.id);
    try {
      const { data, error } = await supabase.rpc("accept_mission_response", {
        p_response_id: r.id,
        p_decline_others: false,
      });
      if (error) throw error;
      const convId: string | null = ((data ?? {}) as any).conversation_id ?? null;
      setResponses((prev) => prev.map((x) => (x.id === r.id ? { ...x, status: "accepted", conversation_id: convId ?? x.conversation_id } : x)));
      setStatus((s) => (s === "open" ? "in_progress" : s));
      supabase.functions.invoke("notify-mission-event", {
        body: {
          event_type: "mission_accepted",
          mission_id: projet.id,
          actor_id: currentUserId,
          target_ids: [r.responder_id],
          metadata: { conversation_id: convId },
        },
      }).catch(() => {});
      toast({
        title: `${r.responder?.first_name || "Cette personne"} rejoint votre projet`,
        description: "Les candidatures sont fermées. Vous pouvez les rouvrir à tout moment.",
      });
    } catch (err: any) {
      logger.error("[ProjetOwnerResponses.choose]", { err: String(err) });
      toast({ variant: "destructive", title: "Choix non enregistré", description: err?.message || "Réessayez dans un instant." });
    } finally {
      setProcessingId(null);
    }
  };

  // Lot X3b : rouvrir les candidatures, les personnes retenues restent retenues.
  const reopen = async () => {
    if (reopening) return;
    setReopening(true);
    try {
      const { error } = await supabase
        .from("small_missions")
        .update({ status: "open" as any })
        .eq("id", projet.id)
        .eq("status", "in_progress");
      if (error) throw error;
      setStatus("open");
      toast({ title: "Candidatures rouvertes", description: "Votre projet accueille de nouveau des candidatures." });
    } catch (err: any) {
      logger.error("[ProjetOwnerResponses.reopen]", { err: String(err) });
      toast({ variant: "destructive", title: "Candidatures encore fermées", description: err?.message || "Réessayez dans un instant." });
    } finally {
      setReopening(false);
    }
  };

  const pendingCount = responses.filter((r) => !r.status || r.status === "pending").length;

  return (
    <section
      id={PROJET_RESPONSES_ANCHOR}
      aria-labelledby="projet-responses-heading"
      className="scroll-mt-24 rounded-[2rem] border border-primary/20 bg-card p-6 md:p-8 mb-10 space-y-4"
    >
      <div className="flex items-center gap-2">
        <MessageSquare className="h-5 w-5 text-primary" aria-hidden="true" />
        <h2 id="projet-responses-heading" className="font-heading text-2xl font-bold text-foreground">
          Candidatures reçues <span className="text-muted-foreground font-normal">({responses.length})</span>
        </h2>
      </div>
      <p className="text-sm text-foreground/80 leading-relaxed">
        Vous portez ce projet. Chaque candidature est visible par vous et par la personne qui l'a écrite.
        Écrivez-lui pour organiser sa venue.
      </p>
      {status === "in_progress" && (
        <div className="rounded-2xl bg-muted/40 p-4 text-sm flex flex-col sm:flex-row sm:items-center gap-3" data-testid="projet-reopen">
          <p className="text-foreground flex-1">
            Votre projet est en cours, les candidatures sont fermées. Les personnes retenues restent retenues si vous les rouvrez.
          </p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => void reopen()}
            disabled={reopening}
            aria-busy={reopening}
            className="rounded-full min-h-11 shrink-0"
          >
            {reopening ? "Enregistrement en cours..." : "Rouvrir les candidatures"}
          </Button>
        </div>
      )}
      {loading ? (
        <p className="text-sm text-muted-foreground" aria-busy="true">Chargement des candidatures</p>
      ) : failed ? (
        <div className="rounded-2xl bg-muted/40 p-4 text-sm">
          <p className="text-foreground">Les candidatures n'ont pas pu être chargées.</p>
          <button type="button" onClick={() => { setLoading(true); void load(); }} className="mt-2 font-semibold text-primary underline underline-offset-4">
            Réessayer
          </button>
        </div>
      ) : responses.length === 0 ? (
        <p className="rounded-2xl bg-muted/40 p-4 text-sm text-muted-foreground">
          Les candidatures arriveront ici, avec une notification à chaque nouvelle candidature.
        </p>
      ) : (
        <ul className="space-y-3 list-none p-0" aria-label={`Candidatures reçues (${responses.length})`}>
          {responses.map((r) => (
            <li key={r.id}>
              <MissionResponseCard
                variant="projet"
                response={r}
                isAuthor
                currentUserId={currentUserId}
                missionOwnerId={projet.user_id}
                processing={processingId === r.id}
                pendingCount={pendingCount}
                onSelect={() => void choose(r)}
                onDecline={() => void decline(r)}
                onOpenMessages={() => void openConversation(r)}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export default ProjetOwnerResponses;
