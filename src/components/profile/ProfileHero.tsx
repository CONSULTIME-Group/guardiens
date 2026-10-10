/**
 * Hero partagé du profil public, facettes gardien et propriétaire (lot L5).
 *
 * Contrat :
 *  - Gouache en fond continu, identité superposée avec protection locale.
 *    Aucun panneau image séparé, aucune illustration empilée sur mobile.
 *  - Données réelles uniquement : photo, prénom, ville et pays, mobilité
 *    déclarée, dernière visite (L3), palier de réactivité (L3), CTA.
 *  - Identité vérifiée : icône 44 px près du prénom (IdentityVerifiedMark).
 *  - Pas de citation longue dans le hero, elle vit dans « À propos ».
 *  - Le sélecteur d'illustration reste réservé au propre profil.
 */
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
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
  // Asset focal subjects, not member-specific layout. Keep the cat/dog visible.
  const leftSubject = /hero-(57|61)(?:[.-])/.test(p.heroDesktop);

  const baseCls =
    "min-h-11 h-auto max-w-full whitespace-normal px-5 py-3 text-sm font-medium text-center";
  const renderCta = () => {
    const cta = p.cta;
    if (cta.kind === "own" || cta.kind === "muted") {
      return (
        <Button
          type="button"
          disabled
          aria-disabled="true"
          title={cta.kind === "own" ? "Ceci est votre profil public." : cta.hint}
          className={`${baseCls} bg-muted text-muted-foreground cursor-not-allowed opacity-70`}
        >
          {cta.kind === "own" ? (cta.label ?? "Aperçu de votre profil") : cta.label}
        </Button>
      );
    }
    if (cta.kind === "unauthenticated") {
      return (
        <Button asChild className={baseCls}><Link to={cta.signupHref}>
          {cta.label ?? `S'inscrire pour contacter ${p.firstName}`}
        </Link></Button>
      );
    }
    const onClick = cta.kind === "owner" ? cta.onContact : cta.onActivate;
    return (
      <Button type="button" onClick={onClick} className={baseCls}>
        {cta.label ?? `Contacter ${p.firstName}`}
      </Button>
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
      className="profile-hero relative isolate w-full overflow-hidden"
      data-profile-hero
      data-facet={p.facet}
      data-hero-subject={leftSubject ? "left" : "right"}
    >
      <picture className="absolute inset-0 -z-10" data-hero-gouache>
        <source media="(max-width: 639px)" srcSet={p.heroMobile} />
        <img
          src={p.heroDesktop}
          alt=""
          aria-hidden="true"
          data-hero-anchor={p.heroAnchor}
          data-hero-notebook={/hero-63(?:[.-])/.test(p.heroDesktop) || undefined}
          width={1536}
          height={544}
          loading="eager"
          decoding="async"
          className="profile-hero-art absolute bottom-0 h-full w-full object-contain"
        />
      </picture>
      <div className="relative mx-auto max-w-6xl px-4 py-6 md:px-6 md:py-7" data-hero-content>
        <div className="profile-hero-identity relative min-w-0 flex items-start gap-3 md:gap-5">
          <Button
            variant="ghost"
            type="button"
            onClick={p.onOpenAvatarLightbox}
            disabled={!p.hasAvatarLightbox}
            aria-label={`Agrandir la photo de ${p.firstName}`}
            className="h-auto shrink-0 rounded-full p-0 hover:bg-transparent disabled:cursor-default disabled:opacity-100"
            data-hero-avatar
          >
            {hasPhoto ? (
              <img
                src={avatarImageUrl(p.avatarUrl as string, 320)}
                alt={p.firstName}
                width={128}
                height={128}
                className="block h-20 w-20 rounded-full object-cover border-4 border-background shadow-md md:h-24 md:w-24"
              />
            ) : (
              <span className="flex h-20 w-20 rounded-full bg-muted border-4 border-background items-center justify-center font-heading text-4xl text-foreground md:h-24 md:w-24">
                {p.firstName?.charAt(0) || "?"}
              </span>
            )}
          </Button>

          <div className="min-w-0 flex-1">
            <p className="text-xs uppercase text-secondary font-body font-semibold">{eyebrow}</p>
            <div className="mt-0.5 flex flex-wrap items-center gap-1 min-w-0">
              <h1 className="font-heading text-[32px] md:text-[42px] font-semibold leading-tight text-foreground break-words min-w-0 max-w-full">
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
              {reassurance && <p className="rounded-md bg-background/95 px-1.5 py-1 text-[12.5px] text-muted-foreground font-body">{reassurance}</p>}
            </div>
          </div>
        </div>

      </div>
      {p.isOwnProfile && (
            <Button
              variant="outline"
              type="button"
              onClick={p.onOpenHeroPicker}
              className="absolute bottom-3 right-3 z-20 min-h-11 h-auto gap-1.5 px-3.5 bg-background/95 text-[13px] font-semibold shadow-sm"
              title="Choisir une autre illustration de carnet"
            >
              <ImageIcon className="w-4 h-4" aria-hidden="true" />
              Changer l'image
            </Button>
          )}
    </header>
  );
};

export default ProfileHero;
