/**
 * Lot J2d (CGU 9.7) : période de la garde et date de l'avis, côte à côte.
 * « Garde du 3 au 10 août 2026 · Avis du 12 août 2026 ». Un avis sans garde
 * (entraide) garde sa seule date.
 */
import { reviewDateParts, type DatedReview } from "@/lib/reviewDates";

const ReviewDatesText = ({ review, className }: { review: DatedReview; className?: string }) => {
  const { period, deposit } = reviewDateParts(review);
  return (
    <span className={className}>
      {period && <span data-review-period="">{period} · </span>}
      <span data-review-deposit="">{deposit}</span>
    </span>
  );
};

export default ReviewDatesText;
