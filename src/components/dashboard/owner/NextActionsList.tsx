/**
 * Liste compacte d'actions suivantes (top 2-3) affichée sous l'action
 * principale du dashboard. Évite l'effet « page blanche » : même quand
 * PriorityActionCard a sa cible, on suggère les 2 prochaines étapes utiles.
 *
 * Volontairement compact : un seul bloc, lignes hover, pas d'illustration.
 * L'illustration et la dramaturgie restent réservées à PriorityActionCard.
 */

import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import type { NextAction } from "@/lib/nextActions/owner";

interface Props {
  actions: NextAction[];
  /** Action principale à exclure pour éviter le doublon. */
  excludeId?: string;
  maxItems?: number;
}

const urgencyTone: Record<NextAction["urgency"], string> = {
  high: "text-primary",
  medium: "text-info",
  low: "text-muted-foreground",
};

const NextActionsList = ({ actions, excludeId, maxItems = 2 }: Props) => {
  const items = actions.filter((a) => a.id !== excludeId).slice(0, maxItems);
  if (items.length === 0) return null;

  return (
    <section
      aria-label="Actions suggérées"
      className="rounded-2xl border border-border bg-card p-4 md:p-5"
    >
      <p className="text-[11px] uppercase tracking-[2px] text-muted-foreground font-sans mb-3">
        Et ensuite
      </p>
      <ul className="divide-y divide-border">
        {items.map((a) => (
          <li key={a.id} className="first:pt-0 last:pb-0">
            <Link
              to={a.ctaTo}
              className="flex items-center justify-between gap-3 py-2.5 -mx-2 px-2 rounded-lg hover:bg-muted/50 transition-colors group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              <span className="min-w-0">
                <span className={`block text-[10px] uppercase tracking-wider font-medium mb-0.5 ${urgencyTone[a.urgency]}`}>
                  {a.eyebrow}
                </span>
                <span className="block text-sm text-foreground leading-snug">
                  {a.title}
                </span>
              </span>
              <ChevronRight
                className="h-4 w-4 text-muted-foreground shrink-0 group-hover:text-foreground group-hover:translate-x-0.5 transition-all"
                aria-hidden="true"
              />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
};

export default NextActionsList;
