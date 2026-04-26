/**
 * Onglet "Animaux" — strictement identique entre vue propriétaire et gardien.
 *
 * Améliorations UX :
 *  - Si tous les animaux partagent la même `alone_duration`, on l'affiche
 *    UNE FOIS en bandeau "Présence requise" en haut au lieu de répéter le
 *    tag sur chaque card (réduit le bruit visuel quand 5-6 animaux).
 *  - Pareil pour `walk_duration` lorsqu'elle est commune.
 *  - Le tag "Médication" expose désormais un extrait du détail textuel
 *    (rendu via title= + texte tronqué inline) plutôt qu'un simple drapeau
 *    rouge anxiogène. La couleur reste destructive uniquement pour les
 *    mots-clés réellement à risque (insuline, anticonvulsivant…).
 */
import { useMemo, useState } from "react";
import { ChevronDown, Clock, Footprints, Pill } from "lucide-react";
import BreedProfileCard from "@/components/breeds/BreedProfileCard";
import PhotoLightbox from "@/components/shared/PhotoLightbox";
import { hasMedication } from "@/lib/medication";
import {
  SPECIES_EMOJI as speciesEmoji,
  WALK_LABELS as walkLabels,
  ALONE_LABELS as aloneLabels,
} from "@/components/sits/shared/sitConstants";

interface AnimalsTabProps {
  pets: any[];
  ownerFirstName?: string;
}

/**
 * Mots-clés (normalisés sans accents) qui justifient une couleur destructive
 * sur le tag médication. En dehors de cette liste, on reste sur une couleur
 * neutre/info pour ne pas inquiéter sans raison.
 */
const HIGH_RISK_MED_PATTERNS = [
  "insulin",
  "diabet",
  "epilep",
  "anticonvulsiv",
  "phenobarbital",
  "anti-convuls",
  "cardiaque",
  "chimio",
  "cortico",
  "morphin",
];

function isHighRiskMedication(text: string | null | undefined): boolean {
  if (!text) return false;
  const v = normalize(text);
  return HIGH_RISK_MED_PATTERNS.some((p) => v.includes(p));
}

/**
 * Renvoie une valeur unique si tous les éléments la partagent (en ignorant
 * null/undefined/""), sinon null.
 */
function uniqueSharedValue<T>(values: (T | null | undefined)[]): T | null {
  const filtered = values.filter(
    (v): v is T => v !== null && v !== undefined && v !== ("" as any),
  );
  if (filtered.length === 0) return null;
  if (filtered.length !== values.length) return null; // certains absents → pas global
  const first = filtered[0];
  return filtered.every((v) => v === first) ? first : null;
}

const AnimalsTab = ({ pets, ownerFirstName }: AnimalsTabProps) => {
  const [breedAccordions, setBreedAccordions] = useState<Record<string, boolean>>({});
  // Photo pet ouverte en lightbox (null = aucune). Stocke {src, alt} pour
  // découpler du cycle de vie de la liste pets (évite les flickers).
  const [lightboxPhoto, setLightboxPhoto] = useState<{ src: string; alt: string } | null>(null);

  // Calcule les valeurs partagées par TOUS les animaux pour les hisser en bandeau.
  const sharedAlone = useMemo(
    () => uniqueSharedValue(pets.map((p) => p?.alone_duration)),
    [pets],
  );
  const sharedWalk = useMemo(() => {
    // On ignore "none" qui n'est pas une info utile à afficher en bandeau.
    const vals = pets.map((p) => p?.walk_duration);
    if (vals.some((v) => v === "none")) return null;
    return uniqueSharedValue(vals);
  }, [pets]);

  if (pets.length === 0) {
    return (
      <p className="text-sm text-muted-foreground italic py-8 text-center">
        Aucun animal renseigné pour cette garde.
      </p>
    );
  }

  // Affiche le bandeau global seulement s'il y a au moins 2 animaux ET au
  // moins une info commune. À 1 animal, le tag par card suffit largement.
  const showGlobalBanner =
    pets.length >= 2 && (sharedAlone !== null || sharedWalk !== null);

  return (
    <div className="space-y-4">
      {showGlobalBanner && (
        <div
          className="rounded-xl border border-border bg-muted/40 p-4 flex flex-wrap items-center gap-x-5 gap-y-2"
          aria-label="Conditions communes à tous les animaux"
        >
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Pour tous les animaux
          </p>
          {sharedAlone && (
            <span className="inline-flex items-center gap-1.5 text-sm text-foreground">
              <Clock className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              {aloneLabels[sharedAlone] ?? sharedAlone}
            </span>
          )}
          {sharedWalk && (
            <span className="inline-flex items-center gap-1.5 text-sm text-foreground">
              <Footprints className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              {walkLabels[sharedWalk] ?? sharedWalk}
            </span>
          )}
        </div>
      )}

      {pets.map((pet: any) => {
        // Quand l'info est commune et déjà dans le bandeau, on la masque
        // sur la card pour éviter la répétition.
        const showAloneTag = pet.alone_duration && pet.alone_duration !== sharedAlone;
        const showWalkTag =
          pet.walk_duration && pet.walk_duration !== "none" && pet.walk_duration !== sharedWalk;
        const medText = hasMedication(pet.medication) ? String(pet.medication).trim() : null;
        const medHighRisk = medText ? isHighRiskMedication(medText) : false;

        return (
          <div key={pet.id}>
            <div className="flex gap-3 p-4 bg-card rounded-xl border border-border">
              {pet.photo_url ? (
                <button
                  type="button"
                  onClick={() =>
                    setLightboxPhoto({
                      src: pet.photo_url,
                      alt: `Photo de ${pet.name}${pet.breed ? ` (${pet.breed})` : ""}`,
                    })
                  }
                  className="shrink-0 rounded-xl overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary group"
                  aria-label={`Agrandir la photo de ${pet.name}`}
                >
                  <img
                    src={pet.photo_url}
                    alt={pet.name}
                    loading="lazy"
                    className="w-20 h-20 object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </button>
              ) : (
                <div
                  className="w-20 h-20 rounded-xl bg-muted flex items-center justify-center text-3xl shrink-0"
                  aria-hidden="true"
                >
                  {speciesEmoji[pet.species] || "🐾"}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-heading font-semibold">
                  <span aria-hidden="true">{speciesEmoji[pet.species]} </span>
                  {pet.name}
                  {pet.breed ? ` — ${pet.breed}` : ""}
                  {pet.age ? ` · ${pet.age} ${pet.age === 1 ? "an" : "ans"}` : ""}
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {showWalkTag && (
                    <span className="px-2 py-0.5 rounded-full bg-accent text-xs">
                      🚶 {walkLabels[pet.walk_duration]}
                    </span>
                  )}
                  {showAloneTag && (
                    <span className="px-2 py-0.5 rounded-full bg-accent text-xs">
                      🕐 {aloneLabels[pet.alone_duration]}
                    </span>
                  )}
                  {medText && (
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs max-w-full ${
                        medHighRisk
                          ? "bg-destructive/10 text-destructive"
                          : "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                      }`}
                      title={medText}
                    >
                      <Pill className="h-3 w-3 shrink-0" aria-hidden="true" />
                      <span className="truncate max-w-[14rem]">
                        Médication : {medText.length > 40 ? medText.slice(0, 40) + "…" : medText}
                      </span>
                    </span>
                  )}
                </div>
                {pet.character && (
                  <p className="text-sm text-muted-foreground mt-2">{pet.character}</p>
                )}
              </div>
            </div>
            {pet.breed && (() => {
              const panelId = `breed-panel-${pet.id}`;
              const isOpen = !!breedAccordions[pet.id];
              return (
                <div className="mt-2">
                  <button
                    type="button"
                    onClick={() =>
                      setBreedAccordions((prev) => ({ ...prev, [pet.id]: !prev[pet.id] }))
                    }
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    className="text-sm text-primary hover:underline cursor-pointer inline-flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                  >
                    En savoir plus sur le {pet.breed}
                    <ChevronDown
                      className={`h-3.5 w-3.5 transition-transform duration-300 ${
                        isOpen ? "rotate-180" : ""
                      }`}
                      aria-hidden="true"
                    />
                  </button>
                  <div
                    id={panelId}
                    role="region"
                    aria-label={`Informations sur la race ${pet.breed}`}
                    aria-hidden={!isOpen}
                    className={`overflow-hidden transition-all duration-300 ${
                      isOpen ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0 pointer-events-none"
                    }`}
                  >
                    <div className="pt-4">
                      <BreedProfileCard
                        species={pet.species}
                        breed={pet.breed}
                        ownerNote={pet.owner_breed_note}
                        ownerFirstName={ownerFirstName}
                      />
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        );
      })}

      <PhotoLightbox
        src={lightboxPhoto?.src ?? ""}
        alt={lightboxPhoto?.alt ?? ""}
        open={!!lightboxPhoto}
        onClose={() => setLightboxPhoto(null)}
      />
    </div>
  );
};

export default AnimalsTab;
