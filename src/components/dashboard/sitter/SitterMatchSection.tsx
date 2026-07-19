import { Link } from "react-router-dom";
import { getOptimizedImageUrl } from "@/lib/imageOptim";
import type { AffinitySitCard, PoolScope } from "@/hooks/useSitterTopAffinitySits";

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
/*  Ring d'affinité, signature unique de l'écran                              */
/* -------------------------------------------------------------------------- */

const AffinityRing = ({ score }: { score: number }) => {
  const size = 70;
  const stroke = 7;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const offset = c - (clamped / 100) * c;

  return (
    <div
      role="img"
      aria-label={`Affinité ${clamped} pour cent, calculée sur vos préférences communes`}
      className="relative shrink-0"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <linearGradient id="matchRingGrad" x1="0" y1="0" x2="1" y2="1" gradientTransform="rotate(135, 0.5, 0.5)">
            <stop offset="0%" stopColor="#2C6D50" />
            <stop offset="55%" stopColor="#7C8A45" />
            <stop offset="100%" stopColor="#C8A24B" />
          </linearGradient>
        </defs>
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="#EDE7DE"
            strokeWidth={stroke}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="url(#matchRingGrad)"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={offset}
          />
        </g>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span
          className="font-heading text-primary"
          style={{ fontSize: "17px", lineHeight: 1, fontWeight: 600 }}
        >
          {clamped}%
        </span>
        <span
          className="text-muted-foreground uppercase"
          style={{ fontSize: "7.5px", letterSpacing: "0.12em", marginTop: "2px" }}
        >
          Affinité
        </span>
      </div>
    </div>
  );
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
    <h3
      className="font-heading text-foreground"
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

const StarCard = ({ sit }: { sit: AffinitySitCard }) => {
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

      {/* Corps : ring + contenu */}
      <div
        className="flex items-start"
        style={{ padding: "22px", gap: "22px" }}
      >
        {sit.affinity && <AffinityRing score={sit.affinity.score} />}

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
/*  Section principale                                                        */
/* -------------------------------------------------------------------------- */

const SitterMatchSection = ({ topSits, fallbackSits, scopeUsed, isLoading }: Props) => {
  if (isLoading) {
    return (
      <section
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

  const usableScored = topSits.filter((s) => s.affinity);
  const usableFallback = fallbackSits;
  const hasScored = usableScored.length > 0;
  const primary = hasScored ? usableScored[0] : null;
  const rest = hasScored ? usableScored.slice(1, 3) : usableFallback.slice(0, 3);
  const rowsShowScore = hasScored;

  const showEmpty = !primary && rest.length === 0;

  return (
    <section
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
          {primary && <StarCard sit={primary} />}

          {rest.length > 0 && (
            <div style={{ marginTop: "52px" }}>
              <SectionHeader
                eyebrow="Près de chez vous"
                title="D'autres maisons cherchent leur gardien."
                subtitle={scopeSubtitle(scopeUsed) || undefined}
              />
              <div className="space-y-[14px]">
                {rest.map((s) => (
                  <CompactRow key={s.id} sit={s} showScore={rowsShowScore} />
                ))}
              </div>
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
