import { formatDateRangeFr } from "@/lib/formatDateRangeFr";
import { canShowAffinityPercent } from "@/lib/affinityDisplay";
import { formatCityLabel } from "@/lib/cityLabel";
import matchEmptyIllustration from "@/assets/illustrations/sitter-match-empty.webp";

import { Link } from "react-router-dom";
import { useRef } from "react";
import { getOptimizedImageUrl } from "@/lib/imageOptim";
import type { AffinitySitCard, ListingRankingSource } from "@/hooks/useSitterTopAffinitySits";
import AffinityRing from "@/components/matching/AffinityRing";
import { trackEvent } from "@/lib/analytics";
import { useImpressionOnce } from "@/hooks/useImpressionOnce";
import { petSpeciesLabel } from "@/lib/petLabels";
import DashEyebrow from "../owner/DashEyebrow";

/**
 * Vedette gardien (lot D2, maquette validée).
 *
 * Une seule carte blanche : photo de la garde, anneau d'affinité (règle des
 * 4 critères du lot D0), titre, méta, raisons existantes du calcul, bouton.
 * Dessous, « Aussi pour vous » : les deux gardes suivantes en lignes
 * séparées par un filet, puis le lien catalogue au compte réel.
 * Variante `layout="rows"` (nouveau gardien, liste d'ouverture visible) :
 * pas de carte vedette, les trois gardes en lignes.
 * Données strictement issues de useSitterTopAffinitySits.
 */

interface Props {
  topSits: AffinitySitCard[];
  fallbackSits: AffinitySitCard[];
  rankingSource: ListingRankingSource;
  isLoading: boolean;
  /** Nombre réel d'annonces publiées visibles par ce gardien. */
  totalPublished?: number;
  layout?: "star" | "rows";
}

const speciesLabel = (species: string[]): string | null => {
  if (!species || species.length === 0) return null;
  if (species.length === 1) return petSpeciesLabel(species[0]);
  return `${species.length} animaux`;
};

/** Lien de sortie vers le catalogue, compte réel, jamais codé en dur. */
export const catalogExitLabel = (totalPublished: number): string =>
  totalPublished > 1
    ? `Voir les ${totalPublished} gardes disponibles`
    : totalPublished === 1
      ? "Voir la garde disponible"
      : "Voir toutes les annonces";

/* En-tête signature, conservé pour les autres sections qui l'importent. */
export const SectionHeader = ({
  eyebrow,
  title,
  subtitle,
  as: Heading = "h2",
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  as?: "h2" | "h3";
}) => (
  <header className="mb-[22px]">
    <div className="flex items-center gap-[8px]">
      <span aria-hidden="true" className="inline-block bg-secondary" style={{ width: "20px", height: "2px" }} />
      <p className="text-secondary uppercase" style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.16em" }}>
        {eyebrow}
      </p>
    </div>
    <Heading className="font-heading text-foreground mt-[8px]" style={{ fontSize: "20px", fontWeight: 600, lineHeight: 1.25 }}>
      {title}
    </Heading>
    {subtitle && (
      <p className="font-sans text-muted-foreground mt-[8px]" style={{ fontSize: "13px", lineHeight: 1.4 }}>
        {subtitle}
      </p>
    )}
  </header>
);

const CARD_STYLE = { borderRadius: "22px" } as const;
const CARD_CLASS = "overflow-hidden bg-card border border-border shadow-[0_12px_32px_-18px_hsl(var(--foreground)/0.25)]";

const StarSkeleton = () => (
  <div className={`${CARD_CLASS} animate-pulse`} style={CARD_STYLE}>
    <div className="w-full photo-placeholder-green h-[200px] md:h-[280px]" />
    <div className="flex items-start p-[22px] md:px-[34px] md:py-[32px] gap-[22px]">
      <div className="rounded-full bg-muted shrink-0" style={{ width: 76, height: 76 }} />
      <div className="flex-1 space-y-[14px]">
        <div className="h-5 bg-muted rounded w-4/5" />
        <div className="h-4 bg-muted rounded w-2/3" />
        <div className="h-11 bg-muted rounded-full w-48" />
      </div>
    </div>
  </div>
);

const EmptyState = () => (
  <div className="text-center bg-card" style={{ border: "1px dashed hsl(var(--border))", borderRadius: "16px", padding: "34px 22px" }}>
    <div aria-hidden="true" className="mx-auto overflow-hidden" style={{ width: 140, height: 140, borderRadius: 14 }}>
      <img src={matchEmptyIllustration} alt="" width={140} height={140} loading="lazy" decoding="async" className="w-full h-full object-cover" />
    </div>
    <h3 className="font-heading text-foreground mt-[14px]" style={{ fontSize: "20px", fontWeight: 600 }}>
      Votre prochaine rencontre se prépare.
    </h3>
    <p className="font-sans text-muted-foreground mx-auto mt-[14px]" style={{ fontSize: "13px", maxWidth: "42ch", lineHeight: 1.5 }}>
      Les annonces qui correspondent à votre profil s'afficheront ici dès qu'un propriétaire du coin publiera son besoin.
    </p>
    <div className="mt-[22px]">
      <Link
        to="/recherche"
        className="inline-flex items-center justify-center rounded-full border border-border bg-card font-semibold text-foreground hover:bg-muted/40 transition-colors"
        style={{ minHeight: "44px", padding: "10px 18px", fontSize: "14px" }}
      >
        Voir toutes les annonces
      </Link>
    </div>
  </div>
);

const StarCard = ({
  sit,
  inAlertZone,
  onCtaClick,
}: {
  sit: AffinitySitCard;
  inAlertZone: boolean;
  onCtaClick?: () => void;
}) => {
  const place = [
    sit.owner_first_name ? `Chez ${sit.owner_first_name}` : null,
    sit.city ? formatCityLabel(sit.city) : null,
  ].filter(Boolean).join(" · ");
  const dates = formatDateRangeFr(sit.start_date, sit.end_date);
  const species = speciesLabel(sit.pet_species);
  const meta = [species, dates, inAlertZone ? "dans votre zone d'alerte" : null].filter(Boolean).join(" · ");
  const reasons = (sit.affinity?.matched ?? []).slice(0, 3);
  const showPercent = !!sit.affinity && canShowAffinityPercent(sit.affinity);
  const total = sit.affinity?.total ?? 0;
  const photoUrl = sit.pet_photo_url ?? sit.cover_photo_url;
  const cover = photoUrl ? getOptimizedImageUrl(photoUrl, 900, 78) : null;

  return (
    <article className={CARD_CLASS} style={CARD_STYLE} data-testid="sitter-star-card">
      <div className="relative w-full photo-placeholder-green h-[200px] md:h-[280px]">
        {cover && (
          <img
            src={cover}
            alt={sit.title ?? "Annonce"}
            className="w-full h-full object-cover"
            loading="eager"
            decoding="async"
            width={900}
            height={280}
            onError={(e) => { e.currentTarget.style.display = "none"; }}
          />
        )}
        {place && (
          <div
            className="absolute left-[14px] bottom-[14px] rounded-full text-foreground text-[12px] font-bold px-[12px] py-[6px]"
            style={{ backgroundColor: "hsl(var(--hero-paper))" }}
          >
            {place}
          </div>
        )}
      </div>

      <div className="flex flex-col md:flex-row md:items-start gap-[22px] p-[22px] md:px-[34px] md:py-[32px]">
        {showPercent && (
          <div className="shrink-0" data-testid="sitter-star-ring">
            <AffinityRing score={sit.affinity!.score} result={sit.affinity} size={76} />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <DashEyebrow>Une garde faite pour vous</DashEyebrow>
          <h2 className="font-heading text-foreground mt-[8px] text-[23px] md:text-[26px] font-semibold leading-tight">
            {sit.title ?? "Une garde à découvrir"}
          </h2>
          {meta && <p className="text-muted-foreground mt-[8px] text-[14px] leading-snug">{meta}</p>}

          {reasons.length > 0 && (
            <ul className="flex flex-wrap gap-[8px] mt-[14px]">
              {reasons.map((r) => (
                <li
                  key={r}
                  className="rounded-full border border-border text-foreground text-[12.5px] font-semibold px-[12px] py-[4px]"
                  style={{ backgroundColor: "hsl(var(--hero-paper))" }}
                >
                  {r}
                </li>
              ))}
            </ul>
          )}

          <div className="mt-[22px] flex flex-col sm:flex-row sm:items-center gap-[14px]">
            <Link
              to={`/sits/${sit.id}`}
              onClick={onCtaClick}
              className="shrink-0 inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground font-bold hover:bg-primary/90 transition-colors min-h-[48px] px-[22px] text-[14px]"
            >
              Découvrir cette garde
            </Link>
            {showPercent && total > 0 && (
              <p className="text-muted-foreground text-[12.5px] leading-snug">
                Affinité calculée sur {total} critère{total > 1 ? "s" : ""} comparé{total > 1 ? "s" : ""} entre vos deux profils.
              </p>
            )}
          </div>
        </div>
      </div>
    </article>
  );
};

const SitRow = ({ sit }: { sit: AffinitySitCard }) => {
  const dates = formatDateRangeFr(sit.start_date, sit.end_date);
  const distance = sit.distance_km == null ? null : `${Math.round(sit.distance_km)} km`;
  const meta = [sit.city ? formatCityLabel(sit.city) : null, dates, distance].filter(Boolean).join(" · ");
  const showPercent = !!sit.affinity && canShowAffinityPercent(sit.affinity);
  return (
    <li>
      <Link to={`/sits/${sit.id}`} className="flex items-center gap-[14px] py-[14px] group">
        {showPercent && (
          <span className="shrink-0 rounded-full bg-primary/10 text-primary px-[10px] py-[3px] text-[12px] font-semibold tabular-nums">
            {Math.round(sit.affinity!.score)} %
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-foreground text-[14.5px] font-semibold truncate">{sit.title ?? "Une garde à découvrir"}</p>
          {meta && <p className="text-muted-foreground text-[12.5px] mt-[2px] truncate">{meta}</p>}
        </div>
        <span className="shrink-0 text-primary text-[13px] font-semibold group-hover:underline underline-offset-4">Voir</span>
      </Link>
    </li>
  );
};

const SitRows = ({ eyebrow, sits }: { eyebrow: string; sits: AffinitySitCard[] }) => (
  <div data-testid="sitter-sit-rows">
    <DashEyebrow>{eyebrow}</DashEyebrow>
    <ul className="mt-[14px] divide-y divide-border border-y border-border">
      {sits.map((s) => <SitRow key={s.id} sit={s} />)}
    </ul>
  </div>
);

const SitterMatchSection = ({ topSits, fallbackSits, rankingSource, isLoading, totalPublished = 0, layout = "star" }: Props) => {
  const sectionRef = useRef<HTMLElement | null>(null);
  const primary = topSits[0] ?? fallbackSits[0] ?? null;
  const impressionKey = primary ? `sitter_star:${primary.id}` : null;
  const scoreForTrack = primary?.affinity?.score ?? null;

  useImpressionOnce(sectionRef, impressionKey, () => {
    void trackEvent("dashboard_star_seen", {
      source: "sitter_dashboard",
      metadata: { surface: "sitter_dashboard", variant: "match", ranking_source: rankingSource, score: scoreForTrack },
    });
  });

  const onCtaClick = () =>
    void trackEvent("dashboard_star_cta_clicked", {
      source: "sitter_dashboard",
      metadata: { surface: "sitter_dashboard", variant: "match", ranking_source: rankingSource, score: scoreForTrack, sit_id: primary?.id ?? null },
    });

  if (isLoading) {
    return (
      <section ref={sectionRef} data-dashboard-star="sitter" aria-label="Une garde faite pour vous">
        <StarSkeleton />
      </section>
    );
  }

  const shownIds = new Set([primary?.id].filter(Boolean));
  const rest = [...topSits, ...fallbackSits]
    .filter((sit) => !shownIds.has(sit.id))
    .filter((sit, index, rows) => rows.findIndex((row) => row.id === sit.id) === index)
    .slice(0, 2);
  const showEmpty = !primary && rest.length === 0;

  const exit = (
    <div className="mt-[14px]">
      <Link to="/search" className="text-primary text-[13px] font-semibold hover:underline underline-offset-4">
        {catalogExitLabel(totalPublished)}
      </Link>
    </div>
  );

  return (
    <section ref={sectionRef} data-dashboard-star="sitter" aria-label="Une garde faite pour vous" className="min-w-0">
      {showEmpty ? (
        <EmptyState />
      ) : layout === "rows" ? (
        <>
          <SitRows eyebrow="Des gardes pour vous" sits={[primary, ...rest].filter(Boolean) as AffinitySitCard[]} />
          {exit}
        </>
      ) : (
        <>
          {primary && <StarCard sit={primary} inAlertZone={rankingSource === "alert"} onCtaClick={onCtaClick} />}
          {rest.length > 0 && (
            <div className="mt-[34px]">
              <SitRows eyebrow="Aussi pour vous" sits={rest} />
            </div>
          )}
          {exit}
        </>
      )}
    </section>
  );
};

export default SitterMatchSection;
