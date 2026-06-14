import { useState, useEffect, useMemo } from "react";
import { Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import ProposeHelperExchangeDialog from "@/components/missions/ProposeHelperExchangeDialog";
import {
  SKILL_CATEGORIES,
  groupByCategory,
  type SkillCategoryKey,
} from "@/lib/skills/categories";

interface CustomSkill {
  label: string;
  skill_id: string;
  status: string;
}

interface Props {
  skillCategories: string[]; // legacy, conservé pour compat de signature
  userId: string;
  firstName?: string;
  city?: string;
}

/**
 * Mécanique 2026 : on n'affiche QUE les compétences spécifiques,
 * regroupées par catégorie dérivée. Les 4 chips génériques ont
 * disparu : elles n'apportaient aucune information différenciante.
 */
const PublicSkills = ({ userId, firstName, city }: Props) => {
  const { user } = useAuth();
  const [approvedCustomSkills, setApprovedCustomSkills] = useState<CustomSkill[]>([]);
  const [specificCompetences, setSpecificCompetences] = useState<string[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    if (!userId) return;
    Promise.all([
      supabase.from("profiles").select("custom_skills").eq("id", userId).single(),
      supabase
        .from("sitter_profiles")
        .select("competences")
        .eq("user_id", userId)
        .maybeSingle(),
    ]).then(([profileRes, sitterRes]) => {
      const skills = (profileRes.data?.custom_skills as unknown as CustomSkill[]) || [];
      setApprovedCustomSkills(skills.filter((s) => s.status === "approved"));
      const comps = (sitterRes.data?.competences as string[]) || [];
      setSpecificCompetences(comps);
    });
  }, [userId]);

  const allLabels = useMemo(
    () => [...specificCompetences, ...approvedCustomSkills.map((s) => s.label)],
    [specificCompetences, approvedCustomSkills],
  );

  const grouped = useMemo(() => groupByCategory(allLabels), [allLabels]);

  if (allLabels.length === 0) return null;

  const isOwnProfile = user?.id === userId;
  const visibleCategories = SKILL_CATEGORIES.filter(
    (c) => grouped[c.key as SkillCategoryKey].length > 0,
  );

  return (
    <>
      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6 mt-6">
        <h3 className="text-sm font-heading font-semibold text-primary/80 uppercase tracking-widest mb-4">
          Disponible pour aider
        </h3>

        <div className="space-y-4">
          {visibleCategories.map((cat) => (
            <div key={cat.key}>
              <p className="text-xs font-semibold text-foreground/70 mb-1.5">
                {cat.label}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {grouped[cat.key as SkillCategoryKey].map((label) => (
                  <span
                    key={label}
                    className="flex items-center gap-1 rounded-full border border-primary/20 bg-card text-foreground px-3 py-1 text-sm"
                  >
                    <Check className="h-3 w-3 text-primary" aria-hidden="true" />
                    {label}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        {!isOwnProfile && user && (
          <Button
            variant="link"
            className="px-0 mt-4 text-sm text-primary font-semibold underline underline-offset-4 h-auto"
            onClick={() => setDialogOpen(true)}
          >
            Lui proposer un échange
          </Button>
        )}
      </div>

      {!isOwnProfile && user && (
        <ProposeHelperExchangeDialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          helper={{
            id: userId,
            first_name: firstName || "Ce membre",
            city: city,
            competences: specificCompetences,
            custom_skills: approvedCustomSkills.map((s) => s.label),
          }}
        />
      )}
    </>
  );
};

export default PublicSkills;
