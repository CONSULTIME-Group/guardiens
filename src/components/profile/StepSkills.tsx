import { useState, useEffect, useCallback } from "react";
import { Sprout, PawPrint, GraduationCap, Handshake } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import CompetenceAutocomplete from "./CompetenceAutocomplete";

const SKILL_CATEGORIES = [
  { key: "jardin", label: "Jardin", icon: Sprout },
  { key: "animaux", label: "Animaux", icon: PawPrint },
  { key: "competences", label: "Compétences & Savoirs", icon: GraduationCap },
  { key: "coups_de_main", label: "Coups de main", icon: Handshake },
] as const;

interface Props {
  skillCategories: string[];
  availableForHelp: boolean;
  competences?: string[];
  onChange: (partial: { skill_categories?: string[]; available_for_help?: boolean; competences?: string[] }) => void;
}

const StepSkills = ({ skillCategories, availableForHelp, competences = [], onChange }: Props) => {
  const { user } = useAuth();
  const [validatedLabels, setValidatedLabels] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  // Load validated competence labels
  useEffect(() => {
    supabase
      .from("competences_validees")
      .select("label")
      .then(({ data }) => {
        setValidatedLabels((data || []).map((d: any) => d.label));
      });
  }, []);

  const toggleCategory = (key: string) => {
    const updated = skillCategories.includes(key)
      ? skillCategories.filter(k => k !== key)
      : [...skillCategories, key];
    const changes: { skill_categories: string[]; available_for_help?: boolean } = { skill_categories: updated };
    if (updated.length > 0 && !availableForHelp) {
      changes.available_for_help = true;
    }
    setActiveCategory(updated.includes(key) ? key : updated[updated.length - 1] || null);
    onChange(changes);
  };

  const handleAddCompetence = useCallback((label: string) => {
    if (competences.includes(label)) return;
    onChange({ competences: [...competences, label] });
  }, [competences, onChange]);

  const handleRemoveCompetence = useCallback((label: string) => {
    onChange({ competences: competences.filter(c => c !== label) });
  }, [competences, onChange]);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-heading font-semibold uppercase tracking-widest text-muted-foreground">
          Ce que je sais faire
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          Déclarez vos compétences pour apparaître dans les échanges qui vous correspondent.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {SKILL_CATEGORIES.map(({ key, label }) => {
          const selected = skillCategories.includes(key);
          return (
            <button
              key={key}
              type="button"
              onClick={() => toggleCategory(key)}
              className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition-colors ${
                selected
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-muted text-foreground border-border hover:border-primary/40"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Autocomplete */}
      <CompetenceAutocomplete
        competences={competences}
        validatedLabels={validatedLabels}
        activeCategory={activeCategory}
        onAdd={handleAddCompetence}
        onRemove={handleRemoveCompetence}
      />

      <div className="flex items-center justify-between py-2">
        <Label className="flex-1 pr-4">Je suis disponible pour aider</Label>
        <Switch
          checked={availableForHelp}
          onCheckedChange={v => onChange({ available_for_help: v })}
        />
      </div>

      <p className="text-xs text-muted-foreground">
        {availableForHelp
          ? "Vous apparaissez dans le feed d'entraide pour les catégories sélectionnées."
          : "Vos compétences sont enregistrées mais vous n'apparaissez pas dans le feed."}
      </p>
    </div>
  );
};

export default StepSkills;
