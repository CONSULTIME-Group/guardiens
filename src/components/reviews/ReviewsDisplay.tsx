import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import StarRating from "./StarRating";
import { Star, ThumbsUp } from "lucide-react";
import ReportButton from "@/components/reports/ReportButton";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface ReviewsDisplayProps {
  userId: string;
  showAnimalCare?: boolean; // highlight animal care for sitter profiles
}

const ReviewsDisplay = ({ userId, showAnimalCare = false }: ReviewsDisplayProps) => {
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("reviews")
        .select("*, reviewer:profiles!reviews_reviewer_id_fkey(first_name, avatar_url)")
        .eq("reviewee_id", userId)
        .eq("published", true)
        .order("created_at", { ascending: false });
      setReviews(data || []);
      setLoading(false);
    };
    load();
  }, [userId]);

  if (loading) return null;

  const avgRating = reviews.length > 0
    ? (reviews.reduce((s, r) => s + r.overall_rating, 0) / reviews.length)
    : 0;

  const avgAnimalCare = showAnimalCare && reviews.length > 0
    ? reviews.filter(r => r.animal_care_rating).reduce((s, r) => s + (r.animal_care_rating || 0), 0) / reviews.filter(r => r.animal_care_rating).length
    : null;

  return (
    <div>
      {/* Summary */}
      <div className="flex items-center gap-4 mb-4">
        <div className="flex items-center gap-2">
          <StarRating value={Math.round(avgRating)} readonly size="md" />
          <span className="font-heading font-bold text-lg">{avgRating.toFixed(1)}</span>
        </div>
        <span className="text-sm text-muted-foreground">{reviews.length} avis</span>
      </div>

      {/* Highlighted animal care score */}
      {avgAnimalCare !== null && !isNaN(avgAnimalCare) && (
        <div className="flex items-center gap-2 mb-4 p-2.5 rounded-lg bg-accent/50">
          <span className="text-sm">🐾</span>
          <span className="text-sm font-medium">Soin des animaux</span>
          <StarRating value={Math.round(avgAnimalCare)} readonly size="sm" />
          <span className="text-sm font-bold">{avgAnimalCare.toFixed(1)}</span>
        </div>
      )}

      {/* Reviews list */}
      {reviews.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">Pas encore d'avis.</p>
      ) : (
        <div className="space-y-4">
          {reviews.map(r => (
            <div key={r.id} className="p-4 rounded-xl bg-card border border-border">
              <div className="flex items-center gap-2.5 mb-2">
                {r.reviewer?.avatar_url ? (
                  <img src={r.reviewer.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold">
                    {r.reviewer?.first_name?.charAt(0) || "?"}
                  </div>
                )}
                <div className="flex-1">
                  <span className="text-sm font-medium">{r.reviewer?.first_name || "Utilisateur"}</span>
                  <span className="text-xs text-muted-foreground ml-2">{format(new Date(r.created_at), "d MMM yyyy", { locale: fr })}</span>
                </div>
                <StarRating value={r.overall_rating} readonly size="sm" />
              </div>
              {r.comment && <p className="text-sm text-muted-foreground whitespace-pre-line">{r.comment}</p>}
              <div className="flex items-center justify-between mt-2">
                {r.would_recommend && (
                  <div className="flex items-center gap-1 text-xs text-primary font-medium">
                    <ThumbsUp className="h-3 w-3" /> Recommandé
                  </div>
                )}
                <ReportButton targetId={r.id} targetType="review" className="ml-auto" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ReviewsDisplay;
