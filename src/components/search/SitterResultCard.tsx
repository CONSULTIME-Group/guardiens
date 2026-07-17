/**
 * Carte gardien de la liste /recherche-gardiens (vue proprio).
 *
 * - Mini-carrousel (avatar + galerie) avec points et flèches au hover.
 * - Photo 4:3, cadrage haut (visages centrés).
 * - Affinité en variant numeric (%) + fallback « Affinité à découvrir »
 *   quand le score est masqué (owner incomplet, seuil, disqualification).
 * - Clic sur la photo → fiche gardien, favoris en overlay.
 * - Densité contenu : nom + statuts, ville · distance, présence/reply,
 *   note · nb gardes, badges animaux (max 3), bio 1 ligne, CTA Contacter.
 */
import { useState, type MouseEvent } from "react";
import { Link } from "react-router-dom";
import {
  Star,
  Zap,
  MessageCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Camera,
} from "lucide-react";
import FavoriteButton from "@/components/shared/FavoriteButton";
import PresenceBadge from "@/components/messages/PresenceBadge";
import ReplyTimeBadge from "@/components/sitters/ReplyTimeBadge";
import AffinityBadge from "@/components/matching/AffinityBadge";
import type { AffinityResult } from "@/lib/affinityScore";

interface SitterResultCardProps {
  sitter: any;
  photos: string[];
  affinity: AffinityResult | null;
  hasOwnerProfile: boolean;
  onContact: (userId: string) => void;
  contactingId: string | null;
  duplicateName: boolean;
  city: string;
}

const SitterResultCard = ({
  sitter,
  photos,
  affinity,
  hasOwnerProfile,
  onContact,
  contactingId,
  duplicateName,
  city,
}: SitterResultCardProps) => {
  const [photoIdx, setPhotoIdx] = useState(0);
  const profile = sitter.profile;
  const firstName = profile?.first_name || "Gardien";
  const bio = profile?.bio
    ? profile.bio.length > 90
      ? profile.bio.slice(0, 90) + "…"
      : profile.bio
    : null;
  const sameCity =
    sitter._dist === 0 ||
    (city && profile?.city && profile.city.toLowerCase() === city.toLowerCase());
  const distLabel =
    !sameCity && sitter._dist != null && sitter._dist !== Infinity
      ? `${sitter._dist} km`
      : null;
  const sitterAnimalTypes: string[] = sitter.animal_types || [];
  const initials = firstName.charAt(0).toUpperCase();
  const hasPhotos = photos.length > 0;
  const currentPhoto = hasPhotos ? photos[photoIdx % photos.length] : null;

  const stop = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const prev = (e: MouseEvent) => {
    stop(e);
    setPhotoIdx((i) => (i - 1 + photos.length) % photos.length);
  };
  const next = (e: MouseEvent) => {
    stop(e);
    setPhotoIdx((i) => (i + 1) % photos.length);
  };

  // Affinité : score affichable, sinon libellé fallback discret.
  const showAffinityBadge = !!affinity && affinity.displayed !== false;
  const showAffinityFallback =
    hasOwnerProfile && !showAffinityBadge; // owner sait qu'il pourrait déverrouiller

  return (
    <Link
      to={`/gardiens/${sitter.user_id}`}
      aria-label={`Voir le profil de ${firstName}`}
      className="group relative bg-card rounded-xl overflow-hidden border border-border hover:shadow-md hover:-translate-y-0.5 hover:border-primary/40 transition-all flex flex-col h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {/* Favori */}
      <div className="absolute top-2 right-2 z-10">
        <FavoriteButton targetType="sitter" targetId={sitter.user_id} />
      </div>

      {/* Urgence */}
      {sitter.isEmergency && (
        <span className="absolute top-2 left-2 z-10 flex items-center gap-1 bg-card/90 rounded-full px-2 py-0.5 text-[11px] font-medium">
          <Zap className="h-3 w-3 text-amber-500" /> Urgence
        </span>
      )}

      {/* Mini-carrousel photo : 4:3, ~180px hauteur, cadrage haut */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
        {currentPhoto ? (
          <img
            src={currentPhoto}
            alt={firstName}
            loading="lazy"
            className="w-full h-full object-cover object-[center_top] group-hover:scale-[1.02] transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full bg-primary/10 flex items-center justify-center">
            <span className="text-4xl text-primary font-heading font-bold">
              {initials}
            </span>
          </div>
        )}

        {/* Flèches (hover desktop, toujours actives) */}
        {photos.length > 1 && (
          <>
            <button
              type="button"
              onClick={prev}
              aria-label="Photo précédente"
              className="absolute left-1.5 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full bg-background/85 text-foreground opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity flex items-center justify-center shadow-sm hover:bg-background"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={next}
              aria-label="Photo suivante"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full bg-background/85 text-foreground opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity flex items-center justify-center shadow-sm hover:bg-background"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </>
        )}

        {/* Points de navigation */}
        {photos.length > 1 && (
          <div
            className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1"
            onClick={stop}
          >
            {photos.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Photo ${i + 1}`}
                onClick={(e) => {
                  stop(e);
                  setPhotoIdx(i);
                }}
                className={`h-1.5 rounded-full transition-all ${
                  i === photoIdx
                    ? "w-4 bg-white"
                    : "w-1.5 bg-white/60 hover:bg-white/80"
                }`}
              />
            ))}
          </div>
        )}

        {/* Compteur photos (visible uniquement si galerie enrichie) */}
        {photos.length > 1 && (
          <span className="absolute top-2 left-1/2 -translate-x-1/2 z-[1] inline-flex items-center gap-1 rounded-full bg-background/85 px-2 py-0.5 text-[10px] font-medium text-foreground shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
            <Camera className="h-3 w-3" aria-hidden />
            {photoIdx + 1}/{photos.length}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="p-3 flex flex-col flex-1">
        <p className="text-sm font-semibold truncate">
          {firstName}
          {duplicateName && profile?.city && (
            <span className="text-xs font-normal text-muted-foreground ml-1">
              · {profile.city}
            </span>
          )}
          {profile?.identity_verified && (
            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium ml-1.5 inline-block align-middle">
              Vérifié
            </span>
          )}
          {profile?.pro_status === "verified" && (
            <span className="text-xs bg-accent text-accent-foreground px-2 py-0.5 rounded-full font-medium ml-1.5 inline-block align-middle">
              Pro
            </span>
          )}
        </p>

        {(profile?.city || distLabel) && (
          <p className="text-xs text-muted-foreground truncate">
            {profile?.city}
            {profile?.city && distLabel && " · "}
            {distLabel}
          </p>
        )}

        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          <PresenceBadge lastSeenAt={profile?.last_seen_at} />
          <ReplyTimeBadge minutes={sitter.reply_median_minutes} />
        </div>

        {/* Note + expérience */}
        <div className="flex items-center gap-2 mt-1 min-h-[1rem]">
          {sitter.avgRating !== null && (
            <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
              <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
              {sitter.avgRating.toFixed(1)}
            </span>
          )}
          {(profile?.completed_sits_count || 0) > 0 && (
            <span className="text-xs text-muted-foreground">
              {profile.completed_sits_count} garde
              {profile.completed_sits_count > 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* Affinité — numeric % avec popover de transparence, ou fallback discret */}
        <div className="mt-1.5 min-h-[1.75rem] flex items-center">
          {showAffinityBadge ? (
            <AffinityBadge
              result={affinity!}
              size="sm"
              variant="numeric"
              trackingContext="search_owner_listing"
              trackingId={sitter.user_id}
            />
          ) : showAffinityFallback ? (
            <span
              className="inline-flex items-center rounded-full border border-border bg-muted/60 px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
              title="Complétez votre profil propriétaire pour révéler le score d'affinité."
            >
              Affinité à découvrir
            </span>
          ) : null}
        </div>

        {/* Animaux (max 3) */}
        <div className="flex flex-wrap gap-1 mt-1.5 min-h-[1.5rem]">
          {sitterAnimalTypes.slice(0, 3).map((a: string) => (
            <span
              key={a}
              className="text-[11px] bg-muted text-foreground/80 rounded-full px-2 py-0.5"
            >
              {a}
            </span>
          ))}
          {sitterAnimalTypes.length > 3 && (
            <span className="text-[11px] text-muted-foreground self-center">
              +{sitterAnimalTypes.length - 3}
            </span>
          )}
        </div>

        {/* Bio 1 ligne (line-clamp-1 pour préserver la densité 4 col) */}
        <p className="text-xs text-muted-foreground mt-1.5 line-clamp-1 min-h-[1rem]">
          {bio || <span className="opacity-0">.</span>}
        </p>

        {/* CTA : épingle en bas de carte pour aligner les boutons sur une rangée */}
        <div className="mt-auto pt-2">
          <button
            type="button"
            onClick={(e) => {
              stop(e);
              onContact(sitter.user_id);
            }}
            disabled={contactingId === sitter.user_id}
            aria-label={`Contacter ${firstName}`}
            className="inline-flex items-center justify-center gap-1.5 min-h-11 w-full rounded-full bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {contactingId === sitter.user_id ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <MessageCircle className="h-4 w-4" aria-hidden />
            )}
            Contacter
          </button>
        </div>
      </div>
    </Link>
  );
};

export default SitterResultCard;
