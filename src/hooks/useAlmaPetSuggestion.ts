/**
 * Suggestion contextuelle d'Alma après l'ajout d'un animal (lot 2).
 *
 * Alma réagit à ce que la personne vient de faire : elle félicite et
 * propose le guide de la race. Le rapprochement passe uniquement par
 * `resolveBreedFiche` (via les candidats déjà chargés par
 * BreedEditorialLink) : jamais de seconde normalisation, jamais de lien
 * mort, et aucune mention de ce qui manque quand la race reste ambiguë.
 *
 * Aucun changement du scheduler : on passe par `queueWhisper`, type
 * `usage_nudge`, comme les autres suggestions de niveau P2.
 */
import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAlma } from "@/contexts/AlmaContext";
import { resolveBreedFiche } from "@/lib/breedFicheMatch";
import { loadSpeciesCandidates } from "@/components/breeds/BreedEditorialLink";
import { buildPetSuggestion } from "@/lib/alma/pet-suggestion";
import { trackEvent } from "@/lib/analytics";

export interface AlmaPetSuggestionInput {
  name: string;
  species: string;
  breed?: string | null;
}

export function useAlmaPetSuggestion() {
  const { queueWhisper, canEmit } = useAlma();
  const navigate = useNavigate();

  return useCallback(
    async (pet: AlmaPetSuggestionInput) => {
      try {
        if (!canEmit("usage_nudge")) return;

        let ficheBreed: string | null = null;
        if (pet.breed?.trim()) {
          const candidates = await loadSpeciesCandidates(pet.species);
          const match = resolveBreedFiche(pet.species, pet.breed, candidates);
          ficheBreed = match?.breed ?? null;
        }

        const suggestion = buildPetSuggestion({
          petName: pet.name,
          species: pet.species,
          ficheBreed,
        });

        queueWhisper({
          id: `alma-pet-added-${Date.now()}`,
          type: "usage_nudge",
          audience: "owner",
          surface: "owner_profile_animals",
          priority: "P2",
          message: suggestion.message,
          primaryAction:
            suggestion.href && suggestion.ctaLabel
              ? {
                  label: suggestion.ctaLabel,
                  actionId: "pet_breed_guide",
                  onClick: () => navigate(suggestion.href as string),
                }
              : undefined,
          metadata: { species: pet.species, has_guide: Boolean(suggestion.href) },
        });

        trackEvent("alma_pet_suggestion_seen" as any, {
          metadata: { species: pet.species, has_guide: Boolean(suggestion.href) },
        });
      } catch {
        // Une suggestion manquée n'interrompt jamais l'enregistrement.
      }
    },
    [canEmit, queueWhisper, navigate],
  );
}
