/**
 * Alma Pass 2 — Chantier 2
 * Bulle "fit gardien" affichée en tête de PublicSitterProfile pour un owner
 * connecté qui possède au moins une annonce publiée. Explique en langage naturel
 * pourquoi ce gardien correspond à son annonce, avec bonus reciprocity si le
 * gardien a consulté l'annonce dans les 7 derniers jours. CTA "Inviter" ouvre
 * InviteToMySitButton (RPC/table sit_invitations gérées par ce composant).
 */
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useViewerOwnerForAffinity } from "@/hooks/useViewerOwnerForAffinity";
import { computeAffinity, type AffinitySitterInput } from "@/lib/affinityScore";
import { trackEvent } from "@/lib/analytics";
import { AlmaBubble } from "./AlmaBubble";
import InviteToMySitButton from "@/components/sits/owner/InviteToMySitButton";

interface Sit {
  id: string;
  title: string | null;
  start_date: string | null;
  end_date: string | null;
}

interface Props {
  sitter: {
    id: string;
    first_name: string | null;
    reviewCount?: number;
  };
  sitterProfile: AffinitySitterInput | null;
}

export function AlmaFitGardien({ sitter, sitterProfile }: Props) {
  const { user, activeRole } = useAuth();
  const { owner, loading: ownerLoading } = useViewerOwnerForAffinity();

  const isOwnerMode =
    !!user &&
    user.id !== sitter.id &&
    (user.role === "owner" || (user.role === "both" && activeRole === "owner"));

  const [sits, setSits] = useState<Sit[] | null>(null);
  const [reciprocity, setReciprocity] = useState<number>(0);
  const [seenTracked, setSeenTracked] = useState(false);

  // Charger les annonces publiées de l'owner
  useEffect(() => {
    if (!isOwnerMode || !user?.id) return;
    let cancel = false;
    (async () => {
      const { data } = await supabase
        .from("sits")
        .select("id, title, start_date, end_date")
        .eq("user_id", user.id)
        .eq("status", "published")
        .order("start_date", { ascending: true })
        .limit(5);
      if (!cancel) setSits((data as any[]) ?? []);
    })();
    return () => {
      cancel = true;
    };
  }, [isOwnerMode, user?.id]);

  const targetSit = sits && sits.length > 0 ? sits[0] : null;

  // Reciprocity : nombre de vues du sitter sur les annonces owner dans les 7 derniers jours
  useEffect(() => {
    if (!isOwnerMode || !sits || sits.length === 0 || !sitter.id) return;
    let cancel = false;
    (async () => {
      const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
      const sitIds = sits.map((s) => s.id);
      const { data } = await supabase
        .from("analytics_events")
        .select("id, metadata")
        .eq("user_id", sitter.id)
        .eq("event_type", "sit_view")
        .gte("created_at", weekAgo);
      if (cancel) return;
      const count = (data ?? []).filter((row: any) => {
        const sid = row?.metadata?.sit_id;
        return typeof sid === "string" && sitIds.includes(sid);
      }).length;
      setReciprocity(count);
    })();
    return () => {
      cancel = true;
    };
  }, [isOwnerMode, sits, sitter.id]);

  // Affinity
  const affinity = useMemo(() => {
    if (!owner || !sitterProfile) return null;
    return computeAffinity(owner, sitterProfile);
  }, [owner, sitterProfile]);

  // Tracking impression une seule fois
  useEffect(() => {
    if (seenTracked || !isOwnerMode || !targetSit || !affinity) return;
    setSeenTracked(true);
    void trackEvent("alma_fit_gardien_seen", {
      metadata: { sitter_id: sitter.id, sit_id: targetSit.id, score: affinity.score },
    });
    if (reciprocity > 0) {
      void trackEvent("alma_fit_gardien_reciprocity_shown", {
        metadata: { sitter_id: sitter.id, sit_id: targetSit.id, views: reciprocity },
      });
    }
  }, [seenTracked, isOwnerMode, targetSit, affinity, reciprocity, sitter.id]);

  if (ownerLoading || !isOwnerMode || !targetSit || !affinity || !owner) return null;

  const prenom = sitter.first_name || "ce gardien";
  const titre = targetSit.title || "votre annonce";
  const matchedText = affinity.matched.length > 0 ? affinity.matched.join(", ").toLowerCase() : "des critères clés";
  const reviewNote =
    typeof sitter.reviewCount === "number" && sitter.reviewCount > 0
      ? `${sitter.reviewCount} avis positifs. `
      : "";

  return (
    <div className="mb-6" onClick={(e) => e.stopPropagation()}>
      <AlmaBubble
        audience="owner"
        variant="dashboard"
        actions={
          <div onClick={() => trackEvent("alma_invite_from_alma_clicked", { metadata: { sitter_id: sitter.id, sit_id: targetSit.id } })}>
            <InviteToMySitButton
              sitter={{ id: sitter.id, first_name: sitter.first_name }}
              variant="default"
              size="sm"
              label={`Inviter ${prenom} à candidater`}
            />
          </div>
        }
      >
        <p>
          Voici pourquoi {prenom} correspond à votre annonce {titre} : {matchedText}. {reviewNote}
          Score d'affinité {affinity.score}%.
        </p>
        {reciprocity > 0 && (
          <p className="mt-2 text-primary/90">
            {sitter.first_name ? `${sitter.first_name}` : "Ce gardien"} a consulté votre annonce {reciprocity} fois cette semaine, il a l'air très intéressé.
          </p>
        )}
      </AlmaBubble>
    </div>
  );
}

export default AlmaFitGardien;
