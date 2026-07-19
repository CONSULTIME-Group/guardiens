/**
 * OwnerStarSection (vague 10) — LA star contextuelle du dashboard propriétaire.
 *
 * Une seule carte vedette à la fois, choisie par priorité :
 *   a) garde en cours       -> "Suivre la garde"
 *   b) candidatures pending -> "Découvrir sa candidature" (ring d'affinité
 *      réciproque si calculable, avatar sinon)
 *   c) brouillon            -> "Reprendre mon annonce"
 *   d) aucune annonce       -> "Publier une annonce" + concierge Alma imbriqué
 *
 * Réutilise strictement les données déjà chargées par OwnerDashboard :
 * pas de fetch supplémentaire. Toutes les copies suivent les règles
 * éditoriales (vouvoiement, pas d'emoji, pas de tiret cadratin).
 */
import { differenceInDays } from "date-fns";
import { Link } from "react-router-dom";
import { useRef } from "react";
import { getOptimizedImageUrl } from "@/lib/imageOptim";
import AffinityRing from "@/components/matching/AffinityRing";
import { useViewerOwnerForAffinity } from "@/hooks/useViewerOwnerForAffinity";
import {
  computeAffinityResultFull,
  type AffinityResult,
  type AffinitySitterInput,
} from "@/lib/affinityScore";
import type { AppRow, SitterInfo, SitRow } from "./types";
import { capitalize } from "./helpers";
import SitDraftFromPrompt from "@/components/dashboard/SitDraftFromPrompt";
import type { OwnerPrimaryAction } from "@/hooks/useOwnerPrimaryAction";
import { trackEvent } from "@/lib/analytics";
import { useImpressionOnce } from "@/hooks/useImpressionOnce";

const DATE_FMT = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
});

const formatDateRange = (start?: string | null, end?: string | null): string | null => {
  if (!start && !end) return null;
  try {
    if (start && end) {
      return `${DATE_FMT.format(new Date(start))} au ${DATE_FMT.format(new Date(end))}`;
    }
    return DATE_FMT.format(new Date((start ?? end) as string));
  } catch {
    return null;
  }
};

const PLACEHOLDER_BG = "linear-gradient(160deg, #cfe0d6, #a9c6b6 60%, #8bae9b)";

/* ------------------------------------------------------------------ */
/*  En-tête de section (eyebrow terracotta + titre Playfair)          */
/* ------------------------------------------------------------------ */
const SectionHeader = ({
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
      style={{ fontSize: "22px", fontWeight: 600, lineHeight: 1.25 }}
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

/* ------------------------------------------------------------------ */
/*  Bouton primaire unique de la section                              */
/* ------------------------------------------------------------------ */
const PrimaryCta = ({
  to,
  children,
  onClick,
}: {
  to: string;
  children: React.ReactNode;
  onClick?: () => void;
}) => (
  <Link
    to={to}
    onClick={onClick}
    className="inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground font-bold transition-colors hover:bg-primary/90"
    style={{
      padding: "10px 18px",
      minHeight: "44px",
      fontSize: "14px",
      fontWeight: 700,
      boxShadow: "0 6px 14px rgba(44,109,80,0.24)",
    }}
  >
    {children}
  </Link>
);

/* ================================================================== */
/*  A. Garde en cours                                                 */
/* ================================================================== */
const OngoingCard = ({
  sit,
  sitter,
  coverPhoto,
  onCtaClick,
}: {
  sit: SitRow;
  sitter?: SitterInfo | null;
  coverPhoto?: string | null;
  onCtaClick?: () => void;
}) => {
  const dates = formatDateRange(sit.start_date, sit.end_date);
  const daysLeft = sit.end_date
    ? Math.max(0, differenceInDays(new Date(sit.end_date), new Date()))
    : null;
  const cover = coverPhoto ? getOptimizedImageUrl(coverPhoto, 900, 78) : null;
  const sitterName = sitter?.first_name ? capitalize(sitter.first_name) : "Votre gardien";

  return (
    <article
      className="bg-card border border-border overflow-hidden"
      style={{
        borderRadius: "20px",
        boxShadow: "0 1px 2px rgba(29,27,22,0.04), 0 8px 24px rgba(29,27,22,0.05)",
      }}
    >
      <div
        className="relative w-full"
        style={{ height: "150px", background: cover ? undefined : PLACEHOLDER_BG }}
      >
        {cover && (
          <img
            src={cover}
            alt={sit.title || "Votre maison"}
            className="w-full h-full object-cover"
            loading="lazy"
            width={900}
            height={300}
          />
        )}
      </div>
      <div style={{ padding: "22px" }} className="flex items-start gap-[22px]">
        <div className="w-14 h-14 rounded-full overflow-hidden bg-primary/10 shrink-0 flex items-center justify-center">
          {sitter?.avatar_url ? (
            <img src={sitter.avatar_url} alt="" className="w-full h-full object-cover" loading="lazy" />
          ) : (
            <span className="font-heading font-bold text-primary text-xl">
              {sitterName.charAt(0)}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3
            className="font-heading text-foreground"
            style={{ fontSize: "19px", fontWeight: 600, lineHeight: 1.3 }}
          >
            {sitterName} veille sur votre maison.
          </h3>
          {dates && (
            <p className="text-muted-foreground mt-[8px]" style={{ fontSize: "13.5px" }}>
              {dates}
              {daysLeft !== null && (
                <> · fin dans {daysLeft} jour{daysLeft > 1 ? "s" : ""}</>
              )}
            </p>
          )}
          <div className="mt-[22px]">
            <PrimaryCta to={`/sits/${sit.id}`} onClick={onCtaClick}>Suivre la garde</PrimaryCta>
          </div>
        </div>
      </div>
    </article>
  );
};

/* ================================================================== */
/*  B. Candidatures en attente                                        */
/* ================================================================== */
const ApplicationCard = ({
  app,
  sitter,
  affinity,
  affinityInput,
  extraCount,
  onCtaClick,
}: {
  app: AppRow;
  sitter: SitterInfo | null;
  affinity: AffinityResult | null;
  affinityInput: AffinitySitterInput | null;
  extraCount: number;
  onCtaClick?: () => void;
}) => {
  const firstName = sitter?.first_name ? capitalize(sitter.first_name) : "Un gardien";
  const dates = formatDateRange(app.sit?.start_date, app.sit?.end_date);
  const meta: string[] = [];
  if (typeof sitter?.completed_sits_count === "number" && sitter.completed_sits_count > 0) {
    meta.push(`${sitter.completed_sits_count} garde${sitter.completed_sits_count > 1 ? "s" : ""} réalisée${sitter.completed_sits_count > 1 ? "s" : ""}`);
  }
  const rating = sitter?.avgNote ? Number(sitter.avgNote) : null;
  if (rating && !Number.isNaN(rating)) meta.push(`${rating} sur 5 en moyenne`);

  const chips = (affinity?.matched ?? []).slice(0, 2);
  const showRing = !!affinity && !!affinityInput && typeof affinity.score === "number" && affinity.displayed !== false;

  return (
    <article
      className="bg-card border border-border"
      style={{
        borderRadius: "20px",
        padding: "22px",
        boxShadow: "0 1px 2px rgba(29,27,22,0.04), 0 8px 24px rgba(29,27,22,0.05)",
      }}
    >
      <div className="flex items-start gap-[22px]">
        {showRing ? (
          <AffinityRing score={affinity!.score} result={affinity} />
        ) : (
          <div className="w-16 h-16 rounded-full overflow-hidden bg-primary/10 shrink-0 flex items-center justify-center">
            {sitter?.avatar_url ? (
              <img src={sitter.avatar_url} alt="" className="w-full h-full object-cover" loading="lazy" />
            ) : (
              <span className="font-heading font-bold text-primary text-xl">
                {firstName.charAt(0)}
              </span>
            )}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <h3
            className="font-heading text-foreground"
            style={{ fontSize: "19px", fontWeight: 600, lineHeight: 1.3 }}
          >
            {firstName} aimerait garder votre maison.
          </h3>
          {(dates || meta.length > 0) && (
            <p
              className="text-muted-foreground mt-[8px]"
              style={{ fontSize: "13.5px", lineHeight: 1.4 }}
            >
              {[dates, ...meta].filter(Boolean).join(" · ")}
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

          <div className="mt-[22px] flex flex-wrap items-center gap-[14px]">
            <PrimaryCta to={app.sit_id ? `/sits/${app.sit_id}#candidatures` : "/sits"} onClick={onCtaClick}>
              Découvrir sa candidature
            </PrimaryCta>
            {extraCount > 0 && (
              <Link
                to="/sits"
                className="text-primary hover:underline"
                style={{ fontSize: "13px", fontWeight: 700 }}
              >
                Voir les autres candidatures
              </Link>
            )}
          </div>
        </div>
      </div>
    </article>
  );
};

const ApplicationsStar = ({
  pendingApps,
  sitterProfiles,
  sitterAffinityProfiles,
  onCtaClick,
}: {
  pendingApps: AppRow[];
  sitterProfiles: Record<string, SitterInfo>;
  sitterAffinityProfiles?: Record<string, AffinitySitterInput>;
  onCtaClick?: () => void;
}) => {
  const { owner } = useViewerOwnerForAffinity();

  // Choix du candidat mis en avant : meilleur score affinité si calculable,
  // sinon le plus récent (les recentApps arrivent déjà triés desc côté hook).
  let featured: AppRow = pendingApps[0];
  let featuredAffinity: AffinityResult | null = null;
  let featuredInput: AffinitySitterInput | null = null;

  if (owner) {
    let bestScore = -1;
    for (const app of pendingApps) {
      const sid = app.sitter?.id;
      const input = sid ? sitterAffinityProfiles?.[sid] : undefined;
      if (!input) continue;
      const r = computeAffinityResultFull(owner, input);
      if (r && r.displayed !== false && typeof r.score === "number" && r.score > bestScore) {
        bestScore = r.score;
        featured = app;
        featuredAffinity = r;
        featuredInput = input;
      }
    }
  }

  const featuredSitter = featured.sitter?.id
    ? sitterProfiles[featured.sitter.id] ?? featured.sitter
    : featured.sitter;
  const n = pendingApps.length;

  return (
    <>
      <SectionHeader
        eyebrow="Quelqu'un se propose"
        title={`${featuredSitter?.first_name ? capitalize(featuredSitter.first_name) : "Un gardien"} aimerait garder votre maison.`}
        subtitle={`${n} candidature${n > 1 ? "s" : ""} attend${n > 1 ? "ent" : ""} votre regard.`}
      />
      <ApplicationCard
        app={featured}
        sitter={featuredSitter ?? null}
        affinity={featuredAffinity}
        affinityInput={featuredInput}
        extraCount={n - 1}
        onCtaClick={onCtaClick}
      />
    </>
  );
};

/* ================================================================== */
/*  C. Brouillon en cours                                             */
/* ================================================================== */
const DraftStar = ({ draft, onCtaClick }: { draft: SitRow; onCtaClick?: () => void }) => {
  const dates = formatDateRange(draft.start_date, draft.end_date);
  return (
    <>
      <SectionHeader
        eyebrow="Votre annonce vous attend"
        title="Votre annonce est presque prête."
      />
      <div
        style={{
          backgroundColor: "hsl(var(--secondary) / 0.12)",
          borderRadius: "20px",
          padding: "22px",
        }}
      >
        <p
          className="font-heading text-foreground"
          style={{ fontSize: "18px", fontWeight: 600, lineHeight: 1.3 }}
        >
          {draft.title || "Brouillon sans titre"}
        </p>
        {dates && (
          <p className="text-muted-foreground mt-[8px]" style={{ fontSize: "13.5px" }}>
            {dates}
          </p>
        )}
        <div className="mt-[22px]">
          <PrimaryCta to={`/sits/create?draftId=${draft.id}`} onClick={onCtaClick}>
            Reprendre mon annonce
          </PrimaryCta>
        </div>
      </div>
    </>
  );
};

/* ================================================================== */
/*  D. Aucune annonce active                                          */
/* ================================================================== */
const PublishStar = ({
  nearbyCount,
  nearbyRadius,
  showConcierge,
  primaryAction,
  onCtaClick,
}: {
  nearbyCount: number;
  nearbyRadius: number | null;
  showConcierge: boolean;
  primaryAction: OwnerPrimaryAction | null;
  onCtaClick?: () => void;
}) => {
  const localSignal =
    nearbyCount > 0 && nearbyRadius
      ? `${nearbyCount} gardien${nearbyCount > 1 ? "s" : ""} vérifié${nearbyCount > 1 ? "s" : ""} à ${nearbyRadius} km attendent une annonce.`
      : null;

  return (
    <>
      <SectionHeader
        eyebrow="Votre maison a une histoire"
        title="Confiez-la à quelqu'un qui vous ressemble."
        subtitle={localSignal ?? undefined}
      />
      <div
        style={{
          backgroundColor: "hsl(var(--secondary) / 0.12)",
          borderRadius: "20px",
          padding: "22px",
        }}
      >
        <PrimaryCta to="/sits/create">Publier une annonce</PrimaryCta>
        {showConcierge && (
          <div className="mt-[22px]">
            <SitDraftFromPrompt demoted primary={primaryAction} />
          </div>
        )}
      </div>
    </>
  );
};

/* ================================================================== */
/*  Section wrapper                                                   */
/* ================================================================== */
export interface OwnerStarSectionProps {
  ongoingSit: SitRow | null | undefined;
  pendingApps: AppRow[];
  sitterProfiles: Record<string, SitterInfo>;
  sitterAffinityProfiles?: Record<string, AffinitySitterInput>;
  latestDraft: SitRow | null;
  propertyCoverPhoto?: string | null;
  nearbyCount: number;
  nearbyRadius: number | null;
  showConcierge: boolean;
  primaryAction: OwnerPrimaryAction | null;
}

const OwnerStarSection = ({
  ongoingSit,
  pendingApps,
  sitterProfiles,
  sitterAffinityProfiles,
  latestDraft,
  propertyCoverPhoto,
  nearbyCount,
  nearbyRadius,
  showConcierge,
  primaryAction,
}: OwnerStarSectionProps) => {
  const variant: "ongoing" | "applications" | "draft" | "publish" = ongoingSit
    ? "ongoing"
    : pendingApps.length > 0
      ? "applications"
      : latestDraft
        ? "draft"
        : "publish";

  const sectionRef = useRef<HTMLElement | null>(null);
  useImpressionOnce(sectionRef, `owner_star:${variant}`, () => {
    void trackEvent("dashboard_star_seen", {
      source: "owner_dashboard",
      metadata: { surface: "owner_dashboard", variant },
    });
  });

  const onCtaClick = () =>
    void trackEvent("dashboard_star_cta_clicked", {
      source: "owner_dashboard",
      metadata: { surface: "owner_dashboard", variant },
    });

  let content: React.ReactNode;

  if (ongoingSit) {
    const sitter = ongoingSit.applications?.find((a) => a.status === "accepted")?.sitter_id
      ? sitterProfiles[ongoingSit.applications.find((a) => a.status === "accepted")!.sitter_id]
      : null;
    content = (
      <>
        <SectionHeader
          eyebrow="En ce moment"
          title="Votre maison est entre de bonnes mains."
        />
        <OngoingCard sit={ongoingSit} sitter={sitter} coverPhoto={propertyCoverPhoto} onCtaClick={onCtaClick} />
      </>
    );
  } else if (pendingApps.length > 0) {
    content = (
      <ApplicationsStar
        pendingApps={pendingApps}
        sitterProfiles={sitterProfiles}
        sitterAffinityProfiles={sitterAffinityProfiles}
        onCtaClick={onCtaClick}
      />
    );
  } else if (latestDraft) {
    content = <DraftStar draft={latestDraft} onCtaClick={onCtaClick} />;
  } else {
    content = (
      <PublishStar
        nearbyCount={nearbyCount}
        nearbyRadius={nearbyRadius}
        showConcierge={showConcierge}
        primaryAction={primaryAction}
        onCtaClick={onCtaClick}
      />
    );
  }

  return (
    <section
      ref={sectionRef}
      data-dashboard-star="owner"
      aria-label="Votre priorité du moment"
      className="px-4 sm:px-5 md:px-8"
    >
      {content}
    </section>
  );
};

export default OwnerStarSection;
