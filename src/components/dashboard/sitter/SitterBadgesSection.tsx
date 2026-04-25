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

  const total = GARDIEN_BADGE_IDS.length;
  const hasActive = activeCount > 0;
  const ratio = total > 0 ? Math.min(100, Math.round((activeCount / total) * 100)) : 0;
  const summaryText = hasActive
    ? `${activeCount} badge${activeCount > 1 ? "s" : ""} actif${activeCount > 1 ? "s" : ""} sur ${total}`
    : `Aucun badge actif sur ${total}`;
  const actionText = open ? "Masquer la grille des badges" : "Afficher la grille des badges";

  return (
    <section aria-labelledby="sitter-badges-heading" className="space-y-3">
      <h3 id="sitter-badges-heading" className="sr-only">
        Mes badges — {summaryText}
      </h3>
      <p
        className="sr-only"
        aria-live="polite"
        aria-atomic="true"
        role="status"
      >
        {`Badges actifs : ${activeCount} sur ${total}.`}
      </p>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="sitter-badges-content"
        aria-label={`${actionText}. ${summaryText}.`}
        className="w-full flex items-center justify-between gap-2 sm:gap-3 rounded-xl border border-border/60 bg-card/50 px-3 sm:px-4 py-2.5 sm:py-3 hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
      >
        <span className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
          <span
            className={`flex h-8 w-8 items-center justify-center rounded-full shrink-0 ${
              hasActive ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
            }`}
            aria-hidden="true"
          >
            <Award className="h-4 w-4" />
          </span>
          <span className="flex flex-col items-start min-w-0 flex-1">
            <span className="flex items-center gap-1.5 sm:gap-2 min-w-0 w-full">
              <span aria-hidden="true" className="text-sm font-semibold text-foreground truncate">
                Mes badges
              </span>
              <span
                aria-hidden="true"
                className={`text-[11px] sm:text-xs font-medium tabular-nums px-1.5 py-0.5 rounded shrink-0 ${
                  hasActive ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                }`}
              >
                {activeCount}/{total}
              </span>
            </span>
            <span
              aria-hidden="true"
              className="mt-1.5 h-1 w-full max-w-[140px] rounded-full bg-muted overflow-hidden"
            >
              <span
                className={`block h-full transition-all duration-300 ${
                  hasActive ? "bg-primary" : "bg-transparent"
                }`}
                style={{ width: `${ratio}%` }}
              />
            </span>
          </span>
        </span>
        <span className="flex items-center gap-2 shrink-0">
          <span aria-hidden="true" className="text-xs text-muted-foreground hidden sm:inline">
            {open ? "Masquer" : "Afficher"}
          </span>
          <ChevronDown
            className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${open ? "rotate-180" : ""}`}
            aria-hidden="true"
          />
        </span>
      </button>
      <div
        id="sitter-badges-content"
        role="region"
        aria-labelledby="sitter-badges-heading"
        hidden={!open}
      >
        {open && (
          <BadgeGridSection
            title="Mes Badges"
            badgeIds={GARDIEN_BADGE_IDS}
            userBadges={groupedBadges}
            specialBadgeIds={SPECIAL_BADGE_IDS}
          />
        )}
      </div>
    </section>
  );
};

export default SitterBadgesSection;
