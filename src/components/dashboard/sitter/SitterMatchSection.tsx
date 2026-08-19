import matchEmptyIllustration from "@/assets/illustrations/sitter-match-empty.webp";

import { Link } from "react-router-dom";
import { useRef } from "react";
import { getOptimizedImageUrl } from "@/lib/imageOptim";
import type { AffinitySitCard, PoolScope } from "@/hooks/useSitterTopAffinitySits";
import AffinityRing from "@/components/matching/AffinityRing";
import { trackEvent } from "@/lib/analytics";
import { useImpressionOnce } from "@/hooks/useImpressionOnce";
import { petSpeciesLabel } from "@/lib/petLabels";
import { scopeSubtitle } from "@/lib/matchScope";

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
  /** Nombre réel d'annonces publiées visibles par ce gardien, pour le lien
   * de sortie vers la recherche. Jamais codé en dur. */
  totalPublished?: number;
}

// Le fond d'attente passe par la classe .photo-placeholder-green (token CSS
// qui s'assombrit en dark), jamais par un style inline.

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

const speciesLabel = (species: string[]): string | null => {
  if (!species || species.length === 0) return null;
  // Mapping partagé, jamais la valeur brute de l'enum ("dog" -> "Chien").
  if (species.length === 1) return petSpeciesLabel(species[0]);
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
    {/* Même fond d'attente aquarelle que la carte chargée : jamais de
        rectangle blanc pendant la cascade de requêtes. */}
    <div className="w-full photo-placeholder-green" style={{ height: "150px" }} />
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
  // Photo d'animal d'abord (la garde), couverture du lieu en repli.
  const photoUrl = sit.pet_photo_url ?? sit.cover_photo_url;
  const cover = photoUrl
    ? getOptimizedImageUrl(photoUrl, 900, 78)
    : null;

  return (
    <article className="group notebook-card relative">
      <div className="notebook-card-paper absolute inset-0" aria-hidden="true" />
      {/* Bandeau photo, hauteur exacte 150px. Fond d'attente aquarelle TOUJOURS
          présent sous l'image : jamais de rectangle blanc pendant le chargement. */}
      <div
        className="relative w-full photo-placeholder-green"
        style={{ height: "150px" }}
      >
        {cover && (
          <img
            src={cover}
            alt={sit.title ?? "Annonce"}
            className="w-full h-full object-cover"
            loading="eager"
            decoding="async"
            width={900}
            height={300}
            onError={(e) => {
              // Image cassée : on la masque, le fond aquarelle prend le relais.
              e.currentTarget.style.display = "none";
            }}
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
        className="relative flex items-start"
        style={{ padding: "22px", paddingRight: "34px", gap: "22px" }}
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
              Basé sur {total} critère{total > 1 ? "s" : ""} comparé{total > 1 ? "s" : ""} entre vos deux profils.
            </p>
          )}
        </div>
      </div>
      <div className="notebook-card-edge" aria-hidden="true" />
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

const SitterMatchSection = ({ topSits, fallbackSits, discoverySit, scopeUsed, isLoading, totalPublished = 0 }: Props) => {
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

  // Rangée compacte : reste du top affinité, complété par le pool de repli
  // (jamais de doublon avec la vedette ni entre eux). Maximum 3 rangées,
  // discrètes, elles ne concurrencent pas la vedette.
  const restScored = hasScored ? usableScored.slice(1) : [];
  const shownIds = new Set(
    [primary?.id, ...restScored.map((s) => s.id)].filter(Boolean),
  );
  const restFill = fallbackSits.filter((s) => !shownIds.has(s.id));
  const rest = [...restScored, ...restFill].slice(0, 3);

  const showEmpty = !primary && rest.length === 0;

  const searchLinkLabel =
    totalPublished > 1
      ? `Voir les ${totalPublished} gardes disponibles`
      : totalPublished === 1
        ? "Voir la garde disponible"
        : "Voir toutes les annonces";

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
        subtitle={scopeSubtitle(scopeUsed)}
      />

      {showEmpty ? (
        <EmptyState />
      ) : (
        <>
          {primary && <StarCard sit={primary} onCtaClick={onCtaClick} />}

          {rest.length > 0 && (
            <div className="space-y-[10px] mt-[14px]">
              {rest.map((s) => (
                <CompactRow key={s.id} sit={s} showScore={!!s.affinity} />
              ))}
            </div>
          )}

          {discoverySit && (
            <div style={{ marginTop: "22px" }}>
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

          <div className="mt-[18px]">
            <Link
              to="/search"
              className="text-primary hover:underline underline-offset-4"
              style={{ fontSize: "13px", fontWeight: 700 }}
            >
              {searchLinkLabel}
            </Link>
          </div>
        </>
      )}
    </section>
  );
};

export default SitterMatchSection;
