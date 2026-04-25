import { useState, useMemo } from "react";
import { differenceInMonths } from "date-fns";
import { Award, ChevronDown } from "lucide-react";
import BadgeGridSection from "@/components/badges/BadgeGridSection";
import { GARDIEN_BADGE_IDS, SPECIAL_BADGE_IDS } from "@/components/badges/badge-definitions";
import type { GroupedBadge } from "@/hooks/useSitterDashboardData";

interface SitterBadgesSectionProps {
  groupedBadges: GroupedBadge[];
  /** Si true, affiche un résumé condensé repliable par défaut (gain vertical). */
  condensed?: boolean;
}

const SitterBadgesSection = ({ groupedBadges, condensed = false }: SitterBadgesSectionProps) => {
  const activeCount = useMemo(
    () =>
      (groupedBadges ?? []).filter(
        (b) =>
          GARDIEN_BADGE_IDS.includes(b.badge_id) &&
          differenceInMonths(new Date(), new Date(b.created_at)) < 12
      ).length,
    [groupedBadges]
  );

  const [open, setOpen] = useState(activeCount > 0);

  if (!condensed) {
    return (
      <BadgeGridSection
        title="Mes Badges"
        badgeIds={GARDIEN_BADGE_IDS}
        userBadges={groupedBadges}
        specialBadgeIds={SPECIAL_BADGE_IDS}
      />
    );
  }

  return (
    <section aria-labelledby="sitter-badges-heading" className="space-y-3">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="sitter-badges-content"
        className="w-full flex items-center justify-between gap-2 rounded-xl border border-border/60 bg-card/50 px-4 py-3 hover:bg-card transition-colors"
      >
        <span className="flex items-center gap-2">
          <Award className="h-4 w-4 text-primary" aria-hidden="true" />
          <h3 id="sitter-badges-heading" className="text-sm font-semibold text-foreground">
            Mes badges
          </h3>
          <span className="text-xs text-muted-foreground tabular-nums">
            {activeCount} actif{activeCount > 1 ? "s" : ""} sur {GARDIEN_BADGE_IDS.length}
          </span>
        </span>
        <ChevronDown
          className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>
      {open && (
        <div id="sitter-badges-content">
          <BadgeGridSection
            title="Mes Badges"
            badgeIds={GARDIEN_BADGE_IDS}
            userBadges={groupedBadges}
            specialBadgeIds={SPECIAL_BADGE_IDS}
          />
        </div>
      )}
    </section>
  );
};

export default SitterBadgesSection;
