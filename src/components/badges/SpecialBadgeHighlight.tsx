import { useMemo } from "react"
import { Sparkles } from "lucide-react"
import { BadgeSceau } from "@/components/badges/BadgeSceau"
import { BADGE_DEFINITIONS, SPECIAL_BADGE_IDS } from "@/components/badges/badge-definitions"

interface SpecialBadgeHighlightProps {
  userBadges: Array<{ badge_id: string; created_at: string; count: number }> | undefined
  /** Optionnel : restreint la liste de badges spéciaux affichés */
  specialBadgeIds?: string[]
  /** Titre encadrant le bloc */
  title?: string
}

/**
 * Carte « raccourci » qui met en évidence les badges spéciaux d'un utilisateur
 * (Fondateur, À jamais la 1ère, Identité vérifiée, etc.) au-dessus de la grille
 * standard. Permet de vérifier d'un coup d'œil leur présence sur le profil
 * public et le dashboard.
 *
 * Ne rend rien si l'utilisateur n'a aucun badge spécial.
 */
export function SpecialBadgeHighlight({
  userBadges,
  specialBadgeIds = SPECIAL_BADGE_IDS,
  title = "Badge spécial",
}: SpecialBadgeHighlightProps) {
  const specials = useMemo(
    () =>
      (userBadges ?? []).filter((b) =>
        specialBadgeIds.includes(b.badge_id) && BADGE_DEFINITIONS[b.badge_id],
      ),
    [userBadges, specialBadgeIds],
  )

  if (specials.length === 0) return null

  const heading = specials.length > 1 ? `${title}s` : title

  return (
    <div className="rounded-xl border border-primary/30 bg-gradient-to-br from-primary/5 via-card to-card p-4 md:p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold text-foreground">{heading}</h2>
      </div>

      <div className="flex flex-wrap items-start gap-4">
        {specials.map((b) => {
          const def = BADGE_DEFINITIONS[b.badge_id]
          return (
            <div
              key={b.badge_id}
              className="flex flex-col items-center text-center gap-1.5 min-w-[88px] max-w-[120px]"
            >
              <BadgeSceau
                id={b.badge_id}
                count={b.count}
                active
                size="normal"
                obtainedAt={b.created_at}
              />
              <p className="text-xs font-medium text-foreground leading-tight">
                {def.label}
              </p>
              <p className="text-[10px] text-muted-foreground leading-tight line-clamp-2">
                {def.tooltip}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default SpecialBadgeHighlight
