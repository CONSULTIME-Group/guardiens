import { Sprout, PawPrint, GraduationCap, Handshake } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

const SKILL_CATEGORIES = [
  { key: "jardin", label: "Jardin", icon: Sprout },
  { key: "animaux", label: "Animaux", icon: PawPrint },
  { key: "competences", label: "Compétences & Savoirs", icon: GraduationCap },
  { key: "coups_de_main", label: "Coups de main", icon: Handshake },
] as const;

interface Props {
  skillCategories: string[];
  availableForHelp: boolean;
  onChange: (partial: { skill_categories?: string[]; available_for_help?: boolean }) => void;
}

const StepSkills = ({ skillCategories, availableForHelp, onChange }: Props) => {
  const toggleCategory = (key: string) => {
    const updated = skillCategories.includes(key)
      ? skillCategories.filter(k => k !== key)
      : [...skillCategories, key];
    const changes: { skill_categories: string[]; available_for_help?: boolean } = { skill_categories: updated };
    if (updated.length > 0 && !availableForHelp) {
      changes.available_for_help = true;
    }
    onChange(changes);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-heading font-semibold uppercase tracking-widest text-foreground/60">
          Ce que je sais faire
        </h3>
        <p className="text-sm text-foreground/60 mt-1">
          Déclare tes compétences pour apparaître dans les échanges qui te correspondent.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {SKILL_CATEGORIES.map(({ key, label, icon: Icon }) => {
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
              <Icon className="h-4 w-4" />
              {label}
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between py-2">
        <Label className="flex-1 pr-4">Je suis disponible pour aider</Label>
        <Switch
          checked={availableForHelp}
          onCheckedChange={v => onChange({ available_for_help: v })}
        />
      </div>

      <p className="text-xs text-foreground/50">
        {availableForHelp
          ? "Tu apparaîs dans le feed d'entraide pour les catégories sélectionnées."
          : "Tes compétences sont enregistrées mais tu n'apparaîs pas dans le feed."}
      </p>
    </div>
  );
};

export default StepSkills;
