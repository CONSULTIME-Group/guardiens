import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ChipSelect from "@/components/profile/ChipSelect";
import RadioChipGroup from "@/components/profile/RadioChipGroup";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { trackEvent } from "@/lib/analytics";
import { DEPT_NAMES, getDeptCode } from "@/lib/departments";
import {
  EMPTY_VOLUNTEER_AVAILABILITY,
  VOLUNTEER_CHECKBOX_LABEL,
  VOLUNTEER_FREQUENCIES,
  VOLUNTEER_SKILLS,
  VOLUNTEER_STRUCTURE_TYPES,
  VOLUNTEER_WAITING_SENTENCE,
  type VolunteerAvailabilityRow,
} from "@/lib/volunteerAvailability";

interface VolunteerAvailabilityBlockProps {
  /** Identifiant de la personne connectée. */
  userId?: string;
  /** Code postal du profil, sert à préremplir le département. */
  postalCode?: string | null;
  /** Rôle actif, transmis à la mesure. */
  activeRole: "sitter" | "owner";
}

const deptLabel = (code: string) =>
  DEPT_NAMES[code] ? `${code} ${DEPT_NAMES[code]}` : code;

/**
 * Déclaration de bénévolat en association animalière.
 *
 * Bloc autonome, identique sur les deux profils. Il lit et écrit sa propre
 * ligne dans `volunteer_availability`, en dehors du formulaire de profil :
 * la déclaration reste ainsi strictement hors du barème de complétion.
 * La donnée reste privée, rien n'est exposé publiquement à ce stade.
 */
const VolunteerAvailabilityBlock = ({
  userId,
  postalCode,
  activeRole,
}: VolunteerAvailabilityBlockProps) => {
  const [row, setRow] = useState<VolunteerAvailabilityRow>(EMPTY_VOLUNTEER_AVAILABILITY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const profileDept = useMemo(() => getDeptCode(postalCode ?? null), [postalCode]);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    const load = async () => {
      const { data } = await supabase
        .from("volunteer_availability")
        .select("available, structure_types, skills, departments, frequency, current_association")
        .eq("user_id", userId)
        .maybeSingle();
      if (cancelled) return;
      if (data) {
        setRow({
          available: !!data.available,
          structure_types: data.structure_types ?? [],
          skills: data.skills ?? [],
          departments: data.departments ?? [],
          frequency: data.frequency ?? null,
          current_association: data.current_association ?? null,
        });
      }
      setLoading(false);
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const patch = useCallback((partial: Partial<VolunteerAvailabilityRow>) => {
    setRow((prev) => ({ ...prev, ...partial }));
  }, []);

  const onToggleAvailable = (checked: boolean) => {
    patch({
      available: checked,
      departments:
        checked && row.departments.length === 0 && profileDept
          ? [profileDept]
          : row.departments,
    });
  };

  const handleSave = async () => {
    if (!userId) return;
    setSaving(true);
    const { error } = await supabase.from("volunteer_availability").upsert(
      {
        user_id: userId,
        available: row.available,
        structure_types: row.structure_types,
        skills: row.skills,
        departments: row.departments,
        frequency: row.frequency,
        current_association: row.current_association,
      },
      { onConflict: "user_id" },
    );
    setSaving(false);
    if (error) {
      toast({
        title: "Enregistrement à reprendre",
        description: "Réessayez dans un instant, votre saisie reste affichée.",
        variant: "destructive",
      });
      return;
    }
    void trackEvent("volunteer_availability_saved" as any, {
      metadata: {
        active_role: activeRole,
        structure_types_count: row.structure_types.length,
        skills_count: row.skills.length,
      },
    });
    toast({ title: "Déclaration enregistrée" });
  };

  const availableDepts = useMemo(
    () => Object.keys(DEPT_NAMES).filter((c) => !row.departments.includes(c)),
    [row.departments],
  );

  return (
    <section
      className="mt-8 pt-8 border-t border-border"
      aria-labelledby="volunteer-availability-title"
      data-testid="volunteer-availability-block"
    >
      <h3 id="volunteer-availability-title" className="font-heading text-lg font-semibold">
        Bénévolat en association animalière
      </h3>

      <div className="mt-4 flex items-start gap-3">
        <Checkbox
          id="volunteer-available"
          checked={row.available}
          disabled={loading}
          onCheckedChange={(v) => onToggleAvailable(v === true)}
          className="mt-1"
        />
        <Label htmlFor="volunteer-available" className="text-sm leading-6 cursor-pointer">
          {VOLUNTEER_CHECKBOX_LABEL}
        </Label>
      </div>

      {row.available && (
        <div className="mt-6 space-y-6">
          <div>
            <p id="volunteer-structures-label" className="text-sm font-medium mb-2">
              Le type de structure que j'aimerais aider
            </p>
            <ChipSelect
              options={[...VOLUNTEER_STRUCTURE_TYPES]}
              selected={row.structure_types}
              onChange={(v) => patch({ structure_types: v })}
              ariaLabelledBy="volunteer-structures-label"
            />
          </div>

          <div>
            <p id="volunteer-skills-label" className="text-sm font-medium mb-2">
              Ce que je peux apporter
            </p>
            <ChipSelect
              options={[...VOLUNTEER_SKILLS]}
              selected={row.skills}
              onChange={(v) => patch({ skills: v })}
              ariaLabelledBy="volunteer-skills-label"
            />
          </div>

          <div>
            <p id="volunteer-frequency-label" className="text-sm font-medium mb-2">
              À quel rythme
            </p>
            <RadioChipGroup
              options={[...VOLUNTEER_FREQUENCIES]}
              value={row.frequency ?? ""}
              onChange={(v) => patch({ frequency: v || null })}
              ariaLabelledBy="volunteer-frequency-label"
            />
          </div>

          <div>
            <p id="volunteer-departments-label" className="text-sm font-medium mb-2">
              Mes départements
            </p>
            <div role="group" aria-labelledby="volunteer-departments-label" className="flex flex-wrap gap-2">
              {row.departments.map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() =>
                    patch({ departments: row.departments.filter((d) => d !== code) })
                  }
                  aria-pressed
                  className="inline-flex items-center justify-center min-h-[44px] px-4 py-2 rounded-full text-sm font-medium border bg-primary text-primary-foreground border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  {deptLabel(code)}
                </button>
              ))}
            </div>
            <div className="mt-3 max-w-xs">
              <Select
                value=""
                onValueChange={(code) => patch({ departments: [...row.departments, code] })}
              >
                <SelectTrigger className="min-h-[44px]" aria-label="Ajouter un département">
                  <SelectValue placeholder="Ajouter un département" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {availableDepts.map((code) => (
                    <SelectItem key={code} value={code}>
                      {deptLabel(code)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="max-w-md">
            <Label htmlFor="volunteer-association" className="text-sm font-medium">
              Une association où je suis déjà bénévole
            </Label>
            <Input
              id="volunteer-association"
              className="mt-2 min-h-[44px]"
              value={row.current_association ?? ""}
              onChange={(e) => patch({ current_association: e.target.value || null })}
              placeholder="Nom de l'association"
            />
          </div>
        </div>
      )}

      <p className="mt-6 text-sm text-muted-foreground">{VOLUNTEER_WAITING_SENTENCE}</p>

      <div className="mt-4">
        <Button type="button" onClick={handleSave} disabled={saving || loading || !userId} className="min-h-[44px]">
          {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" aria-hidden="true" />}
          Enregistrer ma déclaration
        </Button>
      </div>
    </section>
  );
};

export default VolunteerAvailabilityBlock;
