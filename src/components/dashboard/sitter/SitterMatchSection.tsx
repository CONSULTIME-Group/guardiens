import matchEmptyIllustration from "@/assets/illustrations/sitter-match-empty.webp";

import { Link } from "react-router-dom";
import { useRef } from "react";
import { getOptimizedImageUrl } from "@/lib/imageOptim";
import type { AffinitySitCard, PoolScope } from "@/hooks/useSitterTopAffinitySits";
import AffinityRing from "@/components/matching/AffinityRing";
import { trackEvent } from "@/lib/analytics";
import { useImpressionOnce } from "@/hooks/useImpressionOnce";

/**
 * Vague 2 sur 4, la carte rencontre.
 *
 * Star unique de l'écran gardien confirmé. Un seul bouton primaire sur tout
 * le dashboard, un seul ring d'affinité visible, or réservé au ring.
 * Données strictement issues de useSitterTopAffinitySits, aucun score
 * simulé, aucun libellé inventé.
 */

interface Props {
  topSits: AffinitySitCard[];
  fallbackSits: AffinitySitCard[];
  discoverySit?: AffinitySitCard | null;
  scopeUsed: PoolScope;
  isLoading: boolean;
}

// Vague 15 : passe par un token CSS pour s'assombrir en dark.
const PLACEHOLDER_BG = "var(--photo-placeholder-green)";

const DATE_FMT = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
});

const formatDateRange = (start: string | null, end: string | null): string | null => {
  if (!start && !end) return null;
  try {
    if (start && end) {
      const s = new Date(start);
      const e = new Date(end);
      return `${DATE_FMT.format(s)} au ${DATE_FMT.format(e)}`;
    }
    const single = new Date((start ?? end) as string);
    return DATE_FMT.format(single);
  } catch {
    return null;
  }
};

const scopeSubtitle = (scope: PoolScope): string => {
  if (scope === "dept") return "Dans votre département.";
  if (scope === "region") return "Dans votre région.";
  if (scope === "country") return "Ailleurs en France.";
  return "";
};

const speciesLabel = (species: string[]): string | null => {
  if (!species || species.length === 0) return null;
  if (species.length === 1) return species[0];
  return `${species.length} animaux`;
};

/* -------------------------------------------------------------------------- */
/*  En-tête signature : trait + eyebrow + titre + sous-titre                  */
/* -------------------------------------------------------------------------- */

export const SectionHeader = ({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
}) => (
  <header className="mb-[22px]">
    <div className="flex items-center gap-[8px]">
      <span
        aria-hidden="true"
        className="inline-block bg-secondary"
        style={{ width: "20px", height: "2px" }}
      />
      <p
        className="text-secondary uppercase"
        style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.16em" }}
      >
        {eyebrow}
      </p>
    </div>
    <h2
      className="font-heading text-foreground mt-[8px]"
      style={{ fontSize: "20px", fontWeight: 600, lineHeight: 1.25 }}
    >
      {title}
    </h2>
    {subtitle && (
      <p
        className="font-sans text-muted-foreground mt-[8px]"
        style={{ fontSize: "13px", lineHeight: 1.4 }}
      >
        {subtitle}
      </p>
    )}
  </header>
);

/* -------------------------------------------------------------------------- */
/*  Skeleton (mêmes dimensions, jamais de spinner)                            */
/* -------------------------------------------------------------------------- */

const StarSkeleton = () => (
  <div
    className="overflow-hidden border border-border bg-card animate-pulse"
    style={{ borderRadius: "20px" }}
  >
    <div className="w-full bg-muted" style={{ height: "150px" }} />
    <div className="flex items-start" style={{ padding: "22px", gap: "22px" }}>
      <div className="rounded-full bg-muted shrink-0" style={{ width: 70, height: 70 }} />
      <div className="flex-1 space-y-[14px]">
        <div className="h-5 bg-muted rounded w-4/5" />
        <div className="h-4 bg-muted rounded w-2/3" />
        <div className="h-9 bg-muted rounded-full w-48" />
      </div>
    </div>
  </div>
);

/* -------------------------------------------------------------------------- */
/*  Empty state raconté (pas de rouge, pas de croix, pas de "0 annonce")     */
/* -------------------------------------------------------------------------- */

const EmptyState = () => (
  <div
    className="text-center bg-card"
    style={{
      border: "1px dashed hsl(var(--border))",
      borderRadius: "16px",
      padding: "34px 22px",
    }}
  >
    <div
      aria-hidden="true"
      className="illustration-wrapper mx-auto"
      style={{ width: 140, height: 140 }}
    >
      <img
        src={matchEmptyIllustration}
        alt=""
        width={140}
        height={140}
        loading="lazy"
        decoding="async"
        className="illustration-blend animate-painted-reveal w-full h-full object-cover"
      />
    </div>
    <h3
      className="font-heading text-foreground mt-[14px]"
      style={{ fontSize: "20px", fontWeight: 600 }}
    >
      Votre prochaine rencontre se prépare.
    </h3>

    <p
      className="font-sans text-muted-foreground mx-auto mt-[14px]"
      style={{ fontSize: "13px", maxWidth: "42ch", lineHeight: 1.5 }}
    >
      Les annonces qui correspondent à votre profil s'afficheront ici dès qu'un propriétaire du coin publiera son besoin.
    </p>
    <div className="mt-[22px]">
      <Link
        to="/recherche"
        className="inline-flex items-center justify-center rounded-full border border-border bg-card font-semibold text-foreground hover:bg-muted/40 transition-colors"
        style={{
          minHeight: "44px",
          padding: "10px 18px",
          fontSize: "14px",
        }}
      >
        Voir toutes les annonces
      </Link>
    </div>
  </div>
);

/* -------------------------------------------------------------------------- */
/*  Carte star (topSits[0])                                                   */
/* -------------------------------------------------------------------------- */

const StarCard = ({ sit, onCtaClick }: { sit: AffinitySitCard; onCtaClick?: () => void }) => {
  const place = [
    sit.owner_first_name ? `Chez ${sit.owner_first_name}` : null,
    sit.city,
  ]
    .filter(Boolean)
    .join(" · ");
  const dates = formatDateRange(sit.start_date, sit.end_date);
  const species = speciesLabel(sit.pet_species);
  const meta = [species, dates].filter(Boolean).join(" · ");
  const matched = sit.affinity?.matched ?? [];
  const chips = matched.slice(0, 2);
  const total = sit.affinity?.total ?? 0;
  const cover = sit.cover_photo_url
    ? getOptimizedImageUrl(sit.cover_photo_url, 900, 78)
    : null;

  return (
    <article
      className="group bg-card border border-border overflow-hidden transition-shadow"
      style={{
        borderRadius: "20px",
        boxShadow: "0 1px 2px rgba(29,27,22,0.04), 0 8px 24px rgba(29,27,22,0.05)",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow =
          "0 2px 4px rgba(29,27,22,0.05), 0 18px 40px rgba(29,27,22,0.09)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow =
          "0 1px 2px rgba(29,27,22,0.04), 0 8px 24px rgba(29,27,22,0.05)";
      }}
    >
      {/* Bandeau photo, hauteur exacte 150px */}
      <div
        className="relative w-full"
        style={{
          height: "150px",
          background: cover ? undefined : PLACEHOLDER_BG,
        }}
      >
        {cover && (
          <img
            src={cover}
            alt={sit.title ?? "Annonce"}
            className="w-full h-full object-cover"
            loading="lazy"
            width={900}
            height={300}
          />
        )}
        {place && (
          <div
            className="absolute left-[14px] bottom-[14px] rounded-full bg-background/90 text-foreground"
            style={{
              padding: "6px 12px",
              fontSize: "12px",
              fontWeight: 700,
            }}
          >
            {place}
          </div>
        )}
      </div>

      {/* Corps : ring + contenu */}
      <div
        className="flex items-start"
        style={{ padding: "22px", gap: "22px" }}
      >
        {sit.affinity && <AffinityRing score={sit.affinity.score} result={sit.affinity} />}

        <div className="min-w-0 flex-1">
          <h3
            className="font-heading text-foreground"
            style={{
              fontSize: "19px",
              fontWeight: 600,
              lineHeight: 1.3,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {sit.title ?? "Une garde à découvrir"}
          </h3>

          {meta && (
            <p
              className="text-muted-foreground mt-[8px]"
              style={{ fontSize: "13.5px", lineHeight: 1.4 }}
            >
              {meta}
            </p>
          )}

          {chips.length > 0 && (
            <div className="flex flex-wrap gap-[8px] mt-[14px]">
              {chips.map((c) => (
                <span
                  key={c}
                  className="rounded-full text-primary"
                  style={{
                    backgroundColor: "hsl(var(--primary) / 0.1)",
                    padding: "4px 12px",
                    fontSize: "12px",
                    fontWeight: 600,
                  }}
                >
                  {c}
                </span>
              ))}
            </div>
          )}

          <div className="mt-[22px]">
            <Link
              to={`/sits/${sit.id}`}
              onClick={onCtaClick}
              className="inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground font-bold transition-colors hover:bg-primary/90"
              style={{
                padding: "10px 18px",
                minHeight: "44px",
                fontSize: "14px",
                fontWeight: 700,
                boxShadow: "0 6px 14px rgba(44,109,80,0.24)",
              }}
            >
              Découvrir cette garde
            </Link>
          </div>

          {total > 0 && (
            <p
              className="text-muted-foreground mt-[14px]"
              style={{ fontSize: "12px", lineHeight: 1.4 }}
            >
              Basé sur {total} critères partagés entre vos deux profils.
            </p>
          )}
        </div>
      </div>
    </article>
  );
};

/* -------------------------------------------------------------------------- */
/*  Rangées compactes (topSits[1..2] ou fallback sans chip)                   */
/* -------------------------------------------------------------------------- */

const CompactRow = ({
  sit,
  showScore,
}: {
  sit: AffinitySitCard;
  showScore: boolean;
}) => {
  const dates = formatDateRange(sit.start_date, sit.end_date);
  const species = speciesLabel(sit.pet_species);
  const meta = [sit.city, species, dates].filter(Boolean).join(" · ");

  return (
    <Link
      to={`/sits/${sit.id}`}
      className="flex items-center bg-card border border-border hover:border-primary/40 transition-colors"
      style={{
        borderRadius: "16px",
        padding: "14px 22px",
        gap: "14px",
      }}
    >
      {showScore && sit.affinity && (
        <span
          className="rounded-full bg-secondary text-secondary-foreground shrink-0"
          style={{
            padding: "4px 10px",
            fontSize: "12px",
            fontWeight: 600,
          }}
        >
          {Math.round(sit.affinity.score)} %
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p
          className="font-heading text-foreground truncate"
          style={{ fontSize: "15.5px", fontWeight: 600, lineHeight: 1.3 }}
        >
          {sit.title ?? "Une garde à découvrir"}
        </p>
        {meta && (
          <p
            className="text-muted-foreground truncate mt-[4px]"
            style={{ fontSize: "12.5px" }}
          >
            {meta}
          </p>
        )}
      </div>
      <span
        className="text-primary shrink-0"
        style={{ fontSize: "13px", fontWeight: 700 }}
      >
        Voir
      </span>
    </Link>
  );
};

/* -------------------------------------------------------------------------- */
/*  Rangée "découverte" (Vague 9) — altérité, jamais de score                 */
/* -------------------------------------------------------------------------- */

const DiscoveryRow = ({ sit }: { sit: AffinitySitCard }) => {
  const dates = formatDateRange(sit.start_date, sit.end_date);
  const species = speciesLabel(sit.pet_species);
  const meta = [sit.city, species, dates].filter(Boolean).join(" · ");

  return (
    <Link
      to={`/sits/${sit.id}`}
      className="flex items-center bg-card border border-border hover:border-primary/40 transition-colors"
      style={{
        borderRadius: "16px",
        padding: "14px 22px",
        gap: "14px",
      }}
    >
      <span
        className="rounded-full shrink-0"
        style={{
          backgroundColor: "hsl(var(--primary) / 0.1)",
          color: "hsl(var(--primary))",
          padding: "4px 10px",
          fontSize: "12px",
          fontWeight: 600,
        }}
      >
        À découvrir
      </span>
      <div className="min-w-0 flex-1">
        <p
          className="font-heading text-foreground truncate"
          style={{ fontSize: "15.5px", fontWeight: 600, lineHeight: 1.3 }}
        >
          {sit.title ?? "Une garde à découvrir"}
        </p>
        {meta && (
          <p
            className="text-muted-foreground truncate mt-[4px]"
            style={{ fontSize: "12.5px" }}
          >
            {meta}
          </p>
        )}
      </div>
      <span
        className="text-primary shrink-0"
        style={{ fontSize: "13px", fontWeight: 700 }}
      >
        Voir
      </span>
    </Link>
  );
};

/* -------------------------------------------------------------------------- */
/*  Section principale                                                        */
/* -------------------------------------------------------------------------- */

const SitterMatchSection = ({ topSits, fallbackSits, discoverySit, scopeUsed, isLoading }: Props) => {
  const sectionRef = useRef<HTMLElement | null>(null);
  const usableScored = topSits.filter((s) => s.affinity);
  const hasScored = usableScored.length > 0;
  const primary = hasScored ? usableScored[0] : (fallbackSits[0] ?? null);
  const impressionKey = primary ? `sitter_star:${primary.id}` : null;
  const scoreForTrack = primary?.affinity?.score ?? null;

  useImpressionOnce(sectionRef, impressionKey, () => {
    void trackEvent("dashboard_star_seen", {
      source: "sitter_dashboard",
      metadata: { surface: "sitter_dashboard", variant: "match", scope: scopeUsed, score: scoreForTrack },
    });
  });

  const onCtaClick = () =>
    void trackEvent("dashboard_star_cta_clicked", {
      source: "sitter_dashboard",
      metadata: { surface: "sitter_dashboard", variant: "match", scope: scopeUsed, score: scoreForTrack, sit_id: primary?.id ?? null },
    });

  if (isLoading) {
    return (
      <section
        ref={sectionRef}
        data-dashboard-star="sitter"
        aria-label="Rencontre suggérée"
        className="px-4 sm:px-5 md:px-8 lg:px-0"
      >
        <SectionHeader
          eyebrow="Une rencontre faite pour vous"
          title="Vous êtes faits pour vous entendre."
          subtitle="Calculé sur vos animaux, votre présence et votre rythme de vie."
        />
        <StarSkeleton />
      </section>
    );
  }

  const usableFallback = fallbackSits;
  const rest = hasScored ? usableScored.slice(1, 3) : usableFallback.slice(0, 3);
  const rowsShowScore = hasScored;

  const showEmpty = !primary && rest.length === 0;

  return (
    <section
      ref={sectionRef}
      data-dashboard-star="sitter"
      aria-label="Rencontre suggérée"
      className="px-4 sm:px-5 md:px-8 lg:px-0"
    >
      <SectionHeader
        eyebrow="Une rencontre faite pour vous"
        title="Vous êtes faits pour vous entendre."
        subtitle="Calculé sur vos animaux, votre présence et votre rythme de vie."
      />

      {showEmpty ? (
        <EmptyState />
      ) : (
        <>
          {primary && <StarCard sit={primary} onCtaClick={onCtaClick} />}

          {(rest.length > 0 || discoverySit) && (
            <div style={{ marginTop: "52px" }}>
              <SectionHeader
                eyebrow="Près de chez vous"
                title="D'autres maisons cherchent leur gardien."
                subtitle={scopeSubtitle(scopeUsed) || undefined}
              />
              {rest.length > 0 && (
                <div className="space-y-[14px]">
                  {rest.map((s) => (
                    <CompactRow key={s.id} sit={s} showScore={rowsShowScore} />
                  ))}
                </div>
              )}
              {discoverySit && (
                <div style={{ marginTop: rest.length > 0 ? "22px" : "0" }}>
                  <p
                    className="font-heading text-muted-foreground mb-[8px]"
                    style={{
                      fontSize: "13.5px",
                      fontStyle: "italic",
                      lineHeight: 1.4,
                    }}
                  >
                    Et pour ce que vous n'avez pas encore vécu :
                  </p>
                  <DiscoveryRow sit={discoverySit} />
                </div>
              )}
              <div className="mt-[22px]">
                <Link
                  to="/recherche"
                  className="text-primary"
                  style={{ fontSize: "13px", fontWeight: 700 }}
                >
                  Toutes les annonces autour de vous
                </Link>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
};

export default SitterMatchSection;
