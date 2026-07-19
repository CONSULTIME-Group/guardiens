/**
 * HouseStoryRailCard — vague 12, rail propriétaire.
 * Même gabarit que ReputationRailCard.
 */
import { Link } from "react-router-dom";

interface HouseStoryRailCardProps {
  userId?: string;
  completedSits: number;
  avgRating: number;
  reviewsCount: number;
  trustedSitterCount: number;
  highlightsCount: number;
  pendingReviewsCount: number;
  firstPendingReviewSitId?: string | null;
}

const numberStyle = {
  fontSize: "20px",
  fontWeight: 600,
  lineHeight: 1,
} as const;

const labelStyle = { fontSize: "12px" } as const;

const HouseStoryRailCard = ({
  userId,
  completedSits,
  avgRating,
  reviewsCount,
  trustedSitterCount,
  highlightsCount,
  pendingReviewsCount,
  firstPendingReviewSitId,
}: HouseStoryRailCardProps) => {
  const showStats = completedSits > 0;
  const showRating = reviewsCount > 0 && avgRating > 0;
  const showTrusted = trustedSitterCount > 0;
  const ratingStr = avgRating.toFixed(1).replace(".", ",");

  return (
    <article
      className="bg-card border border-border"
      style={{
        borderRadius: "20px",
        padding: "22px",
        boxShadow: "0 1px 2px rgba(29,27,22,0.04), 0 8px 24px rgba(29,27,22,0.05)",
      }}
    >
      <div className="flex items-center gap-2">
        <span
          aria-hidden="true"
          className="inline-block"
          style={{ width: "20px", height: "1px", background: "hsl(var(--secondary))" }}
        />
        <p
          style={{
            color: "hsl(var(--secondary))",
            fontSize: "11px",
            fontWeight: 700,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
          }}
        >
          Votre maison
        </p>
      </div>
      <h3
        className="font-heading text-foreground mt-[8px]"
        style={{ fontSize: "20px", fontWeight: 600, lineHeight: 1.3 }}
      >
        Elle a déjà une histoire.
      </h3>

      {!showStats ? (
        <p
          className="font-sans text-muted-foreground mt-[14px]"
          style={{ fontSize: "13.5px", lineHeight: 1.5 }}
        >
          Sa première histoire s'écrira à votre première garde.
        </p>
      ) : (
        <div className="flex flex-wrap mt-[22px]" style={{ gap: "22px" }}>
          <div>
            <div className="font-heading text-foreground tabular-nums" style={numberStyle}>
              {completedSits}
            </div>
            <div className="text-muted-foreground mt-[8px]" style={labelStyle}>
              garde{completedSits > 1 ? "s" : ""} accueillie{completedSits > 1 ? "s" : ""}
            </div>
          </div>
          {showRating && (
            <div>
              <div className="font-heading text-foreground tabular-nums" style={numberStyle}>
                {ratingStr}
              </div>
              <div className="text-muted-foreground mt-[8px]" style={labelStyle}>
                note sur 5
              </div>
            </div>
          )}
          {showTrusted && (
            <div>
              <div className="font-heading text-foreground tabular-nums" style={numberStyle}>
                {trustedSitterCount}
              </div>
              <div className="text-muted-foreground mt-[8px]" style={labelStyle}>
                gardien{trustedSitterCount > 1 ? "s" : ""} récurrent{trustedSitterCount > 1 ? "s" : ""}
              </div>
            </div>
          )}
        </div>
      )}

      {userId && highlightsCount > 0 && (
        <div className="mt-[22px]">
          <Link
            to={`/gardiens/${userId}?tab=proprio#avis`}
            className="text-primary hover:underline underline-offset-4"
            style={{ fontSize: "13px", fontWeight: 700 }}
          >
            Ce que les gardiens en disent
          </Link>
        </div>
      )}

      {userId && (
        <div className="mt-[14px]">
          <Link
            to="/recherche-gardiens"
            className="text-primary hover:underline underline-offset-4"
            style={{ fontSize: "13px", fontWeight: 500 }}
          >
            Les gardiens près de chez vous
          </Link>
        </div>
      )}

      {pendingReviewsCount > 0 && (
        <div className="mt-[14px] pt-[14px] border-t border-border/60">
          <Link
            to={firstPendingReviewSitId ? `/sits/${firstPendingReviewSitId}?review=1` : "/dashboard"}
            className="text-primary hover:underline underline-offset-4"
            style={{ fontSize: "13px", fontWeight: 500 }}
          >
            {pendingReviewsCount} avis à laisser
          </Link>
        </div>
      )}
    </article>
  );
};

export default HouseStoryRailCard;
