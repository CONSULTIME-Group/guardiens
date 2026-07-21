/**
 * Carte gardien — vague 42, refonte visuelle "carnet".
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
 *  - accroche Playfair italique = première phrase de bio (< 120 chars), sinon rien
 *  - pied : mini ring d'affinité 54px (owner + score affichable), sinon micro-histoire réelle
 *          + bouton SECONDAIRE "Faire connaissance" (menant au profil, comme la carte).
 * Le bouton primaire "Contacter" DISPARAÎT (la rencontre vit sur le profil refondu).
 */
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

interface SitterResultCardProps {
  sitter: any;
  photos: string[];
  affinity: AffinityResult | null;
  hasOwnerProfile: boolean;
  duplicateName: boolean;
  city: string;
}

/**
 * Extrait la première phrase d'une bio si elle tient sous 120 caractères,
 * sinon renvoie null (jamais de troncature ni de génération).
 */
function firstSentenceUnder(bio: string | null | undefined, max = 120): string | null {
  if (!bio) return null;
  const trimmed = bio.trim();
  if (!trimmed) return null;
  const m = trimmed.match(/^[^.!?…]+[.!?…]/);
  const first = (m ? m[0] : trimmed).trim();
  if (first.length === 0 || first.length > max) return null;
  return first;
}

/**
 * "Répond en moins de 2 h" / "Répond en moins de 30 min" à partir des minutes médianes.
 * Aucun affichage si la donnée est absente ou aberrante.
 */
function replyPhrase(minutes: number | null | undefined): string | null {
  if (minutes == null || !Number.isFinite(minutes) || minutes <= 0) return null;
  if (minutes < 60) {
    const rounded = Math.max(5, Math.round(minutes / 5) * 5);
    return `Répond en moins de ${rounded} min`;
  }
  const hours = Math.max(1, Math.round(minutes / 60));
  return `Répond en moins de ${hours} h`;
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
  const firstName: string = profile?.first_name || "Gardien";
  const sitterAnimalTypes: string[] = sitter.animal_types || [];
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
  const locLabel = locChunks.length > 0 ? locChunks.join(" · ") : null;

  // Ligne meta naturelle : "Répond en moins de 2 h · 4,9 sur 7 gardes"
  const reply = replyPhrase(sitter.reply_median_minutes);
  const nSits: number = profile?.completed_sits_count || 0;
  const rating: number | null = sitter.avgRating;
  const ratingChunk =
    rating != null && nSits > 0
      ? `${rating.toFixed(1).replace(".", ",")} sur ${nSits} garde${nSits > 1 ? "s" : ""}`
      : nSits > 0
        ? `${nSits} garde${nSits > 1 ? "s" : ""} réalisée${nSits > 1 ? "s" : ""}`
        : null;
  const metaChunks = [reply, ratingChunk].filter(Boolean) as string[];

  // Accroche Playfair : première phrase de bio courte, sinon rien.
  const quote = firstSentenceUnder(profile?.bio, 120);

  // Affinité affichable : owner connecté + score non masqué.
  const showAffinityRing = !isAnon && !!affinity && affinity.displayed !== false;
  // Fallback owner sans score affichable : petite mention discrète.
  const showAffinityFallback = !isAnon && hasOwnerProfile && !showAffinityRing;

  // Micro-histoire : uniquement des faits réels, jamais générée.
  //   - "Prépare sa première garde" si aucun garde à ce jour.
  //   - "Identité vérifiée" si applicable.
  const microFacts: string[] = [];
  if (nSits === 0) microFacts.push("Prépare sa première garde");
  if (profile?.identity_verified) microFacts.push("Identité vérifiée");

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
    <Link
      to={`/gardiens/${sitter.user_id}`}
      aria-label={`Voir le profil de ${firstName}`}
      className="group relative bg-card rounded-[20px] overflow-hidden border border-border shadow-sm hover:shadow-lg hover:-translate-y-0.5 hover:border-primary/40 transition-all flex flex-col h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {/* Favori (overlay, redirect encodé pour anon) */}
      <div className="absolute top-2 right-2 z-10">
        <FavoriteButton targetType="sitter" targetId={sitter.user_id} anonRedirect={signupRedirect} />
      </div>

      {/* Photo 4:3 avec mini-carrousel préservé */}
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
            <span className="text-4xl text-primary font-heading font-bold">{initials}</span>
          </div>
        )}

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
                    i === photoIdx ? "w-4 bg-white" : "w-1.5 bg-white/60 hover:bg-white/80"
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
          {profile?.pro_status === "verified" && (
            <span className="rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[11px] font-semibold">
              Pro
            </span>
          )}
        </div>

        {/* Ligne meta naturelle */}
        {metaChunks.length > 0 && (
          <p className="mt-2 text-[13px] text-muted-foreground">
            {metaChunks.join(" · ")}
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

        {/* Accroche Playfair italique, uniquement si bio courte réelle */}
        {quote && (
          <p className="mt-3 font-heading italic text-[13.5px] leading-snug text-foreground/80 line-clamp-2">
            « {quote} »
          </p>
        )}

        {/* Pied : ring OU micro-histoire + CTA secondaire vers profil */}
        <div className="mt-auto pt-4 flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            {showAffinityRing ? (
              <AffinityRing score={affinity!.score} result={affinity} size={54} />
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
                  <li key={f} className="truncate">{f}</li>
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
  );
};

export default SitterResultCard;
