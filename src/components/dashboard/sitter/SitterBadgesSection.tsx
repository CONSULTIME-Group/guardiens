import { useUserBadges } from "@/hooks/useProfileReputation";
import BadgeGridSection from "@/components/badges/BadgeGridSection";
import { GARDIEN_BADGE_IDS, SPECIAL_BADGE_IDS } from "@/components/badges/badge-definitions";
import type { GroupedBadge } from "@/hooks/useSitterDashboardData";

interface SitterBadgesSectionProps {
  groupedBadges: GroupedBadge[];
}

const SitterBadgesSection = ({ groupedBadges }: SitterBadgesSectionProps) => {
  return (
    <BadgeGridSection
      title="Mes Badges"
      badgeIds={GARDIEN_BADGE_IDS}
      userBadges={groupedBadges}
      specialBadgeIds={SPECIAL_BADGE_IDS}
    />
  );
};

export default SitterBadgesSection;
