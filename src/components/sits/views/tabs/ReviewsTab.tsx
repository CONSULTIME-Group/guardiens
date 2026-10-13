/**
 * Onglet "Avis", partagé. Inclut le CTA "Laisser un avis" tant que la garde
 * est évaluable (lot Z : isSitReviewable, terminée ou archivée après sa date
 * de fin) et que la personne connectée est partie de la garde.
 */
import { Link } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import ReviewsDisplay from "@/components/reviews/ReviewsDisplay";
import AwardBadgeButton from "@/components/badges/AwardBadgeButton";
import { isSitReviewable } from "@/lib/reviewEligibility";

interface ReviewsTabProps {
  sitId: string;
  sitOwnerId: string;
  sitStatus: string;
  /** Date de fin de la garde, pour une garde archivée (lot Z). */
  sitEndDate?: string | null;
  /** La personne connectée est partie de la garde (propriétaire ou gardien retenu). */
  isSitParty?: boolean;
  currentUserId?: string;
  hasReviewedThisSit: boolean;
}

const ReviewsTab = ({
  sitId,
  sitOwnerId,
  sitStatus,
  sitEndDate,
  isSitParty = true,
  currentUserId,
  hasReviewedThisSit,
}: ReviewsTabProps) => {
  const reviewable = isSitParty && isSitReviewable({ status: sitStatus, end_date: sitEndDate });
  return (
    <>
      <ReviewsDisplay userId={sitOwnerId} showAnimalCare={false} />
      {reviewable && currentUserId && !hasReviewedThisSit && (
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
      {reviewable && hasReviewedThisSit && (
        <p className="text-sm text-muted-foreground mt-4 flex items-center gap-1.5">
          <CheckCircle2 aria-hidden="true" className="h-4 w-4 text-primary shrink-0" />
          Vous avez déjà laissé votre avis pour cette garde.
        </p>
      )}
      {reviewable && currentUserId && (
        <AwardBadgeButton
          sitId={sitId}
          sitOwnerId={sitOwnerId}
          currentUserId={currentUserId}
        />
      )}
    </>
  );
};

export default ReviewsTab;
