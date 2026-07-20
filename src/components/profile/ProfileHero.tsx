/**
 * Hero resserré du profil public gardien (vague 37).
 *
 * Contrat :
 *  - N'affiche que des données réelles. Pas de "Non renseigné" ni d'accroche fictive.
 *  - Sous-tagline pro affichée seulement si `pro_tagline` réel.
 *  - Max 3 chips (priorité : ID vérifiée, Abonné, Gardien d'urgence).
 *  - UN SEUL CTA primaire, 4 variantes exclusives, + une ligne de réassurance.
 *  - Aucun bloc affinité, aucun bloc Alma, aucune ligne stats, pas de TrustScore.
 *    Ces éléments passent dans le rail droit (desktop) ou dans le flux (mobile).
 */
import { Link } from "react-router-dom";
import { MapPin, Shield, BadgeCheck, Image as ImageIcon } from "lucide-react";
import ProBadge from "@/components/badges/ProBadge";
import StatutGardienBadge from "@/components/profile/StatutGardienBadge";
import FavoriteButton from "@/components/shared/FavoriteButton";
import ReplyTimeBadge from "@/components/sitters/ReplyTimeBadge";

export type HeroCtaVariant =
  | { kind: "own" }
  | { kind: "unauthenticated"; signupHref: string }
  | { kind: "owner"; onContact: () => void }
  | { kind: "sitter"; onActivate: () => void };

interface ProfileHeroProps {
  id: string;
  firstName: string;
  city: string | null;
  avatarUrl: string | null;
  heroDesktop: string;
  heroMobile: string;
  heroAnchor?: string;
  isOwnProfile: boolean;
  onOpenHeroPicker: () => void;
  onOpenAvatarLightbox: () => void;
  hasAvatarLightbox: boolean;

  proStatus: string | null;
  proTagline: string | null;
  proPricingNote: string | null;

  isAvailable: boolean;
  avgRating: number;
  reviewCount: number;
  replyMedianMinutes: number | null;

  statutGardien: string | null;
  identityVerified: boolean;
  hasActiveSubscription: boolean;
  emergencyActive: boolean;

  hasSitterProfile: boolean;
  hasOwnerProfile: boolean;
  roleTabActive: "gardien" | "proprio" | "entraide";

  cta: HeroCtaVariant;
}

const ProfileHero = ({
  id,
  firstName,
  city,
  avatarUrl,
  heroDesktop,
  heroMobile,
  heroAnchor,
  isOwnProfile,
  onOpenHeroPicker,
  onOpenAvatarLightbox,
  hasAvatarLightbox,
  proStatus,
  proTagline,
  proPricingNote,
  isAvailable,
  avgRating,
  reviewCount,
  replyMedianMinutes,
  statutGardien,
  identityVerified,
  hasActiveSubscription,
  emergencyActive,
  hasSitterProfile,
  hasOwnerProfile,
  roleTabActive,
  cta,
}: ProfileHeroProps) => {
  // Chips : cap à 3, priorité ID > Abonné > Urgence.
  const chips: Array<{ key: string; node: JSX.Element }> = [];
  if (identityVerified) {
    chips.push({
      key: "id",
      node: (
        <button
          type="button"
          onClick={() => {
            const el = [
              document.getElementById("confiance"),
              document.getElementById("confiance-mobile"),
            ].find((n) => n && (n as HTMLElement).offsetParent !== null) as
              | HTMLElement
              | null;
            if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
          }}
          aria-label="Voir les détails de confiance et vérifications"
          className="inline-flex items-center gap-1 text-xs text-foreground/85 border border-border/60 rounded-full px-2 py-0.5 bg-background/85 backdrop-blur-sm hover:bg-background hover:border-primary/40 transition-colors cursor-pointer"
        >
          <Shield size={11} className="text-primary" /> ID vérifiée
        </button>
      ),
    });
  }
  if (hasActiveSubscription) {
    chips.push({
      key: "sub",
      node: (
        <span className="inline-flex items-center gap-1 text-xs text-foreground/85 border border-border/60 rounded-full px-2 py-0.5 bg-background/85 backdrop-blur-sm">
          <BadgeCheck size={11} className="text-primary" /> Abonné
        </span>
      ),
    });
  }
  if (emergencyActive) {
    chips.push({
      key: "eme",
      node: (
        <span className="inline-flex items-center gap-1 text-xs text-foreground/85 border border-border/60 rounded-full px-2 py-0.5 bg-background/85 backdrop-blur-sm">
          <Shield size={11} className="text-primary" /> Gardien d'urgence
        </span>
      ),
    });
  }
  const visibleChips = chips.slice(0, 3);

  const isDual = hasSitterProfile && hasOwnerProfile;
  const roleLabel = isDual
    ? "Gardien et propriétaire"
    : roleTabActive === "proprio" || (!hasSitterProfile && hasOwnerProfile)
      ? "Propriétaire"
      : "Gardien";

  const showTagline = proStatus === "verified" && !!proTagline;
  const showPricingNote = proStatus === "verified" && !!proPricingNote;

  // CTA
  const renderCta = () => {
    const baseCls =
      "inline-flex items-center justify-center rounded-lg px-6 py-3 text-sm font-medium transition-colors flex-1 sm:flex-initial";
    if (cta.kind === "own") {
      return (
        <button
          type="button"
          disabled
          aria-disabled="true"
          title="Ceci est votre profil public. Utilisez « Modifier mon profil » pour le mettre à jour."
          className={`${baseCls} bg-muted text-muted-foreground cursor-not-allowed opacity-70`}
        >
          Aperçu de votre profil
        </button>
      );
    }
    if (cta.kind === "unauthenticated") {
      return (
        <Link
          to={cta.signupHref}
          className={`${baseCls} bg-primary text-primary-foreground hover:bg-primary/90`}
        >
          S'inscrire pour contacter {firstName}
        </Link>
      );
    }
    if (cta.kind === "owner") {
      return (
        <button
          type="button"
          onClick={cta.onContact}
          className={`${baseCls} bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer`}
        >
          Contacter {firstName}
        </button>
      );
    }
    return (
      <button
        type="button"
        onClick={cta.onActivate}
        className={`${baseCls} bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer`}
      >
        Contacter {firstName}
      </button>
    );
  };

  const reassurance =
    cta.kind === "own"
      ? "Vous voyez cette page comme un visiteur."
      : cta.kind === "unauthenticated"
        ? "L'inscription est gratuite, sans engagement."
        : "Contact direct, sans intermédiaire.";

  return (
    <div className="relative overflow-hidden w-full flex items-end bg-[hsl(var(--hero-paper))] md:max-h-[520px] md:[aspect-ratio:1536/544]">
      {/* Illustration */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <img
          src={heroDesktop}
          srcSet={`${heroMobile} 768w, ${heroDesktop} 1536w`}
          sizes="(max-width: 767px) 100vw, 1536px"
          alt=""
          aria-hidden="true"
          data-hero-anchor={heroAnchor}
          width={1536}
          height={544}
          loading="eager"
          decoding="async"
          fetchPriority="high"
          style={{
            willChange: "transform",
            transform: "translateZ(0)",
            backfaceVisibility: "hidden",
          }}
          className="w-full h-full object-contain object-center"
        />
      </div>

      {isOwnProfile && (
        <button
          type="button"
          onClick={onOpenHeroPicker}
          className="absolute top-3 right-3 z-20 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-background/90 backdrop-blur border border-border text-xs font-medium shadow-sm hover:bg-background transition-colors"
          title="Choisir une autre illustration de carnet"
        >
          <ImageIcon className="w-3.5 h-3.5" />
          Changer l'image
        </button>
      )}

      {/* Vignettage discret via token hero-paper (tolère un rgba doux). */}
      <div
        className="absolute inset-0 z-[1] pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 55%, hsl(var(--foreground) / 0.06) 100%)",
        }}
      />
      <div
        className="absolute inset-x-0 bottom-0 h-[75%] z-[1] pointer-events-none"
        style={{
          background:
            "linear-gradient(to top, hsl(var(--background)) 0%, hsl(var(--background) / 0.85) 30%, hsl(var(--background) / 0.45) 65%, transparent 100%)",
        }}
      />
      <div
        className="absolute inset-x-0 top-0 h-24 z-[1] pointer-events-none"
        style={{
          background:
            "linear-gradient(to bottom, hsl(var(--background) / 0.55) 0%, transparent 100%)",
        }}
      />

      <div className="relative z-10 w-full max-w-5xl mx-auto px-4 sm:px-6 pb-5 sm:pb-8 pt-4 sm:pt-6">
        <div className="flex justify-end mb-4">
          <Link
            to="/recherche-gardiens"
            className="inline-flex items-center gap-1 text-sm text-foreground font-medium px-3 py-1.5 rounded-full bg-background/90 backdrop-blur-md border border-border/60 shadow-md hover:bg-background hover:shadow-lg transition-all"
          >
            ← Retour aux gardiens
          </Link>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-end gap-3 sm:gap-6 min-w-0">
          <div className="shrink-0 relative">
            <button
              type="button"
              onClick={onOpenAvatarLightbox}
              disabled={!hasAvatarLightbox}
              aria-label={`Agrandir la photo de ${firstName}`}
              className="block rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-default"
            >
              <img
                src={avatarUrl || "/placeholder.svg"}
                alt={firstName}
                className="w-20 h-20 sm:w-28 sm:h-28 md:w-36 md:h-36 rounded-full object-cover object-center border-4 border-background shadow-md ring-2 ring-primary ring-offset-2"
              />
            </button>
            {statutGardien && statutGardien !== "novice" && (
              <div className="absolute -bottom-2 -right-2">
                <StatutGardienBadge statut={statutGardien as any} />
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1.5 pb-1 min-w-0 flex-1">
            {isAvailable && (
              <span className="inline-flex w-fit items-center gap-1.5 text-xs bg-primary text-primary-foreground px-3 py-1 rounded-full font-semibold shadow-md border border-primary/40 backdrop-blur-sm">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-foreground opacity-60" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary-foreground" />
                </span>
                Disponible
              </span>
            )}

            <div
              tabIndex={0}
              className="group/hero-card self-start max-w-full min-w-0 inline-flex flex-col gap-1 rounded-2xl bg-background/90 backdrop-blur-md border border-border/60 shadow-md px-3 py-2 sm:px-4 sm:py-2.5 outline-none transition-all duration-300 ease-out hover:bg-background hover:shadow-xl hover:-translate-y-0.5 focus-visible:bg-background focus-visible:shadow-xl focus-visible:ring-2 focus-visible:ring-primary/40 active:bg-background active:shadow-xl"
            >
              <div className="flex flex-wrap items-center gap-x-2 sm:gap-x-3 gap-y-1.5 min-w-0 max-w-full">
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-heading font-bold text-foreground leading-tight capitalize break-words [overflow-wrap:anywhere] hyphens-auto min-w-0">
                  {firstName}
                </h1>
                <ProBadge status={proStatus as any} size="sm" />
                {id && <FavoriteButton targetType="sitter" targetId={id} size="md" />}
                {avgRating > 0 && reviewCount > 0 && (
                  <span className="inline-flex items-baseline gap-1 text-sm font-medium text-foreground/85">
                    <span className="font-semibold">{avgRating.toFixed(1)}</span>
                    <span className="text-primary">★</span>
                    <span className="text-muted-foreground text-xs">({reviewCount})</span>
                  </span>
                )}
              </div>

              {replyMedianMinutes != null && (
                <ReplyTimeBadge minutes={replyMedianMinutes} className="self-start mt-1" />
              )}

              {city && (
                <p className="text-sm sm:text-base text-foreground/80 flex items-center gap-1 font-medium min-w-0 max-w-full break-words">
                  <MapPin className="w-3.5 h-3.5 shrink-0" />
                  <span className="min-w-0 break-words">
                    {roleLabel} à {city}
                  </span>
                </p>
              )}

              {showTagline && (
                <p className="font-heading italic text-foreground/85 mt-1 text-[13.5px] sm:text-sm max-w-full break-words">
                  «&nbsp;{proTagline}&nbsp;»
                </p>
              )}
              {showPricingNote && (
                <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">
                  Tarif indicatif : {proPricingNote}
                </p>
              )}
            </div>

            {visibleChips.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                {visibleChips.map((c) => (
                  <span key={c.key}>{c.node}</span>
                ))}
              </div>
            )}

            {/* CTA unique + réassurance */}
            <div
              data-hero-cta
              className="mt-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 self-stretch"
            >
              {renderCta()}
              <p className="text-[11px] sm:text-xs text-muted-foreground font-body sm:ml-2 self-center text-center sm:text-left leading-snug break-words">
                {reassurance}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileHero;
