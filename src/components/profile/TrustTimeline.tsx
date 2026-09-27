/**
 * Trust Timeline : chronologie publique d'un gardien + heatmap d'activité
 * sur 12 mois. Apporte une preuve narrative de sérieux, différencie deux
 * profils de Trust Score équivalent.
 *
 * Aucune icône Lucide décorative dans le contenu (règle Core).
 * Pas de tiret cadratin. Vouvoiement absolu.
 */

import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  buildTrustTimeline,
  buildActivityHeatmap,
  maxActivity,
  type TimelineEvent,
} from "@/lib/trustTimeline";

interface Props {
  memberSince?: string | null;
  reviews: Array<{ created_at: string; overall_rating: number | null }>;
  badges: Array<{ badge_id: string; created_at: string; count: number }>;
  completedSits: number;
  lastActivity?: string | null;
  firstName: string;
  /** Variante compacte (fiche gardien F1) : trois jalons, sans graphique. */
  variant?: "default" | "compact";
  /** Date de la première garde, quand elle est connue (variante compacte). */
  firstSitDate?: string | null;
}

/** Jalons de la variante compacte : Inscription, Première garde, Premier avis. */
export function compactMilestones(input: {
  memberSince?: string | null;
  firstSitDate?: string | null;
  completedSits: number;
  reviews: Array<{ created_at: string; overall_rating: number | null }>;
}): Array<{ key: "join" | "first_sit" | "first_review"; label: string; date: string | null }> {
  const out: Array<{ key: "join" | "first_sit" | "first_review"; label: string; date: string | null }> = [];
  if (input.memberSince) out.push({ key: "join", label: "Inscription", date: input.memberSince });
  if (input.completedSits > 0 || input.firstSitDate) {
    out.push({ key: "first_sit", label: "Première garde", date: input.firstSitDate ?? null });
  }
  const sorted = [...input.reviews].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  const first = sorted[0];
  if (first) {
    const note = first.overall_rating != null ? `, ${first.overall_rating} sur 5` : "";
    out.push({ key: "first_review", label: `Premier avis${note}`, date: first.created_at });
  }
  return out.slice(0, 3);
}

const COMPACT_DOT: Record<"join" | "first_sit" | "first_review", string> = {
  join: "border-2 border-primary bg-background",
  first_sit: "bg-primary",
  first_review: "bg-founder",
};

const KIND_DOT_CLASS: Record<TimelineEvent["kind"], string> = {
  join: "bg-muted-foreground/40",
  first_review: "bg-primary",
  first_five_star: "bg-warning",
  badge: "bg-success",
  milestone_sits: "bg-primary",
  last_activity: "bg-info",
};

const TrustTimeline = ({
  memberSince,
  reviews,
  badges,
  completedSits,
  lastActivity,
  firstName,
  variant = "default",
  firstSitDate = null,
}: Props) => {
  if (variant === "compact") {
    const items = compactMilestones({ memberSince, firstSitDate, completedSits, reviews });
    if (items.length === 0) return null;
    return (
      <ol aria-label={`Parcours de ${firstName}`} className="relative pl-5 space-y-3.5">
        <span aria-hidden="true" className="absolute left-[5px] top-1.5 bottom-1.5 w-px bg-border" />
        {items.map((m) => (
          <li key={m.key} className="relative">
            <span aria-hidden="true" className={`absolute -left-5 top-1 h-[11px] w-[11px] rounded-full ${COMPACT_DOT[m.key]}`} />
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-sm text-foreground leading-snug">{m.label}</p>
              {m.date && (
                <time dateTime={m.date} className="text-xs text-muted-foreground shrink-0">
                  {format(new Date(m.date), "MMM yyyy", { locale: fr })}
                </time>
              )}
            </div>
          </li>
        ))}
      </ol>
    );
  }
  const events = buildTrustTimeline({
    memberSince,
    reviews,
    badges,
    completedSits,
    lastActivity,
  });

  if (events.length === 0) return null;

  const heatmap = buildActivityHeatmap(reviews, badges);
  const max = maxActivity(heatmap);

  // Échelle d'intensité 0-4 pour la heatmap (style contributions).
  const intensity = (n: number) => {
    if (n === 0) return "bg-muted";
    if (max <= 1) return "bg-primary/40";
    const ratio = n / max;
    if (ratio < 0.34) return "bg-primary/25";
    if (ratio < 0.67) return "bg-primary/55";
    return "bg-primary";
  };

  return (
    <section
      aria-label={`Parcours public de ${firstName}`}
      className="rounded-2xl border border-border bg-card p-5 md:p-6"
    >
      <header className="mb-5">
        <p className="text-xs uppercase tracking-[2px] text-muted-foreground font-sans mb-1.5">
          Parcours sur Guardiens
        </p>
        <h3 className="text-lg font-heading font-semibold text-foreground">
          La trace de confiance de {firstName}
        </h3>
      </header>

      <ol className="relative pl-5 space-y-4 mb-6">
        <span
          aria-hidden="true"
          className="absolute left-[7px] top-1.5 bottom-1.5 w-px bg-border"
        />
        {events.map((e, i) => (
          <li key={`${e.kind}-${i}`} className="relative">
            <span
              aria-hidden="true"
              className={`absolute -left-5 top-1.5 h-3 w-3 rounded-full ring-4 ring-card ${KIND_DOT_CLASS[e.kind]}`}
            />
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-sm font-medium text-foreground leading-snug">
                {e.label}
              </p>
              <time
                dateTime={e.date}
                className="text-xs text-muted-foreground shrink-0 font-mono"
              >
                {format(new Date(e.date), "MMM yyyy", { locale: fr })}
              </time>
            </div>
            {e.detail && (
              <p className="text-xs text-muted-foreground mt-0.5">{e.detail}</p>
            )}
          </li>
        ))}
      </ol>

      {/* Heatmap activité 12 mois */}
      <div>
        <p className="text-xs uppercase tracking-[2px] text-muted-foreground font-sans mb-2">
          Activité publique, 12 derniers mois
        </p>
        <div className="flex items-end gap-1">
          {heatmap.map((m) => (
            <div key={m.ym} className="flex flex-col items-center gap-1 flex-1 min-w-0">
              <span
                aria-label={`${m.label}: ${m.count} évènement${m.count > 1 ? "s" : ""}`}
                title={`${m.label}: ${m.count}`}
                className={`block w-full h-6 rounded-sm ${intensity(m.count)}`}
              />
              <span className="text-[10px] text-muted-foreground truncate w-full text-center capitalize">
                {m.label}
              </span>
            </div>
          ))}
        </div>
        {max === 0 && (
          <p className="text-xs text-muted-foreground italic mt-2">
            Pas encore d'activité publique sur cette période.
          </p>
        )}
      </div>
    </section>
  );
};

export default TrustTimeline;
