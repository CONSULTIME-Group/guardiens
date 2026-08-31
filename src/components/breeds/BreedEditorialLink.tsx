/**
 * BreedEditorialLink, lien contextuel vers la fiche éditoriale /races/:slug.
 *
 * La fiche n'existe que si `breed_profiles` contient la race. Le
 * rapprochement entre le nom déclaré (saisie libre) et le nom officiel de la
 * fiche est confié à `resolveBreedFiche` : normalisation, puis préfixe
 * conservateur à frontière de mot, toujours dans la même espèce, et aucun
 * lien en cas d'ambiguïté. Le href est construit sur le nom officiel de la
 * fiche, aligné avec la résolution de BreedPage : jamais de soft 404.
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { slugify } from "@/lib/normalize";
import { resolveBreedFiche, type BreedFicheCandidate } from "@/lib/breedFicheMatch";
import { cn } from "@/lib/utils";

/** Construction unique du href, partagée avec BreedPage, PetAdviceSection et
 *  les fonctions edge (rappel J-7). Source de vérité dans
 *  `supabase/functions/_shared/breeds/breedEditorialHref.ts`. */
import { buildBreedEditorialHref } from "../../../supabase/functions/_shared/breeds/breedEditorialHref";
export { buildBreedEditorialHref };



/** Cache module : une seule requête par espèce pour toute la session. */
const candidatesBySpecies = new Map<string, Promise<BreedFicheCandidate[]>>();

const loadSpeciesCandidates = (species: string): Promise<BreedFicheCandidate[]> => {
  let pending = candidatesBySpecies.get(species);
  if (!pending) {
    pending = (async () => {
      const { data } = await supabase
        .from("breed_profiles")
        .select("breed")
        .eq("species", species);
      return (data ?? []).map((row) => ({
        species,
        breed: (row as { breed: string }).breed,
      }));
    })();
    candidatesBySpecies.set(species, pending);
  }
  return pending;
};

interface BreedEditorialLinkProps {
  species: string;
  breed: string;
  className?: string;
  /** Libellé du lien ; par défaut « Lire la fiche {race} ». */
  label?: string;
  /** Libellé accessible, quand le texte visible est trop court hors contexte. */
  ariaLabel?: string;
  /** Clic supplémentaire, par exemple pour arrêter la propagation. */
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
}

const BreedEditorialLink = ({
  species,
  breed,
  className,
  label,
  ariaLabel,
  onClick,
}: BreedEditorialLinkProps) => {

  const [ficheBreed, setFicheBreed] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setFicheBreed(null);
    if (!species || !breed || breed.trim().length < 2) return;
    loadSpeciesCandidates(species)
      .then((candidates) => {
        if (!active) return;
        const match = resolveBreedFiche(species, breed, candidates);
        setFicheBreed(match ? match.breed : null);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [species, breed]);

  if (!ficheBreed) return null;

  return (
    <Link
      to={buildBreedEditorialHref(species, ficheBreed)}
      aria-label={ariaLabel}
      onClick={onClick}
      className={cn(
        "inline-flex items-center text-xs font-medium text-primary underline underline-offset-2 hover:text-primary/80 transition-colors",
        className,
      )}
    >
      {label ?? `Lire la fiche ${breed.trim()}`}
    </Link>
  );
};

export default BreedEditorialLink;
