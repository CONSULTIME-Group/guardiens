import { differenceInMonths } from "date-fns";
import { BadgeSceau } from "@/components/badges/BadgeSceau";
import { GARDIEN_BADGE_IDS, SPECIAL_BADGE_IDS } from "@/components/badges/badge-definitions";
import type { GroupedBadge } from "@/hooks/useSitterDashboardData";

interface SitterBadgesSectionProps {
  groupedBadges: GroupedBadge[];
}

const SitterBadgesSection = ({ groupedBadges }: SitterBadgesSectionProps) => {
  const activeBadgeCount = groupedBadges.filter(
    (b) => GARDIEN_BADGE_IDS.includes(b.badge_id) && differenceInMonths(new Date(), new Date(b.created_at)) < 12
  ).length;

  const specialBadges = groupedBadges.filter((b) => SPECIAL_BADGE_IDS.includes(b.badge_id));

  return (
    <>
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-sm font-semibold text-foreground">Mes Badges</h2>
        <span className="text-xs text-muted-foreground">
          {activeBadgeCount} actif{activeBadgeCount > 1 ? "s" : ""} sur 12
        </span>
      </div>

      <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 mb-4">
        {GARDIEN_BADGE_IDS.map((id) => {
          const userBadge = groupedBadges.find((b) => b.badge_id === id);
          const count = userBadge?.count ?? 0;
          const isActive =
            count > 0 && userBadge ? differenceInMonths(new Date(), new Date(userBadge.created_at)) < 12 : false;
          return (
            <BadgeSceau key={id} id={id} count={count} active={isActive} size="compact" showCount={false} obtainedAt={userBadge?.created_at} />
          );
        })}
      </div>

      {specialBadges.length > 0 && (
        <div className="mt-3">
          <p className="text-xs text-muted-foreground font-sans mb-2">Badges spéciaux</p>
          <div className="flex flex-wrap gap-2">
            {specialBadges.map((b) => (
              <BadgeSceau key={b.badge_id} id={b.badge_id} count={b.count} active size="compact" obtainedAt={b.created_at} />
            ))}
          </div>
        </div>
      )}
    </>
  );
};

export default SitterBadgesSection;
