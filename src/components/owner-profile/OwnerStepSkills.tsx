import { useState, useEffect, useCallback } from "react";
import { Sprout, PawPrint, GraduationCap, Handshake } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import CompetenceAutocomplete from "@/components/profile/CompetenceAutocomplete";

const SKILL_CATEGORIES = [
  { key: "jardin", label: "🌿 Jardin" },
  { key: "animaux", label: "🐾 Animaux" },
  { key: "competences", label: "📚 Compétences & Savoirs" },
  { key: "coups_de_main", label: "🤝 Coups de main" },
] as const;

interface Props {
  competences: string[];
  competencesDisponible: boolean;
  skillCategories: string[];
  onChange: (partial: {
    owner_competences?: string[];
    owner_competences_disponible?: boolean;
    owner_skill_categories?: string[];
  }) => void;
}

const OwnerStepSkills = ({ competences, competencesDisponible, skillCategories, onChange }: Props) => {
  const [validatedLabels, setValidatedLabels] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

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
    setActiveCategory(updated.includes(key) ? key : updated[updated.length - 1] || null);
    onChange({ owner_skill_categories: updated });
  };

  const handleAdd = useCallback((label: string) => {
    if (competences.includes(label)) return;
    onChange({ owner_competences: [...competences, label] });
  }, [competences, onChange]);

  const handleRemove = useCallback((label: string) => {
    onChange({ owner_competences: competences.filter(c => c !== label) });
  }, [competences, onChange]);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-heading font-semibold uppercase tracking-widest text-muted-foreground">
          Ce que je sais faire
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          Déclarez vos compétences pour apparaître dans les échanges qui vous correspondent.
          En tant que propriétaire, vous pouvez aussi proposer votre aide à la communauté.
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

      <CompetenceAutocomplete
        competences={competences}
        validatedLabels={validatedLabels}
        activeCategory={activeCategory}
        onAdd={handleAdd}
        onRemove={handleRemove}
      />

      <div className="flex items-center justify-between py-2">
        <div className="flex-1 pr-4">
          <Label>Je suis disponible pour aider</Label>
          <p className="text-xs text-muted-foreground mt-0.5">
            Vous apparaissez dans le feed d'entraide pour les catégories sélectionnées.
          </p>
        </div>
        <Switch
          checked={competencesDisponible}
          onCheckedChange={v => onChange({ owner_competences_disponible: v })}
        />
      </div>
    </div>
  );
};

export default OwnerStepSkills;
