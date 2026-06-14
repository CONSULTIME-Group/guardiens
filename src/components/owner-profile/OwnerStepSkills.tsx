import { useState, useEffect, useCallback, useMemo } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import CompetenceAutocomplete from "@/components/profile/CompetenceAutocomplete";
import {
  SKILL_CATEGORIES,
  deriveCategoriesFromCompetences,
  groupByCategory,
} from "@/lib/skills/categories";

interface Props {
  competences: string[];
  competencesDisponible: boolean;
  skillCategories: string[]; // dérivé auto, conservé pour compat
  onChange: (partial: {
    owner_competences?: string[];
    owner_competences_disponible?: boolean;
    owner_skill_categories?: string[];
  }) => void;
}

/**
 * Mécanique 2026, côté propriétaire : compétences spécifiques uniquement,
 * catégories DB dérivées automatiquement.
 */
const OwnerStepSkills = ({
  competences,
  competencesDisponible,
  onChange,
}: Props) => {
  const [validatedLabels, setValidatedLabels] = useState<string[]>([]);

  useEffect(() => {
    supabase
      .from("competences_validees")
      .select("label")
      .then(({ data }) => {
        setValidatedLabels((data || []).map((d: any) => d.label));
      });
  }, []);

  const pushUpdate = useCallback(
    (nextCompetences: string[]) => {
      const derived = deriveCategoriesFromCompetences(nextCompetences);
      const partial: {
        owner_competences: string[];
        owner_skill_categories: string[];
        owner_competences_disponible?: boolean;
      } = {
        owner_competences: nextCompetences,
        owner_skill_categories: derived,
      };
      if (nextCompetences.length > 0 && !competencesDisponible) {
        partial.owner_competences_disponible = true;
      }
      onChange(partial);
    },
    [competencesDisponible, onChange],
  );

  const handleAdd = useCallback(
    (label: string) => {
      if (competences.includes(label)) return;
      pushUpdate([...competences, label]);
    },
    [competences, pushUpdate],
  );

  const handleRemove = useCallback(
    (label: string) => {
      pushUpdate(competences.filter((c) => c !== label));
    },
    [competences, pushUpdate],
  );

  const grouped = useMemo(() => groupByCategory(competences), [competences]);
  const derivedKeys = useMemo(
    () => deriveCategoriesFromCompetences(competences),
    [competences],
  );

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-heading font-semibold uppercase tracking-widest text-muted-foreground">
          Ce que vous savez faire
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          Décrivez des compétences concrètes que vous pouvez offrir à la
          communauté en échange d'un coup de main.
        </p>
      </div>

      {derivedKeys.length > 0 && (
        <div className="rounded-xl border border-border bg-muted/30 p-3">
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
            Vous apparaissez dans
          </p>
          <div className="flex flex-wrap gap-1.5">
            {SKILL_CATEGORIES.filter((c) => derivedKeys.includes(c.key)).map(
              (c) => (
                <span
                  key={c.key}
                  className="rounded-full bg-primary/10 text-primary text-xs font-medium px-3 py-1"
                >
                  {c.label}
                  <span className="ml-1.5 opacity-60">
                    {grouped[c.key].length}
                  </span>
                </span>
              ),
            )}
          </div>
        </div>
      )}

      <CompetenceAutocomplete
        competences={competences}
        validatedLabels={validatedLabels}
        activeCategory={null}
        onAdd={handleAdd}
        onRemove={handleRemove}
      />

      <div className="flex items-center justify-between py-2 border-t border-border pt-4">
        <div className="flex-1 pr-4">
          <Label className="text-sm">Visible dans le feed d'entraide</Label>
          <p className="text-xs text-muted-foreground mt-0.5">
            {competencesDisponible
              ? "Vos compétences peuvent être proposées en échange."
              : "Vos compétences restent enregistrées mais masquées."}
          </p>
        </div>
        <Switch
          checked={competencesDisponible}
          onCheckedChange={(v) =>
            onChange({ owner_competences_disponible: v })
          }
        />
      </div>
    </div>
  );
};

export default OwnerStepSkills;
