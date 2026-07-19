/**
 * SitterTeaserCard — vague 8, émotion en aperçu pour la branche nouveau
 * gardien. Remplace SitterFirstNBA et NoNearbySitsEmptyState dans cette
 * branche uniquement. CTA secondaire, jamais primaire.
 */
import { Link } from "react-router-dom";
import matchEmptyIllustration from "@/assets/illustrations/sitter-match-empty.webp";
import { getOptimizedImageUrl } from "@/lib/imageOptim";
import type { AffinitySitCard, PoolScope } from "@/hooks/useSitterTopAffinitySits";
import { SectionHeader } from "./SitterMatchSection";
import AffinityBadge from "@/components/matching/AffinityBadge";

interface SitterTeaserCardProps {
  topSits: AffinitySitCard[];
  fallbackSits: AffinitySitCard[];
  scopeUsed: PoolScope;
  isLoading: boolean;
}

const PLACEHOLDER_BG =
  "linear-gradient(160deg, #cfe0d6, #a9c6b6 60%, #8bae9b)";

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
  if (scope === "dept") return "Dans votre département, en ce moment.";
  if (scope === "region") return "Dans votre région, en ce moment.";
  if (scope === "country") return "En France, en ce moment.";
  return "Près de chez vous, en ce moment.";
};

const speciesLabel = (species: string[]): string | null => {
  if (!species || species.length === 0) return null;
  if (species.length === 1) return species[0];
  return `${species.length} animaux`;
};

const Skeleton = () => (
  <div
    className="overflow-hidden border border-border bg-card animate-pulse"
    style={{ borderRadius: "20px" }}
  >
    <div className="w-full bg-muted" style={{ height: "150px" }} />
    <div style={{ padding: "22px" }} className="space-y-[14px]">
      <div className="h-5 bg-muted rounded w-4/5" />
      <div className="h-4 bg-muted rounded w-2/3" />
      <div className="h-9 bg-muted rounded-full w-48" />
    </div>
  </div>
);

const EmptyTeaser = () => (
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
      Dès qu'un propriétaire de votre coin publiera son besoin, vous le verrez ici.
    </p>
    <div className="mt-[22px]">
      <Link
        to="/recherche"
        className="text-primary hover:underline underline-offset-4"
        style={{ fontSize: "13px", fontWeight: 700 }}
      >
        Explorer toutes les annonces
      </Link>
    </div>
  </div>
);

const TeaserCard = ({ sit }: { sit: AffinitySitCard }) => {
  const place = [
    sit.owner_first_name ? `Chez ${sit.owner_first_name}` : null,
    sit.city,
  ]
    .filter(Boolean)
    .join(" · ");
  const dates = formatDateRange(sit.start_date, sit.end_date);
  const species = speciesLabel(sit.pet_species);
  const meta = [species, dates].filter(Boolean).join(" · ");
  const cover = sit.cover_photo_url
    ? getOptimizedImageUrl(sit.cover_photo_url, 900, 78)
    : null;
  const affinityDisplayable = !!sit.affinity && (sit.affinity.total ?? 0) > 0;

  return (
    <article
      className="bg-card border border-border overflow-hidden"
      style={{
        borderRadius: "20px",
        boxShadow: "0 1px 2px rgba(29,27,22,0.04), 0 8px 24px rgba(29,27,22,0.05)",
      }}
    >
      {/* Bandeau photo 150px, PAS de ring dans cette branche */}
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
            className="absolute left-[14px] bottom-[14px] rounded-full"
            style={{
              backgroundColor: "rgba(255,255,255,0.92)",
              padding: "6px 12px",
              fontSize: "12px",
              fontWeight: 700,
              color: "hsl(var(--foreground))",
            }}
          >
            {place}
          </div>
        )}
      </div>

      <div style={{ padding: "22px" }}>
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

        <div className="mt-[22px]">
          <Link
            to={`/sits/${sit.id}`}
            className="inline-flex items-center justify-center rounded-full border border-border bg-card text-foreground hover:bg-muted/40 transition-colors"
            style={{
              padding: "10px 18px",
              minHeight: "44px",
              fontSize: "14px",
              fontWeight: 700,
            }}
          >
            Découvrir cette garde
          </Link>
        </div>

        {/* Ligne d'affinité : chip si score affichable, sinon phrase douce */}
        <div className="mt-[14px] flex items-center gap-[8px]">
          {affinityDisplayable ? (
            <AffinityBadge result={sit.affinity!} size="sm" />
          ) : (
            <>
              <span
                aria-hidden="true"
                className="inline-block bg-secondary shrink-0"
                style={{ width: "12px", height: "1.5px" }}
              />
              <p
                className="text-muted-foreground"
                style={{ fontSize: "12.5px", lineHeight: 1.4 }}
              >
                Votre affinité avec cette maison s'affichera dès votre profil complété.
              </p>
            </>
          )}
        </div>
      </div>
    </article>
  );
};

const SitterTeaserCard = ({
  topSits,
  fallbackSits,
  scopeUsed,
  isLoading,
}: SitterTeaserCardProps) => {
  const featured = topSits[0] ?? fallbackSits[0] ?? null;

  return (
    <section aria-labelledby="teaser-heading" className="px-4 sm:px-5 md:px-8 lg:px-0">
      <SectionHeader
        eyebrow="Ce qui vous attend"
        title="Une maison cherche déjà son gardien."
        subtitle={scopeSubtitle(scopeUsed)}
      />
      {isLoading ? <Skeleton /> : featured ? <TeaserCard sit={featured} /> : <EmptyTeaser />}
    </section>
  );
};

export default SitterTeaserCard;
