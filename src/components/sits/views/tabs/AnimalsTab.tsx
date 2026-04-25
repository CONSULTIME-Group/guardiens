/**
 * Onglet "Animaux" — strictement identique entre vue propriétaire et gardien.
 */
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import BreedProfileCard from "@/components/breeds/BreedProfileCard";
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

const AnimalsTab = ({ pets, ownerFirstName }: AnimalsTabProps) => {
  const [breedAccordions, setBreedAccordions] = useState<Record<string, boolean>>({});

  if (pets.length === 0) {
    return (
      <p className="text-sm text-muted-foreground italic py-8 text-center">
        Aucun animal renseigné pour cette garde.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {pets.map((pet: any) => (
        <div key={pet.id}>
          <div className="flex gap-3 p-4 bg-card rounded-xl border border-border">
            {pet.photo_url ? (
              <img
                src={pet.photo_url}
                alt={pet.name}
                className="w-20 h-20 rounded-xl object-cover shrink-0"
              />
            ) : (
              <div className="w-20 h-20 rounded-xl bg-muted flex items-center justify-center text-3xl shrink-0">
                {speciesEmoji[pet.species] || "🐾"}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-heading font-semibold">
                {speciesEmoji[pet.species]} {pet.name}
                {pet.breed ? ` — ${pet.breed}` : ""}
                {pet.age ? ` · ${pet.age} ans` : ""}
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                {pet.walk_duration && pet.walk_duration !== "none" && (
                  <span className="px-2 py-0.5 rounded-full bg-accent text-xs">
                    🚶 {walkLabels[pet.walk_duration]}
                  </span>
                )}
                {pet.alone_duration && (
                  <span className="px-2 py-0.5 rounded-full bg-accent text-xs">
                    🕐 {aloneLabels[pet.alone_duration]}
                  </span>
                )}
                {hasMedication(pet.medication) && (
                  <span className="px-2 py-0.5 rounded-full bg-destructive/10 text-destructive text-xs">
                    💊 Médication
                  </span>
                )}
              </div>
              {pet.character && (
                <p className="text-sm text-muted-foreground mt-2">{pet.character}</p>
              )}
            </div>
          </div>
          {pet.breed && (
            <div className="mt-2">
              <button
                onClick={() =>
                  setBreedAccordions((prev) => ({ ...prev, [pet.id]: !prev[pet.id] }))
                }
                className="text-sm text-primary hover:underline cursor-pointer inline-flex items-center gap-1"
              >
                En savoir plus sur le {pet.breed}
                <ChevronDown
                  className={`h-3.5 w-3.5 transition-transform duration-300 ${
                    breedAccordions[pet.id] ? "rotate-180" : ""
                  }`}
                />
              </button>
              <div
                className={`overflow-hidden transition-all duration-300 ${
                  breedAccordions[pet.id] ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
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
          )}
        </div>
      ))}
    </div>
  );
};

export default AnimalsTab;
