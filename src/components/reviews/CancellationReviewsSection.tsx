import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface CancellationReviewsSectionProps {
  userId: string;
}

const CancellationReviewsSection = ({ userId }: CancellationReviewsSectionProps) => {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("reviews")
        .select("*")
        .eq("reviewee_id", userId)
        .eq("review_type", "annulation")
        .eq("moderation_status", "valide")
        .order("created_at", { ascending: false });

      const { hydrateReviewers } = await import("@/lib/hydrateReviewers");
      const enriched = await hydrateReviewers(data || [], { includeReviewee: true });
      setReviews(enriched);
      setLoading(false);
    };
    load();
  }, [userId]);

  if (loading || reviews.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="font-heading font-semibold text-sm text-foreground">Annulations</h3>
      {reviews.map((r) => (
        <CancellationReviewCard key={r.id} review={r} currentUserId={user?.id} />
      ))}
    </div>
  );
};

const CancellationReviewCard = ({ review, currentUserId }: { review: any; currentUserId?: string }) => {
  const [response, setResponse] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const canRespond =
    currentUserId &&
    review.reviewee_id === currentUserId &&
    review.moderation_status === "valide" &&
    review.response_status === "aucune" &&
    new Date() < new Date(new Date(review.created_at).getTime() + 7 * 24 * 60 * 60 * 1000);

  const handleSubmitResponse = async () => {
    if (!currentUserId || response.trim().length === 0 || response.length > 300) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.rpc("repondre_avis_annulation", {
        p_review_id: review.id,
        p_respondent_id: currentUserId,
        p_response: response.trim(),
      });
      if (error) throw error;
      toast.success("Réponse soumise. Elle sera vérifiée avant publication.");
      setSubmitted(true);
    } catch (err: any) {
      toast.error(err?.message || "Erreur lors de l'envoi de la réponse.");
    }
    setSubmitting(false);
  };

  return (
    <div className="bg-muted/50 border border-border rounded-xl p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs">
          Annulation de garde
        </span>
        <span className="text-xs text-muted-foreground">
          — {format(new Date(review.created_at), "MMMM yyyy", { locale: fr })}
        </span>
      </div>

      {/* Cancellation reason */}
      <p className="text-sm text-foreground/80 italic mt-2">
        {review.cancellation_reason}
      </p>

      {/* Response if validated */}
      {review.response_status === "validee" && review.cancellation_response && (
        <div className="border-t border-border mt-3 pt-3">
          <p className="text-xs text-muted-foreground mb-1">
            Réponse de {review.reviewee?.first_name || "l'intéressé(e)"} :
          </p>
          <p className="text-sm text-foreground/80">
            {review.cancellation_response}
          </p>
        </div>
      )}

      {/* Response form */}
      {canRespond && !submitted && (
        <div className="border-t border-border mt-3 pt-3">
          <label className="text-xs text-muted-foreground mb-1 block">
            Votre réponse (optionnelle)
          </label>
          <textarea
            value={response}
            onChange={(e) => setResponse(e.target.value.slice(0, 300))}
            placeholder="Répondez à ce commentaire..."
            className="w-full border border-border rounded-lg p-2 text-sm resize-none h-16 focus:border-primary focus:outline-none bg-background"
            maxLength={300}
          />
          <p className="text-xs text-muted-foreground text-right mt-1">
            {response.length}/300 caractères
          </p>
          <Button
            size="sm"
            onClick={handleSubmitResponse}
            disabled={submitting || response.trim().length === 0}
            className="text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded-lg mt-2"
          >
            {submitting ? "Envoi..." : "Soumettre ma réponse"}
          </Button>
          <p className="text-xs text-muted-foreground italic mt-1">
            Votre réponse sera vérifiée avant publication (24h).
          </p>
        </div>
      )}

      {submitted && (
        <div className="border-t border-border mt-3 pt-3">
          <p className="text-xs text-primary font-medium">
            ✓ Réponse soumise — en attente de validation.
          </p>
        </div>
      )}
    </div>
  );
};

export default CancellationReviewsSection;
