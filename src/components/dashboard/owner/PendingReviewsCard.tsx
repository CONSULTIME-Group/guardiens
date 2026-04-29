import { memo } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { capitalize } from "./helpers";
import type { PendingReview } from "@/hooks/useOwnerDashboardData";

const PendingReviewsCard = memo(({ pendingReviews }: { pendingReviews: PendingReview[] }) => {
  const navigate = useNavigate();
  if (pendingReviews.length === 0) return null;

  // On affiche au plus 2 cartes pour rester compact
  const items = pendingReviews.slice(0, 2);

  return (
    <div className="space-y-2">
      {items.map((r) => {
        const endLabel = r.endDate ? format(new Date(r.endDate), "d MMMM", { locale: fr }) : null;
        const name = r.sitterName ? capitalize(r.sitterName) : "votre gardien";
        return (
          <div
            key={r.sitId}
            className="bg-card border border-border rounded-2xl p-4 flex items-center gap-4"
          >
            {r.sitterAvatar ? (
              <img
                src={r.sitterAvatar}
                alt={`Photo de ${name}`}
                loading="lazy"
                className="w-12 h-12 rounded-full object-cover shrink-0"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold shrink-0">
                {name[0]}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">
                Comment s'est passée votre garde avec {name} ?
              </p>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                {r.sitTitle}
                {endLabel ? ` — terminée le ${endLabel}` : ""}
              </p>
            </div>
            <Button
              size="sm"
              className="shrink-0"
              onClick={() =>
                navigate(`/review/${r.sitId}?reviewee=${r.sitterId}`)
              }
            >
              Laisser un avis
            </Button>
          </div>
        );
      })}
    </div>
  );
});

PendingReviewsCard.displayName = "PendingReviewsCard";
export default PendingReviewsCard;
