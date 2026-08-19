/**
 * BreedEditorialLink — lien contextuel vers la fiche éditoriale /races/:slug.
 *
 * La fiche éditoriale n'existe que si `breed_profiles` contient la race.
 * La résolution reprend exactement la construction de slug de BreedPage et
 * PetAdviceSection : `/races/{espèce}-{slugify(race)}` avec le `slugify()`
 * strict de `src/lib/normalize.ts`. Un slug divergent produirait un soft 404
 * (cf. générateur de sitemap) : si aucune fiche ne correspond, le composant
 * ne rend rien. Jamais de lien vers une page inexistante.
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { slugify } from "@/lib/normalize";
import { cn } from "@/lib/utils";

/** Construction unique du href, partagée avec BreedPage et PetAdviceSection. */
export const buildBreedEditorialHref = (species: string, breed: string): string =>
  `/races/${species}-${slugify(breed)}`;

/** Cache module : une seule requête par espèce pour toute la session. */
const slugsBySpecies = new Map<string, Promise<Set<string>>>();

const loadSpeciesSlugs = (species: string): Promise<Set<string>> => {
  let pending = slugsBySpecies.get(species);
  if (!pending) {
    pending = (async () => {
      const { data } = await supabase
        .from("breed_profiles")
        .select("breed")
        .eq("species", species);
      return new Set((data ?? []).map((row) => slugify((row as { breed: string }).breed)));
    })();
    slugsBySpecies.set(species, pending);
  }
  return pending;
};

interface BreedEditorialLinkProps {
  species: string;
  breed: string;
  className?: string;
}

const BreedEditorialLink = ({ species, breed, className }: BreedEditorialLinkProps) => {
  const [exists, setExists] = useState(false);
  const breedSlug = slugify(breed || "");

  useEffect(() => {
    let active = true;
    setExists(false);
    if (!species || breedSlug.length < 2) return;
    loadSpeciesSlugs(species)
      .then((slugs) => {
        if (active) setExists(slugs.has(breedSlug));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [species, breedSlug]);

  if (!exists) return null;

  return (
    <Link
      to={buildBreedEditorialHref(species, breed)}
      className={cn(
        "inline-flex items-center text-xs font-medium text-primary underline underline-offset-2 hover:text-primary/80 transition-colors",
        className,
      )}
    >
      Lire la fiche {breed.trim()}
    </Link>
  );
};

export default BreedEditorialLink;
