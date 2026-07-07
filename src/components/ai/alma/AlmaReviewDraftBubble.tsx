/**
 * Alma Pass 1 — Chantier 7
 * Bulle brouillon d'avis dans LeaveReview.
 * Se déclenche quand : au moins 1 sub-rating rempli + commentaire < 50 chars.
 * Appelle `draft-review` (edge fn) qui utilise 1 anecdote factuelle du fil
 * pour rédiger un brouillon d'avis. Le brouillon remplace la valeur du champ.
 */
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { trackEvent } from "@/lib/analytics";
import { AlmaBubble } from "./AlmaBubble";

interface AlmaReviewDraftBubbleProps {
  sitId: string;
  conversationId: string | null;
  role: "owner" | "sitter";
  subRatings: Record<string, number>;
  comment: string;
  selectedBadges: string[];
  onDraft: (draft: string) => void;
}

export function AlmaReviewDraftBubble({
  sitId,
  conversationId,
  role,
  subRatings,
  comment,
  selectedBadges,
  onDraft,
}: AlmaReviewDraftBubbleProps) {
  const hasRatings = Object.values(subRatings).some((v) => v > 0);
  const commentShort = comment.trim().length < 50;
  const visible = hasRatings && commentShort && !!conversationId;

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const seenRef = useRef(false);

  useEffect(() => {
    if (visible && !seenRef.current && !dismissed) {
      seenRef.current = true;
      trackEvent("alma_review_bubble_seen", { metadata: { sit_id: sitId, role } });
    }
  }, [visible, dismissed, sitId, role]);

  if (!visible || dismissed) return null;

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("draft-review", {
        body: {
          sit_id: sitId,
          conversation_id: conversationId,
          sub_ratings: subRatings,
          badge_choices: selectedBadges,
        },
      });
      if (error) throw error;
      const payload = data as { draft?: string; warnings?: string[]; error?: string };
      if (!payload?.draft) {
        throw new Error(payload?.error || "Alma n'a pas pu générer de brouillon.");
      }
      onDraft(payload.draft);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
      trackEvent("alma_review_draft_generated", {
        metadata: { sit_id: sitId, role },
      });
      if (payload.warnings?.length) {
        toast({
          title: "Brouillon prêt",
          description: payload.warnings.join(" "),
        });
      }
    } catch (e) {
      toast({
        title: "Impossible de générer le brouillon",
        description: e instanceof Error ? e.message : "Réessayez dans un instant.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const tone =
    "Vos notes sont posées. Voulez-vous qu'Alma pose une première trame que vous ajusterez librement ?";

  return (
    <div className="mb-4">
      <AlmaBubble
        audience={role}
        variant="inline"
        loading={loading}
        success={success}
        onDismiss={() => setDismissed(true)}
        actions={
          <Button size="sm" onClick={handleGenerate} disabled={loading}>
            Générer un brouillon
          </Button>
        }
      >
        <p>{tone}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Le brouillon reprend une anecdote factuelle du fil de conversation. Vous restez
          libre de le réécrire.
        </p>
      </AlmaBubble>
    </div>
  );
}

export default AlmaReviewDraftBubble;
