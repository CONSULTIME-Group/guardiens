import { useState, useEffect } from "react";
import { Sprout, PawPrint, GraduationCap, Handshake, Plus, X, Clock, Check } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const SKILL_CATEGORIES = [
  { key: "jardin", label: "Jardin", icon: Sprout },
  { key: "animaux", label: "Animaux", icon: PawPrint },
  { key: "competences", label: "Compétences & Savoirs", icon: GraduationCap },
  { key: "coups_de_main", label: "Coups de main", icon: Handshake },
] as const;

interface CustomSkill {
  label: string;
  skill_id: string;
  status: string;
}

interface Props {
  skillCategories: string[];
  availableForHelp: boolean;
  onChange: (partial: { skill_categories?: string[]; available_for_help?: boolean }) => void;
}

const StepSkills = ({ skillCategories, availableForHelp, onChange }: Props) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [customSkills, setCustomSkills] = useState<CustomSkill[]>([]);
  const [newSkill, setNewSkill] = useState("");
  const [adding, setAdding] = useState(false);

  // Load custom skills from profile
  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("custom_skills")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        const skills = (data?.custom_skills as CustomSkill[]) || [];
        // Filter out rejected
        const visible = skills.filter(s => s.status !== "rejected");
        if (visible.length < skills.length) {
          // Some were rejected, clean up silently
          toast({ description: "Une compétence n'a pas été retenue." });
        }
        setCustomSkills(visible);
      });
  }, [user]);

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

  const handleAddSkill = async () => {
    if (!user || newSkill.trim().length < 3) return;
    setAdding(true);

    try {
      const res = await supabase.functions.invoke("add-custom-skill", {
        body: { label: newSkill.trim() },
      });

      if (res.error) {
        toast({ variant: "destructive", description: "Impossible d'ajouter la compétence." });
        return;
      }

      const data = res.data;

      if (data?.error === "predefined_category") {
        toast({ description: `Active directement la catégorie ${data.category} !` });
        if (!skillCategories.includes(data.category)) {
          toggleCategory(data.category);
        }
        setNewSkill("");
        return;
      }

      if (data?.error === "rejected") {
        toast({ description: data.message || "Cette compétence ne correspond pas à l'univers Guardiens." });
        setNewSkill("");
        return;
      }

      if (data?.error) {
        toast({ description: data.error || data.message });
        setNewSkill("");
        return;
      }

      setCustomSkills(prev => [...prev, {
        label: data.label,
        skill_id: data.skill_id,
        status: data.status,
      }]);
      setNewSkill("");

      if (!availableForHelp) {
        onChange({ available_for_help: true });
      }
    } catch {
      toast({ variant: "destructive", description: "Erreur lors de l'ajout." });
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveSkill = async (skillId: string) => {
    if (!user) return;
    const updated = customSkills.filter(s => s.skill_id !== skillId);
    setCustomSkills(updated);

    await supabase
      .from("profiles")
      .update({ custom_skills: updated } as any)
      .eq("id", user.id);
  };

  const canAdd = newSkill.trim().length >= 3 && newSkill.trim().length <= 40 && customSkills.length < 10;

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

      {/* Custom skills */}
      <div className="space-y-3">
        <div>
          <p className="text-sm text-foreground/60 mt-6">
            Une compétence plus précise ?
          </p>
          <p className="text-xs text-foreground/40 mt-1">
            Jardinage naturel, cours de guitare, aide aux devoirs... Jusqu'à 10 compétences.
          </p>
        </div>

        <div className="flex gap-2">
          <Input
            value={newSkill}
            onChange={e => setNewSkill(e.target.value)}
            placeholder="Ex : Taille de haies, Cours de yoga..."
            maxLength={40}
            className="flex-1"
            onKeyDown={e => {
              if (e.key === "Enter" && canAdd) {
                e.preventDefault();
                handleAddSkill();
              }
            }}
          />
          <Button
            type="button"
            size="sm"
            onClick={handleAddSkill}
            disabled={!canAdd || adding}
            className="shrink-0"
          >
            <Plus className="h-4 w-4 mr-1" />
            Ajouter
          </Button>
        </div>

        {customSkills.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {customSkills.map(skill => (
              <span
                key={skill.skill_id}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm ${
                  skill.status === "approved"
                    ? "bg-primary/10 text-primary border-primary/20"
                    : "bg-muted text-foreground/60 border-border"
                }`}
              >
                {skill.status === "approved" ? (
                  <Check className="h-3 w-3" />
                ) : (
                  <Clock className="h-3 w-3 text-foreground/40" />
                )}
                {skill.label}
                <button
                  type="button"
                  onClick={() => handleRemoveSkill(skill.skill_id)}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        <p className="text-xs text-foreground/40">
          Les compétences spécifiques apparaissent sur ton profil après validation par l'équipe.
        </p>
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
