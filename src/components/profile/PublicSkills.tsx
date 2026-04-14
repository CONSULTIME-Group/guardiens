import { useState, useEffect } from "react";
import { Sprout, PawPrint, GraduationCap, Handshake, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import ProposeHelperExchangeDialog from "@/components/missions/ProposeHelperExchangeDialog";

const SKILL_META: Record<string, { label: string; icon: typeof Sprout }> = {
  jardin: { label: "Jardin", icon: Sprout },
  animaux: { label: "Animaux", icon: PawPrint },
  competences: { label: "Compétences & Savoirs", icon: GraduationCap },
  coups_de_main: { label: "Coups de main", icon: Handshake },
};

interface CustomSkill {
  label: string;
  skill_id: string;
  status: string;
}

interface Props {
  skillCategories: string[];
  userId: string;
  firstName?: string;
  city?: string;
}

const PublicSkills = ({ skillCategories, userId, firstName, city }: Props) => {
  const { user } = useAuth();
  const [approvedCustomSkills, setApprovedCustomSkills] = useState<CustomSkill[]>([]);
  const [specificCompetences, setSpecificCompetences] = useState<string[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    if (!userId) return;

    // Fetch custom_skills from profiles + competences from sitter_profiles in parallel
    Promise.all([
      supabase
        .from("profiles")
        .select("custom_skills")
        .eq("id", userId)
        .single(),
      supabase
        .from("sitter_profiles")
        .select("competences")
        .eq("user_id", userId)
        .maybeSingle(),
    ]).then(([profileRes, sitterRes]) => {
      const skills = (profileRes.data?.custom_skills as unknown as CustomSkill[]) || [];
      setApprovedCustomSkills(skills.filter(s => s.status === "approved"));

      const comps = (sitterRes.data?.competences as string[]) || [];
      setSpecificCompetences(comps);
    });
  }, [userId]);

  const hasCategories = skillCategories && skillCategories.length > 0;
  const hasCustom = approvedCustomSkills.length > 0;
  const hasCompetences = specificCompetences.length > 0;

  if (!hasCategories && !hasCustom && !hasCompetences) return null;

  const isOwnProfile = user?.id === userId;

  const allCompetenceLabels = [
    ...specificCompetences,
    ...approvedCustomSkills.map(s => s.label),
  ];

  return (
    <>
      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6 mt-6">
        <h3 className="text-sm font-heading font-semibold text-primary/80 uppercase tracking-widest mb-3">
          Disponible pour aider
        </h3>
        <div className="flex flex-wrap gap-2">
          {/* Predefined categories */}
          {skillCategories.map(key => {
            const meta = SKILL_META[key];
            if (!meta) return null;
            const Icon = meta.icon;
            return (
              <span
                key={key}
                className="flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 text-primary px-3 py-1 text-sm"
              >
                <Icon className="h-3.5 w-3.5" />
                {meta.label}
              </span>
            );
          })}

          {/* Specific competences from sitter_profiles */}
          {specificCompetences.map(comp => (
            <span
              key={comp}
              className="flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 text-primary px-3 py-1 text-sm"
            >
              <Check className="h-3.5 w-3.5" />
              {comp}
            </span>
          ))}

          {/* Approved custom skills */}
          {approvedCustomSkills.map(skill => (
            <span
              key={skill.skill_id}
              className="flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 text-primary px-3 py-1 text-sm"
            >
              <Check className="h-3.5 w-3.5" />
              {skill.label}
            </span>
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
            custom_skills: approvedCustomSkills.map(s => s.label),
          }}
        />
      )}
    </>
  );
};

export default PublicSkills;
