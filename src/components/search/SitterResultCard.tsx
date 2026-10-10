import { storageImageUrl } from "@/lib/storageImage";

/**
 * Carte gardien, vague 42, refonte visuelle "carnet".
 *
 * Comportement (vague 40) INCHANGÉ :
 *  - carte = Link vers /gardiens/:id
 *  - FavoriteButton en overlay (redirect encodé pour anon)
 *  - clavier / focus visible
 *
 * Signature visuelle :
 *  - photo 4:3, mini-carrousel préservé, badge lieu incrusté ("Ville · X km")
 *  - prénom Playfair, chips en pin doux (bg-primary/10 text-primary), sans amber
 *  - ligne meta en langage naturel (chaque segment omis si donnée absente)
 *  - accroche = citation réelle de la bio, coupée sur un mot (lot L4)
 *  - pied : mini ring d affinité (tri, jamais filtre), sinon faits réels seulement
 *          + bouton SECONDAIRE "Faire connaissance" (menant au profil, comme la carte).
 * Le bouton primaire "Contacter" DISPARAÎT (la rencontre vit sur le profil refondu).
 */
import ProBadge from "@/components/badges/ProBadge";
import { useState, type MouseEvent } from "react";
import { Link } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  Camera,
  ShieldCheck,
} from "lucide-react";
import FavoriteButton from "@/components/shared/FavoriteButton";
import AffinityRing from "@/components/matching/AffinityRing";
import type { AffinityResult } from "@/lib/affinityScore";
import { useAuth } from "@/contexts/AuthContext";
import { sanitizeBioForCard } from "@/lib/sanitizeBio";
import { publicFirstName } from "@/lib/displayName";
import { sitterCardLine } from "@/lib/sitterDistinctLine";
import { ratingSummary, cardQuote, cardAnimals, cardSkillGroups, cardPlaceFacts } from "@/lib/cardFacts";
import { lastVisitLabel } from "@/lib/profileSignals";
import { responsivenessLabel } from "@/components/profile/ResponsivenessBadge";
import { SPOTS } from "@/components/profile/skillSpots";

interface SitterResultCardProps {
  sitter: any;
  photos: string[];
  affinity: AffinityResult | null;
  hasOwnerProfile: boolean;
  duplicateName: boolean;
  city: string;
}

const SitterResultCard = ({
  sitter,
  photos,
  affinity,
  hasOwnerProfile,
  duplicateName,
  city,
}: SitterResultCardProps) => {
  const [photoIdx, setPhotoIdx] = useState(0);
  const { user } = useAuth();
  const isAnon = !user;
  const profile = sitter.profile;
  // Certains membres saisissent leur nom complet dans le champ prénom,
  // seul le premier mot est affiché publiquement.
  const firstName: string = publicFirstName(profile?.first_name) || "Gardien";
  const sitterAnimalTypes: string[] = cardAnimals(sitter.animal_types);
  const initials = firstName.charAt(0).toUpperCase();
  const hasPhotos = photos.length > 0;
  const currentPhoto = hasPhotos ? photos[photoIdx % photos.length] : null;
  const signupRedirect = `/gardiens/${sitter.user_id}`;

  const sameCity =
    sitter._dist === 0 ||
    (city && profile?.city && profile.city.toLowerCase() === city.toLowerCase());
  const distLabel =
    !sameCity && sitter._dist != null && sitter._dist !== Infinity
      ? `${sitter._dist} km`
      : null;

  // Badge lieu incrusté : "Ville · 2 km", ou "Ville" seule, ou rien.
  const locChunks = [profile?.city, distLabel].filter(Boolean) as string[];
  const countryChunk = cardPlaceFacts(sitter.country ?? profile?.country, null).countryLabel;
  if (countryChunk && !distLabel) locChunks.push(countryChunk);
  const locLabel = locChunks.length > 0 ? locChunks.join(" · ") : null;

  // Ligne meta (lot L4) : note /5 sur le nombre d'AVIS, gardes à part ;
  // réactivité = palier public 90 jours (contrat L3), jamais un délai arrondi.
  const nSits: number = profile?.completed_sits_count || 0;
  const ratingChunk = ratingSummary(sitter.avgRating, sitter.reviewCount || 0, nSits);
  const reply = responsivenessLabel(sitter._responsivenessTier);
  const visit = lastVisitLabel(profile?.last_seen_at);
  const metaChunks = [ratingChunk, visit ? `Vu ${visit}` : null].filter(Boolean) as string[];

  const cardLine = sitterCardLine(sitter, { omitSitsAndReviews: true });
  const quote = cardQuote(sanitizeBioForCard(profile?.bio), 120);
  // Une gouache qui répète un animal déjà en pastille n'apporte rien.
  const animalSet = new Set(sitterAnimalTypes.map((a) => a.toLowerCase()));
  const skillGroups = cardSkillGroups({
    animalTypes: sitter.animal_types,
    competences: sitter.competences ?? sitter._card?.competences,
    specialSkills: sitter.special_animal_skills ?? sitter._card?.special_animal_skills,
    exclude: animalSet,
  });
  const place = cardPlaceFacts(sitter.country ?? profile?.country, sitter.travel_zones);

  // Affinité affichable : owner connecté + score non masqué. Tri, jamais filtre.
  const showAffinityRing = !isAnon && !!affinity;
  const showAffinityFallback = !isAnon && hasOwnerProfile && !showAffinityRing;

  // Faits réels seulement ; l'absence de garde ne prouve aucune intention.
  const microFacts: string[] = [];
  if (sitter._helpOffered === true) microFacts.push("Propose aussi l'entraide");

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

  return (
    <div className="group relative h-full">
      {/* Favori HORS du lien de carte (lot L4) : un lien dans un lien cassait
          le rendu, et le favori ne doit jamais ouvrir la fiche. Zone 44 px. */}
      <div className="absolute top-2 right-2 z-20 flex h-11 w-11 items-center justify-center">
        <FavoriteButton targetType="sitter" targetId={sitter.user_id} anonRedirect={signupRedirect} />
      </div>
    <Link
      to={`/gardiens/${sitter.user_id}`}
      aria-label={`Voir le profil de ${firstName}`}
      className="relative bg-card rounded-[20px] overflow-hidden border border-border shadow-sm hover:shadow-lg hover:-translate-y-0.5 hover:border-primary/40 transition-all flex flex-col h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >

      {/* Photo 4:3 avec mini-carrousel préservé */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
        {currentPhoto ? (
          <img
            src={storageImageUrl(currentPhoto, { width: 880, height: 660 })}
            alt={firstName}
            loading="lazy"
            className="w-full h-full object-cover object-[center_top] group-hover:scale-[1.02] transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full bg-primary/10 flex items-center justify-center">
            <span className="text-4xl text-primary font-heading font-bold">{initials}</span>
          </div>
        )}

        {photos.length > 1 && (
          <>
            <button
              type="button"
              onClick={prev}
              aria-label="Photo précédente"
              className="absolute left-1.5 top-1/2 -translate-y-1/2 h-11 w-11 rounded-full bg-background/85 text-foreground opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity flex items-center justify-center shadow-sm hover:bg-background"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={next}
              aria-label="Photo suivante"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 h-11 w-11 rounded-full bg-background/85 text-foreground opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity flex items-center justify-center shadow-sm hover:bg-background"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            {/* Points indicatifs seulement : la navigation passe par les deux boutons de 44 px. */}
            <div aria-hidden="true" className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1">
              {photos.map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 rounded-full transition-all ${
                    i === photoIdx ? "w-4 bg-background" : "w-1.5 bg-background/60"
                  }`}
                />
              ))}
            </div>
            <span className="absolute top-2 left-1/2 -translate-x-1/2 z-[1] inline-flex items-center gap-1 rounded-full bg-background/85 px-2 py-0.5 text-[10px] font-medium text-foreground shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera className="h-3 w-3" aria-hidden />
              {photoIdx + 1}/{photos.length}
            </span>
          </>
        )}

        {/* Badge lieu incrusté (bas-gauche) */}
        {locLabel && (
          <span className="absolute left-3 bottom-3 rounded-full bg-background/90 backdrop-blur-sm px-3 py-1 text-[11px] font-semibold text-foreground shadow-sm">
            {locLabel}
          </span>
        )}
      </div>

      {/* Corps */}
      <div className="p-4 flex flex-col flex-1">
        {/* Nom + chips statut */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-heading text-[18px] leading-tight font-semibold text-foreground">
            {firstName}
          </span>
          {duplicateName && profile?.city && (
            <span className="text-xs font-normal text-muted-foreground">
              · {profile.city}
            </span>
          )}
          {profile?.identity_verified && (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[11px] font-semibold">
              <ShieldCheck className="h-3 w-3" aria-hidden />
              Vérifiée
            </span>
          )}
          {sitter.isEmergency && (
            <span className="rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[11px] font-semibold">
              Gardien d'urgence
            </span>
          )}
          <ProBadge status={profile?.pro_status} size="sm" />
        </div>

        {/* Ligne meta naturelle */}
        {metaChunks.length > 0 && (
          <p className="mt-2 text-[13px] text-muted-foreground">
            {metaChunks.join(" · ")}
          </p>
        )}

        {(reply || place.mobility) && (
          <p className="mt-1 text-[12.5px] text-muted-foreground">
            {[reply, place.mobility].filter(Boolean).join(" · ")}
          </p>
        )}

        {cardLine && (
          <p data-testid="sitter-card-line" className="mt-1.5 text-[13px] leading-snug text-muted-foreground line-clamp-2">
            {cardLine}
          </p>
        )}

        {/* Chips animaux (max 3), pin doux */}
        {sitterAnimalTypes.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2.5">
            {sitterAnimalTypes.slice(0, 3).map((a) => (
              <span
                key={a}
                className="rounded-full bg-primary/10 text-primary px-2.5 py-0.5 text-[11.5px] font-semibold"
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
        )}

        {skillGroups.length > 0 && (
          <ul className="mt-2.5 flex flex-wrap gap-2" aria-label="Savoir-faire">
            {skillGroups.map((g) => (
              <li key={g.key} className="inline-flex items-center gap-1.5 text-[12px] text-foreground/80">
                {SPOTS[g.spot] && (
                  <img src={SPOTS[g.spot]} alt="" aria-hidden="true" width={28} height={28} loading="lazy" decoding="async" className="h-7 w-7 object-contain" />
                )}
                {g.label}
              </li>
            ))}
          </ul>
        )}

        {/* Accroche : citation réelle de la bio, coupée sur un mot */}
        {quote && (
          <p className="mt-3 font-heading italic text-[13.5px] leading-snug text-foreground/80 line-clamp-2">
            « {quote} »
          </p>
        )}

        {/* Pied : ring OU micro-histoire + CTA secondaire vers profil */}
        <div className="mt-auto pt-4 flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            {showAffinityRing ? (
              <AffinityRing score={affinity!.sortScore} result={affinity} size={54} />
            ) : showAffinityFallback ? (
              <span
                className="inline-flex items-center rounded-full border border-border bg-muted/60 px-2.5 py-1 text-[11px] font-medium text-muted-foreground"
                title="Complétez votre profil propriétaire pour révéler le score d'affinité."
              >
                Affinité à découvrir
              </span>
            ) : microFacts.length > 0 ? (
              <ul className="space-y-0.5 text-[12px] leading-snug text-muted-foreground">
                {microFacts.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            ) : null}
          </div>

          <span
            aria-hidden
            className="shrink-0 inline-flex items-center justify-center rounded-full border border-border bg-card px-4 py-2 text-[13px] font-semibold text-foreground shadow-sm group-hover:border-primary/50 group-hover:text-primary transition-colors"
          >
            Faire connaissance
          </span>
        </div>
      </div>
    </Link>
    </div>
  );
};

export default SitterResultCard;
