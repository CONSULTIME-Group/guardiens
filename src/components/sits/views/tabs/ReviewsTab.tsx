/**
 * Onglet "Avis" — partagé. Inclut le CTA "Laisser un avis" si la garde est terminée.
 */
import { Link } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import ReviewsDisplay from "@/components/reviews/ReviewsDisplay";

interface ReviewsTabProps {
  sitId: string;
  sitOwnerId: string;
  sitStatus: string;
  currentUserId?: string;
  hasReviewedThisSit: boolean;
}

const ReviewsTab = ({
  sitId,
  sitOwnerId,
  sitStatus,
  currentUserId,
  hasReviewedThisSit,
}: ReviewsTabProps) => {
  return (
    <>
      <ReviewsDisplay userId={sitOwnerId} showAnimalCare={false} />
      {sitStatus === "completed" && currentUserId && !hasReviewedThisSit && (
        <div className="mt-4">
          <Link to={`/review/${sitId}`}>
            <Button variant="outline" className="w-full">
              {sitOwnerId === currentUserId
                ? "Laisser un avis sur le gardien"
                : "Laisser un avis sur le propriétaire"}
            </Button>
          </Link>
        </div>
      )}
      {sitStatus === "completed" && hasReviewedThisSit && (
        <p className="text-sm text-muted-foreground mt-4 flex items-center gap-1.5">
          <CheckCircle2 aria-hidden="true" className="h-4 w-4 text-primary shrink-0" />
          Vous avez déjà laissé votre avis pour cette garde.
        </p>
      )}
    </>
  );
};

export default ReviewsTab;
