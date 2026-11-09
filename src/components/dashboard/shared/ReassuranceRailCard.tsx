/**
 * Lot D3 (09/11/2026, maquette Claude Design « Tableaux de bord ordinateur v2 ») :
 * « Guardiens aujourd'hui » dans la colonne de droite de l'accueil ordinateur.
 *
 * Chiffres réels seulement : inscrits, maisons gardées et animaux accompagnés
 * de get_public_stats (même lecture que la ligne du pouls, qu'elle remplace sur
 * ordinateur, aucune lecture de plus), gardiens à proximité déjà comptés par
 * l'accueil propriétaire. Une ligne à zéro ne s'affiche pas.
 * Lot D4 : départements, nouveaux membres de la semaine, identités vérifiées et
 * note des avis viennent de get_dashboard_movement (même lecture que le
 * bandeau de l'accueil). Les identités vérifiées se disent en nombre, jamais
 * en part des membres ; la note n'existe qu'à partir de 5 avis (la base la
 * renvoie vide avant) et seulement côté propriétaire.
 */
import { Link } from "react-router-dom";
import { useCommunityPulse } from "@/hooks/useCommunityPulse";
import DashEyebrow from "../owner/DashEyebrow";

export interface ReassuranceRow {
  key: string;
  value: number;
  label: string;
  /** Valeur affichée quand ce n'est pas un compte (note des avis). */
  display?: string;
}

export interface ReassuranceCommunity {
  departments?: number | null;
  new_members_7d?: number | null;
  identities_verified?: number | null;
  reviews_count?: number | null;
  reviews_avg?: number | string | null;
}

export const REASSURANCE_FOOTER = "Guardiens est gratuit. Une rencontre avant la garde reste toujours facultative.";

const plural = (n: number, one: string, many: string) => (n > 1 ? many : one);

export function reassuranceRows(input: {
  totalInscrits: number;
  maisonsGardees: number;
  animauxAccompagnes: number;
  nearby?: { count: number; radiusKm: number; city?: string | null } | null;
  community?: ReassuranceCommunity | null;
  showReviews?: boolean;
}): ReassuranceRow[] {
  const c = input.community ?? null;
  const num = (v: unknown) => {
    const n = Math.floor(Number(v ?? 0));
    return Number.isFinite(n) && n > 0 ? n : 0;
  };
  const departments = num(c?.departments);
  const rows: ReassuranceRow[] = [];
  const n = input.nearby;
  if (n && n.count > 0) {
    rows.push({
      key: "nearby",
      value: n.count,
      label: `${plural(n.count, "gardien", "gardiens")} à moins de ${n.radiusKm} km${n.city ? ` de ${n.city}` : ""}`,
    });
  }
  if (input.totalInscrits > 0) {
    const base = plural(input.totalInscrits, "membre inscrit", "membres inscrits");
    rows.push({
      key: "members",
      value: input.totalInscrits,
      label: departments > 1 ? `${base} dans ${departments} départements` : base,
    });
  }
  const newMembers = num(c?.new_members_7d);
  if (newMembers > 0) rows.push({ key: "new_members", value: newMembers, label: plural(newMembers, "nouveau membre cette semaine", "nouveaux membres cette semaine") });
  const verified = num(c?.identities_verified);
  if (verified > 0) rows.push({ key: "verified", value: verified, label: plural(verified, "identité vérifiée", "identités vérifiées") });
  const reviewsCount = num(c?.reviews_count);
  const avg = Number(c?.reviews_avg);
  if (input.showReviews && reviewsCount >= 5 && Number.isFinite(avg) && avg > 0) {
    rows.push({
      key: "reviews",
      value: avg,
      display: `${avg.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} sur 5`,
      label: `note moyenne des ${reviewsCount} avis publiés`,
    });
  }
  if (input.maisonsGardees > 0) rows.push({ key: "houses", value: input.maisonsGardees, label: plural(input.maisonsGardees, "maison gardée", "maisons gardées") });
  if (input.animauxAccompagnes > 0) rows.push({ key: "animals", value: input.animauxAccompagnes, label: plural(input.animauxAccompagnes, "animal accompagné", "animaux accompagnés") });
  return rows;
}

export default function ReassuranceRailCard({
  nearby,
  community,
  showReviews = false,
}: {
  nearby?: { count: number; radiusKm: number; city?: string | null } | null;
  community?: ReassuranceCommunity | null;
  showReviews?: boolean;
}) {
  const { data: pulse } = useCommunityPulse();
  if (!pulse) return null;
  const rows = reassuranceRows({ ...pulse, nearby, community, showReviews });
  if (rows.length === 0) return null;
  return (
    <section
      aria-label="Guardiens aujourd'hui"
      data-testid="reassurance-rail-card"
      className="rounded-[22px] bg-card border border-border p-[22px]"
    >
      <DashEyebrow>Guardiens aujourd'hui</DashEyebrow>
      <ul className="mt-[10px]">
        {rows.map((r) => (
          <li key={r.key} className="flex items-baseline gap-[10px] border-b border-border py-[8px] last:border-b-0">
            <span className="font-heading text-[20px] font-semibold tabular-nums text-foreground min-w-[64px]">
              {r.display ?? r.value.toLocaleString("fr-FR")}
            </span>
            <span className="text-[13.5px] leading-snug text-foreground">{r.label}</span>
          </li>
        ))}
      </ul>
      <p className="mt-[10px] text-[12.5px] leading-relaxed text-muted-foreground">{REASSURANCE_FOOTER}</p>
      <Link
        to="/actualites/inventaire-guardiens-france"
        className="mt-[8px] inline-flex min-h-[44px] items-center text-[13px] font-semibold text-primary hover:underline underline-offset-4"
      >
        Voir l'inventaire
      </Link>
    </section>
  );
}
