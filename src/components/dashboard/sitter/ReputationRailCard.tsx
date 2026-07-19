/**
 * ReputationRailCard — carte réputation calme (vague 4).
 * Remplace l'accordéon secondaire dans le rail confirmé.
 */
import { Link } from "react-router-dom";

interface ReputationRailCardProps {
  userId?: string;
  completedSits: number;
  avgRating: number;
  reviewsCount: number;
  badgeCount: number;
}

const numberStyle = {
  fontSize: "20px",
  fontWeight: 600,
  lineHeight: 1,
} as const;

const ReputationRailCard = ({
  userId,
  completedSits,
  avgRating,
  reviewsCount,
  badgeCount,
}: ReputationRailCardProps) => {
  const isBlank = completedSits === 0 && reviewsCount === 0 && badgeCount === 0;
  const showRating = reviewsCount > 0;
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
      <p
        className="text-muted-foreground"
        style={{
          fontSize: "11px",
          fontWeight: 700,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
        }}
      >
        Votre réputation
      </p>
      <h3
        className="font-heading text-foreground mt-[8px]"
        style={{ fontSize: "20px", fontWeight: 600, lineHeight: 1.3 }}
      >
        Elle parle pour vous.
      </h3>

      {isBlank ? (
        <p
          className="font-sans text-muted-foreground mt-[14px]"
          style={{ fontSize: "13.5px", lineHeight: 1.5 }}
        >
          Votre réputation se construira dès votre première garde.
        </p>
      ) : (
        <div
          className="flex flex-wrap mt-[22px]"
          style={{ gap: "22px" }}
        >
          <div>
            <div className="font-heading text-foreground tabular-nums" style={numberStyle}>
              {completedSits}
            </div>
            <div className="text-muted-foreground mt-[8px]" style={{ fontSize: "12px" }}>
              garde{completedSits > 1 ? "s" : ""} réalisée{completedSits > 1 ? "s" : ""}
            </div>
          </div>
          {showRating && (
            <div>
              <div className="font-heading text-foreground tabular-nums" style={numberStyle}>
                {ratingStr}
              </div>
              <div className="text-muted-foreground mt-[8px]" style={{ fontSize: "12px" }}>
                note sur 5
              </div>
            </div>
          )}
          <div>
            <div className="font-heading text-foreground tabular-nums" style={numberStyle}>
              {badgeCount}
            </div>
            <div className="text-muted-foreground mt-[8px]" style={{ fontSize: "12px" }}>
              écusson{badgeCount > 1 ? "s" : ""}
            </div>
          </div>
        </div>
      )}

      {userId && (
        <div className="mt-[22px]">
          <Link
            to={`/gardiens/${userId}`}
            className="text-primary hover:underline underline-offset-4"
            style={{ fontSize: "13px", fontWeight: 700 }}
          >
            Voir votre profil public
          </Link>
        </div>
      )}
    </article>
  );
};

export default ReputationRailCard;
