/**
 * Saisie de race guidée, jamais bloquante.
 *
 * La liste de suggestions provient des fiches `breed_profiles` de l'espèce
 * sélectionnée. La saisie libre reste possible : un propriétaire dont
 * l'animal n'a aucune fiche doit pouvoir écrire sa race. On guide, on ne
 * ferme pas. La liste se filtre à la frappe (comportement natif de
 * `datalist`) et se vide dès que l'espèce change.
 */
import { useEffect, useId, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";

/** Cache module : une requête par espèce pour toute la session. */
const breedsBySpecies = new Map<string, Promise<string[]>>();

export const loadBreedOptions = (species: string): Promise<string[]> => {
  let pending = breedsBySpecies.get(species);
  if (!pending) {
    pending = (async () => {
      const { data } = await supabase
        .from("breed_profiles")
        .select("breed")
        .eq("species", species)
        .order("breed");
      return (data ?? []).map((row) => (row as { breed: string }).breed);
    })();
    breedsBySpecies.set(species, pending);
  }
  return pending;
};

/** Première lettre en capitale, pour une suggestion présentable. */
const pretty = (breed: string): string =>
  breed.charAt(0).toUpperCase() + breed.slice(1);

interface BreedAutocompleteInputProps {
  species: string;
  value: string;
  onChange: (value: string) => void;
  onPaste?: React.ClipboardEventHandler<HTMLInputElement>;
  id?: string;
  placeholder?: string;
  maxLength?: number;
  className?: string;
}

const BreedAutocompleteInput = ({
  species,
  value,
  onChange,
  onPaste,
  id,
  placeholder,
  maxLength,
  className,
}: BreedAutocompleteInputProps) => {
  const listId = `breed-options-${useId().replace(/:/g, "")}`;
  const [options, setOptions] = useState<string[]>([]);

  useEffect(() => {
    let active = true;
    setOptions([]);
    if (!species) return;
    loadBreedOptions(species)
      .then((breeds) => {
        if (active) setOptions(breeds);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [species]);

  return (
    <>
      <Input
        id={id}
        list={listId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onPaste={onPaste}
        placeholder={placeholder}
        maxLength={maxLength}
        className={className}
        autoComplete="off"
      />
      <datalist id={listId}>
        {options.map((breed) => (
          <option key={breed} value={pretty(breed)} />
        ))}
      </datalist>
    </>
  );
};

export default BreedAutocompleteInput;
