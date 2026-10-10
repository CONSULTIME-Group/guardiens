/**
 * Hero partagé du profil public, facettes gardien et propriétaire (lot L5).
 *
 * Contrat :
 *  - Un fond, pas une image pleine page avant l'identité : identité sur papier
 *    lisible à gauche, gouache entière (object-contain) à droite sur ordinateur,
 *    gouache sous l'identité sur mobile.
 *  - Données réelles uniquement : photo, prénom, ville et pays, mobilité
 *    déclarée, dernière visite (L3), palier de réactivité (L3), CTA.
 *  - Identité vérifiée : icône 44 px près du prénom (IdentityVerifiedMark).
 *  - Pas de citation longue dans le hero, elle vit dans « À propos ».
 *  - Le sélecteur d'illustration reste réservé au propre profil.
 */
import { Link } from "react-router-dom";
import { Image as ImageIcon } from "lucide-react";
import StatutGardienBadge from "@/components/profile/StatutGardienBadge";
import FavoriteButton from "@/components/shared/FavoriteButton";
import ResponsivenessBadge from "@/components/profile/ResponsivenessBadge";
import IdentityVerifiedMark from "@/components/profile/IdentityVerifiedMark";
import { avatarImageUrl } from "@/lib/storageImage";
import { formatRatingFr } from "@/lib/formatRatingFr";
import { lastVisitLabel } from "@/lib/profileSignals";

export type HeroCtaVariant =
  | { kind: "own"; label?: string }
  | { kind: "unauthenticated"; signupHref: string; label?: string }
  | { kind: "owner"; onContact: () => void; label?: string }
  | { kind: "sitter"; onActivate: () => void; label?: string }
  | { kind: "muted"; label: string; hint?: string };

export interface ProfileHeroProps {
  facet: "sitter" | "owner" | "entraide";
  id: string;
  firstName: string;
  /** Ville, avec le pays hors France (« Montréal, Canada »). */
  city: string | null;
  departmentName?: string | null;
  avatarUrl: string | null;
  heroDesktop: string;
  heroMobile: string;
  heroAnchor?: string;
  isOwnProfile: boolean;
  onOpenHeroPicker: () => void;
  onOpenAvatarLightbox: () => void;
  hasAvatarLightbox: boolean;
  memberSince?: string | null;
  /** Gardes réalisées (facette gardien seulement). */
  completedSits?: number;
  lastSeenAt?: string | null;
  /** Zones de mobilité déclarées, libellés. Vide = rien affiché. */
  mobilityLabels?: string[];
  isAvailable: boolean;
  avgRating: number;
  reviewCount: number;
  statutGardien: string | null;
  identityVerified: boolean;
  hasActiveSubscription: boolean;
  emergencyActive: boolean;
  cta: HeroCtaVariant;
  ctaReassurance?: string;
}

/** Faits de la ligne secondaire, purs et testables. */
export function heroFactLine(input: {
  facet: "sitter" | "owner" | "entraide";
  memberSince?: string | null;
  completedSits?: number;
  lastSeenAt?: string | null;
  now?: Date;
}): string[] {
  const since = input.memberSince ? new Date(input.memberSince) : null;
  const sinceLabel = since && !Number.isNaN(since.getTime())
    ? since.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })
    : null;
  const sits = input.facet === "sitter" ? input.completedSits ?? 0 : 0;
  const visit = lastVisitLabel(input.lastSeenAt ?? null, input.now);
  return [
    sinceLabel ? `Membre depuis ${sinceLabel}` : null,
    sits > 0 ? `${sits} garde${sits > 1 ? "s réalisées" : " réalisée"}` : null,
    visit ? `Dernière visite ${visit}` : null,
  ].filter((x): x is string => !!x);
}

const ProfileHero = (p: ProfileHeroProps) => {
  const place = [p.city, p.departmentName].filter(Boolean).join(", ");
  const eyebrow = p.facet === "sitter"
    ? (p.departmentName ? `Garde de maisons en ${p.departmentName}` : "Garde de maisons")
    : p.facet === "owner" ? "Fait garder sa maison" : "Entraide";
  const facts = heroFactLine(p);
  const mobility = (p.mobilityLabels ?? []).filter(Boolean);
  const hasPhoto = !!p.avatarUrl && !p.avatarUrl.includes("placeholder.svg");

  const baseCls =
    "inline-flex min-h-11 items-center justify-center rounded-[99px] px-6 py-3 text-sm font-medium transition-colors";
  const renderCta = () => {
    const cta = p.cta;
    if (cta.kind === "own" || cta.kind === "muted") {
      return (
        <button
          type="button"
          disabled
          aria-disabled="true"
          title={cta.kind === "own" ? "Ceci est votre profil public." : cta.hint}
          className={`${baseCls} bg-muted text-muted-foreground cursor-not-allowed opacity-70`}
        >
          {cta.kind === "own" ? (cta.label ?? "Aperçu de votre profil") : cta.label}
        </button>
      );
    }
    if (cta.kind === "unauthenticated") {
      return (
        <Link to={cta.signupHref} className={`${baseCls} bg-primary text-primary-foreground hover:bg-primary/90`}>
          {cta.label ?? `S'inscrire pour contacter ${p.firstName}`}
        </Link>
      );
    }
    const onClick = cta.kind === "owner" ? cta.onContact : cta.onActivate;
    return (
      <button type="button" onClick={onClick} className={`${baseCls} bg-primary text-primary-foreground hover:bg-primary/90`}>
        {cta.label ?? `Contacter ${p.firstName}`}
      </button>
    );
  };
  const reassurance = p.ctaReassurance ?? (
    p.cta.kind === "own"
      ? "Vous voyez cette page comme un visiteur."
      : p.cta.kind === "muted"
        ? (p.cta.hint ?? "")
        : p.cta.kind === "unauthenticated"
          ? "L'inscription est ouverte pendant la phase de lancement."
          : `Vous échangez directement avec ${p.firstName}.`
  );

  return (
    <header
      className="relative w-full overflow-hidden bg-[hsl(var(--hero-paper))]"
      data-profile-hero
      data-facet={p.facet}
    >
      <div className="relative max-w-6xl mx-auto flex flex-col lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,52%)] lg:min-h-[280px] lg:max-h-[340px]">
        {/* Identité, sur papier lisible */}
        <div className="relative z-10 min-w-0 px-4 md:px-6 pt-5 pb-4 lg:py-6 flex gap-4 md:gap-5 items-start">
          <button
            type="button"
            onClick={p.onOpenAvatarLightbox}
            disabled={!p.hasAvatarLightbox}
            aria-label={`Agrandir la photo de ${p.firstName}`}
            className="shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-default"
            data-hero-avatar
          >
            {hasPhoto ? (
              <img
                src={avatarImageUrl(p.avatarUrl as string, 320)}
                alt={p.firstName}
                width={128}
                height={128}
                className="block w-[88px] h-[88px] md:w-[128px] md:h-[128px] rounded-full object-cover border-4 border-background shadow-md"
              />
            ) : (
              <span className="flex w-[88px] h-[88px] md:w-[128px] md:h-[128px] rounded-full bg-muted border-4 border-background items-center justify-center font-heading text-4xl md:text-5xl text-foreground">
                {p.firstName?.charAt(0) || "?"}
              </span>
            )}
          </button>

          <div className="min-w-0 flex-1">
            <p className="text-[11.5px] uppercase tracking-[0.16em] text-secondary font-body font-semibold">{eyebrow}</p>
            <div className="mt-0.5 flex items-center gap-1 min-w-0">
              <h1 className="font-heading text-[34px] md:text-[48px] font-semibold tracking-[-0.02em] leading-none text-foreground break-words min-w-0">
                {p.firstName}
              </h1>
              {p.identityVerified && <IdentityVerifiedMark firstName={p.firstName} />}
              {!p.isOwnProfile && (
                <FavoriteButton targetType="sitter" targetId={p.id} size="md" />
              )}
            </div>
            {place && <p className="mt-1 text-[15px] text-foreground font-body" data-hero-place>{place}</p>}
            {facts.length > 0 && (
              <p className="mt-1 text-[13.5px] text-muted-foreground font-body">{facts.join(" · ")}</p>
            )}
            {mobility.length > 0 && (
              <p className="mt-1 text-[13.5px] text-foreground/80 font-body" data-hero-mobility>
                Peut se déplacer : {mobility.join(", ")}
              </p>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[13.5px] font-body text-foreground">
              {p.avgRating > 0 && p.reviewCount > 0 && (
                <span className="inline-flex items-center gap-1" aria-label={`${formatRatingFr(p.avgRating)} sur 5, ${p.reviewCount} avis`}>
                  <span className="text-founder" aria-hidden="true">★</span>
                  <span className="font-semibold">{formatRatingFr(p.avgRating)}</span>
                  <span className="text-muted-foreground">· {p.reviewCount} avis</span>
                </span>
              )}
              {p.isAvailable && (
                <span className="inline-flex items-center gap-1.5">
                  <span aria-hidden="true" className="h-2 w-2 rounded-full bg-primary" /> Disponible
                </span>
              )}
              {p.hasActiveSubscription && <span className="text-muted-foreground">Abonné</span>}
              {p.emergencyActive && <span className="text-muted-foreground">Gardien d'urgence</span>}
              {p.statutGardien && p.statutGardien !== "novice" && <StatutGardienBadge statut={p.statutGardien as any} />}
              <ResponsivenessBadge userId={p.id} />
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1" data-hero-cta>
              {renderCta()}
              {reassurance && <p className="text-[12.5px] text-muted-foreground font-body">{reassurance}</p>}
            </div>
          </div>
        </div>

        {/* Gouache personnalisée : entière, sujets lisibles, aucun voile. */}
        <div className="relative w-full md:max-w-3xl md:mx-auto lg:max-w-none lg:h-full [aspect-ratio:1536/544] lg:[aspect-ratio:auto]" data-hero-gouache>
          <img
            src={p.heroDesktop}
            srcSet={`${p.heroMobile} 768w, ${p.heroDesktop} 1536w`}
            sizes="(min-width: 1024px) 52vw, 100vw"
            alt=""
            aria-hidden="true"
            data-hero-anchor={p.heroAnchor}
            width={1536}
            height={544}
            loading="eager"
            decoding="async"
            fetchPriority="high"
            className="absolute inset-0 w-full h-full object-contain object-center"
          />
          {p.isOwnProfile && (
            <button
              type="button"
              onClick={p.onOpenHeroPicker}
              className="absolute top-3 right-3 z-20 inline-flex min-h-11 items-center gap-1.5 px-3.5 rounded-full bg-background/95 border border-border text-[13px] font-semibold text-foreground shadow-sm"
              title="Choisir une autre illustration de carnet"
            >
              <ImageIcon className="w-4 h-4" aria-hidden="true" />
              Changer l'image
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default ProfileHero;
