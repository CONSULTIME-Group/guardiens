import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Info, RefreshCw } from "lucide-react";

interface BreedProfile {
  temperament: string;
  exercise_needs: string;
  grooming: string;
  stranger_behavior: string;
  sitter_tips: string;
  ideal_for: string;
}

interface Props {
  species: string;
  breed: string;
  ownerNote?: string;
  ownerFirstName?: string;
  onNoteChange?: (note: string) => void;
  editable?: boolean;
}

const speciesLabels: Record<string, string> = {
  dog: "chiens", cat: "chats", horse: "chevaux", bird: "oiseaux",
  rodent: "rongeurs", fish: "poissons", reptile: "reptiles",
  farm_animal: "animaux de ferme", nac: "NAC",
};

const fields: { key: keyof BreedProfile; label: string }[] = [
  { key: "temperament", label: "Caractère" },
  { key: "exercise_needs", label: "Exercice" },
  { key: "grooming", label: "Entretien" },
  { key: "stranger_behavior", label: "Avec les inconnus" },
  { key: "sitter_tips", label: "Conseils gardien" },
  { key: "ideal_for", label: "Idéal pour" },
];

const BreedProfileCard = ({ species, breed, ownerNote, ownerFirstName, onNoteChange, editable = false }: Props) => {
  const [profile, setProfile] = useState<BreedProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const fetchProfile = async () => {
    if (!breed || breed.trim().length < 2) return;
    setLoading(true);
    setError(false);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("generate-breed-profile", {
        body: { species, breed: breed.trim() },
      });

      if (fnError || data?.error) {
        setError(true);
      } else {
        setProfile(data);
      }
    } catch {
      setError(true);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProfile();
  }, [species, breed]);

  if (!breed || breed.trim().length < 2) return null;
  if (loading) {
    return (
      <div className="mt-3 rounded-lg border border-border bg-accent/50 p-4 animate-pulse">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <RefreshCw className="h-4 w-4 animate-spin" />
          Génération de la fiche race en cours...
        </div>
      </div>
    );
  }
  if (error || !profile) return null;

  const breedLabel = breed.trim();
  const speciesLabel = speciesLabels[species] || species;

  return (
    <div className="mt-3 rounded-lg border border-border bg-accent/30 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Info className="h-4 w-4 text-primary shrink-0" />
        <h4 className="text-sm font-semibold">À savoir sur les {breedLabel}</h4>
      </div>

      <div className="space-y-2">
        {fields.map(({ key, label }) => (
          profile[key] ? (
            <div key={key} className="text-sm">
              <span className="font-medium">{label} :</span>{" "}
              <span className="text-muted-foreground">{profile[key]}</span>
            </div>
          ) : null
        ))}
      </div>

      {/* Owner note (editable mode for owner profile) */}
      {editable && onNoteChange && (
        <div className="pt-2 border-t border-border/50">
          <label className="text-xs font-medium text-muted-foreground block mb-1">
            Votre nuance personnelle
          </label>
          <textarea
            value={ownerNote || ""}
            onChange={(e) => onNoteChange(e.target.value)}
            placeholder="Ex : Le caractère général dit actif, mais Cosmo est un canapé ambulant"
            className="w-full text-sm rounded-md border border-input bg-background px-3 py-2 min-h-[60px] resize-none focus:outline-none focus:ring-1 focus:ring-ring"
            maxLength={500}
          />
        </div>
      )}

      {/* Owner note (read-only mode for sitter view) */}
      {!editable && ownerNote && ownerFirstName && (
        <div className="pt-2 border-t border-border/50">
          <p className="text-sm">
            <span className="font-medium">Selon {ownerFirstName} :</span>{" "}
            <span className="text-muted-foreground italic">{ownerNote}</span>
          </p>
        </div>
      )}
    </div>
  );
};

export default BreedProfileCard;
