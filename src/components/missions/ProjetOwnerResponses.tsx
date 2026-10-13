import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { logger } from "@/lib/logger";
import MissionResponseCard from "@/components/missions/MissionResponseCard";

interface Props {
  projet: { id: string; user_id: string; title?: string | null };
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
 */
const ProjetOwnerResponses = ({ projet, currentUserId, onCountChange }: Props) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [responses, setResponses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

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
          .select("id, first_name, avatar_url")
          .in("id", ids);
        const byId = new Map<string, any>();
        ((profs as any[]) ?? []).forEach((p) => byId.set(p.id, { first_name: p.first_name, avatar_url: p.avatar_url }));
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
                onSelect={() => undefined}
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
