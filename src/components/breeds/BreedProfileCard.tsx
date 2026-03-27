import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Info, RefreshCw, Activity, Heart, Utensils, Shield, Users, PawPrint, Star, Gauge } from "lucide-react";

interface BreedProfile {
  temperament: string;
  exercise_needs: string;
  grooming: string;
  alimentation: string;
  health_notes: string;
  stranger_behavior: string;
  compatibility: string;
  sitter_tips: string;
  difficulty_level: string;
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

const fields: { key: keyof BreedProfile; label: string; icon: React.ReactNode }[] = [
  { key: "temperament", label: "Caractère", icon: <Heart className="h-3.5 w-3.5 text-primary" /> },
  { key: "exercise_needs", label: "Exercice", icon: <Activity className="h-3.5 w-3.5 text-primary" /> },
  { key: "alimentation", label: "Alimentation", icon: <Utensils className="h-3.5 w-3.5 text-primary" /> },
  { key: "grooming", label: "Entretien", icon: <PawPrint className="h-3.5 w-3.5 text-primary" /> },
  { key: "health_notes", label: "Santé", icon: <Shield className="h-3.5 w-3.5 text-primary" /> },
  { key: "stranger_behavior", label: "Avec les inconnus", icon: <Users className="h-3.5 w-3.5 text-primary" /> },
  { key: "compatibility", label: "Avec d'autres animaux", icon: <PawPrint className="h-3.5 w-3.5 text-primary" /> },
  { key: "sitter_tips", label: "Conseils gardien", icon: <Star className="h-3.5 w-3.5 text-primary" /> },
  { key: "difficulty_level", label: "Niveau gardien", icon: <Gauge className="h-3.5 w-3.5 text-primary" /> },
  { key: "ideal_for", label: "Idéal pour", icon: <Info className="h-3.5 w-3.5 text-primary" /> },
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

  return (
    <div className="mt-3 rounded-lg border border-border bg-accent/30 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Info className="h-4 w-4 text-primary shrink-0" />
        <h4 className="text-sm font-semibold">Fiche race — {breedLabel}</h4>
      </div>

      <div className="space-y-2">
        {fields.map(({ key, label, icon }) => (
          profile[key] ? (
            <div key={key} className="text-sm flex items-start gap-2">
              <span className="mt-0.5 shrink-0">{icon}</span>
              <div>
                <span className="font-medium">{label} :</span>{" "}
                <span className="text-muted-foreground">{profile[key]}</span>
              </div>
            </div>
          ) : null
        ))}
      </div>

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
