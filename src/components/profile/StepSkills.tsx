import { useState, useEffect, useCallback, useMemo } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import CompetenceAutocomplete from "./CompetenceAutocomplete";
import {
  SKILL_CATEGORIES,
  deriveCategoriesFromCompetences,
  groupByCategory,
} from "@/lib/skills/categories";

interface Props {
  skillCategories: string[]; // conservé pour compat, désormais dérivé auto
  availableForHelp: boolean;
  competences?: string[];
  onChange: (partial: {
    skill_categories?: string[];
    available_for_help?: boolean;
    competences?: string[];
  }) => void;
}

/**
 * Mécanique 2026 : l'utilisateur ne déclare QUE des compétences spécifiques.
 * Les 4 catégories DB sont dérivées automatiquement à chaque modification,
 * ce qui supprime le bruit du « tout le monde coche tout » qui rendait le
 * filtre de recherche inutile.
 */
const StepSkills = ({
  availableForHelp,
  competences = [],
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
        competences: string[];
        skill_categories: string[];
        available_for_help?: boolean;
      } = {
        competences: nextCompetences,
        skill_categories: derived,
      };
      // Auto-active la visibilité dans le feed d'entraide dès la 1ère compétence.
      if (nextCompetences.length > 0 && !availableForHelp) {
        partial.available_for_help = true;
      }
      onChange(partial);
    },
    [availableForHelp, onChange],
  );

  const handleAddCompetence = useCallback(
    (label: string) => {
      if (competences.includes(label)) return;
      pushUpdate([...competences, label]);
    },
    [competences, pushUpdate],
  );

  const handleRemoveCompetence = useCallback(
    (label: string) => {
      pushUpdate(competences.filter((c) => c !== label));
    },
    [competences, pushUpdate],
  );

  // Catégories dérivées affichées en lecture seule (preuve sociale visuelle).
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
          Décrivez des compétences concrètes. Plus c'est précis, plus vous
          serez sollicité pour des coups de main qui vous correspondent.
        </p>
      </div>

      {/* Catégories couvertes, dérivées et affichées en lecture seule */}
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
        onAdd={handleAddCompetence}
        onRemove={handleRemoveCompetence}
      />

      <div className="flex items-center justify-between py-2 border-t border-border pt-4">
        <div className="flex-1 pr-4">
          <Label className="text-sm">Visible dans le feed d'entraide</Label>
          <p className="text-xs text-muted-foreground mt-0.5">
            {availableForHelp
              ? "Vos compétences peuvent être proposées en échange."
              : "Vos compétences restent enregistrées mais masquées."}
          </p>
        </div>
        <Switch
          checked={availableForHelp}
          onCheckedChange={(v) => onChange({ available_for_help: v })}
        />
      </div>
    </div>
  );
};

export default StepSkills;
