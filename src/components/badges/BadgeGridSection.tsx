import { useMemo } from "react"
import { differenceInMonths } from "date-fns"
import { Link } from "react-router-dom"
import { Award, ChevronRight } from "lucide-react"
import { BadgeSceau } from "@/components/badges/BadgeSceau"
import { BADGE_DEFINITIONS, SPECIAL_BADGE_IDS } from "@/components/badges/badge-definitions"
import { SpecialBadgeHighlight } from "@/components/badges/SpecialBadgeHighlight"

interface BadgeGridSectionProps {
  title: string
  badgeIds: string[]
  userBadges: Array<{ badge_id: string; created_at: string; count: number }> | undefined
  specialBadgeIds?: string[]
}

export default function BadgeGridSection({
  title,
  badgeIds,
  userBadges,
  specialBadgeIds = SPECIAL_BADGE_IDS,
}: BadgeGridSectionProps) {
  const activeBadgeCount = useMemo(
    () =>
      (userBadges ?? []).filter(
        (b) =>
          badgeIds.includes(b.badge_id) &&
          differenceInMonths(new Date(), new Date(b.created_at)) < 12
      ).length,
    [userBadges, badgeIds]
  )

  const specialBadges = useMemo(
    () => (userBadges ?? []).filter((b) => specialBadgeIds.includes(b.badge_id)),
    [userBadges, specialBadgeIds]
  )

  return (
    <div className="rounded-xl border border-border/60 bg-card/50 p-4 md:p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Award className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        </div>
        <span className="text-xs text-muted-foreground tabular-nums">
          {activeBadgeCount} actif{activeBadgeCount > 1 ? "s" : ""} sur {badgeIds.length}
        </span>
      </div>

      {/* Badge grid */}
      <div className="grid grid-cols-4 sm:grid-cols-6 gap-3 mb-3">
        {badgeIds.map((id) => {
          const userBadge = userBadges?.find((b) => b.badge_id === id)
          const count = userBadge?.count ?? 0
          const isActive =
            count > 0 && userBadge
              ? differenceInMonths(new Date(), new Date(userBadge.created_at)) < 12
              : false
          return (
            <div key={id} className="flex justify-center">
              <BadgeSceau
                id={id}
                count={count}
                active={isActive}
                size="compact"
                showCount={false}
                showLabel
                obtainedAt={userBadge?.created_at}
              />
            </div>
          )
        })}
      </div>

      {/* Special badges */}
      {specialBadges.length > 0 && (
        <div className="mt-4 pt-3 border-t border-border/40">
          <p className="text-xs text-muted-foreground font-medium mb-2.5">
            Badges spéciaux
          </p>
          <div className="flex flex-wrap gap-3">
            {specialBadges.map((b) => (
              <BadgeSceau
                key={b.badge_id}
                id={b.badge_id}
                count={b.count}
                active
                size="compact"
                showLabel
                obtainedAt={b.created_at}
              />
            ))}
          </div>
        </div>
      )}

      {/* Link to full badge page */}
      <Link
        to="/planche-badges"
        className="mt-3 flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors py-1.5"
      >
        Voir tous les badges <ChevronRight className="h-3 w-3" />
      </Link>
    </div>
  )
}
