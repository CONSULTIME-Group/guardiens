import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Handshake, Sprout, PawPrint, GraduationCap, ChevronRight,
  X, Sparkles, ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const SKILL_TO_MISSION: Record<string, string> = {
  animaux: "animals",
  jardin: "garden",
  competences: "skills",
  coups_de_main: "coups_de_main",
};

const CATEGORY_META: Record<string, { label: string; icon: typeof Sprout; colorClass: string; badgeType: string }> = {
  animals: { label: "Animaux", icon: PawPrint, colorClass: "text-orange-500", badgeType: "Besoin" },
  garden: { label: "Jardin", icon: Sprout, colorClass: "text-green-600", badgeType: "Besoin" },
  house: { label: "Coups de main", icon: Handshake, colorClass: "text-blue-500", badgeType: "Besoin" },
  skills: { label: "Compétences", icon: GraduationCap, colorClass: "text-amber-600", badgeType: "Besoin" },
};

const MissionsNearbySection = () => {
  const { user } = useAuth();
  const [missions, setMissions] = useState<any[]>([]);
  const [mySkills, setMySkills] = useState<string[]>([]);
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem("guardiens_dash_skill_prompt_dismissed") === "true"; } catch { return false; }
  });

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [profileRes, missionsRes] = await Promise.all([
        supabase.from("profiles").select("skill_categories").eq("id", user.id).single(),
        supabase
          .from("small_missions")
          .select("id, title, category, city, created_at, mission_type")
          .eq("status", "open")
          .order("created_at", { ascending: false })
          .limit(10),
      ]);

      const skills: string[] = (profileRes.data as any)?.skill_categories || [];
      setMySkills(skills);

      let items = (missionsRes.data || []).filter((m: any) => m.user_id !== user.id);

      // Sort by skill match
      if (skills.length > 0) {
        const skillMissionCats = skills.map(s => SKILL_TO_MISSION[s]).filter(Boolean);
        items.sort((a: any, b: any) => {
          const aMatch = skillMissionCats.includes(a.category) ? 0 : 1;
          const bMatch = skillMissionCats.includes(b.category) ? 0 : 1;
          if (aMatch !== bMatch) return aMatch - bMatch;
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
      }

      setMissions(items.slice(0, 3));
    };
    load();
  }, [user]);

  const dismissPrompt = () => {
    setDismissed(true);
    try { localStorage.setItem("guardiens_dash_skill_prompt_dismissed", "true"); } catch {}
  };

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-1">
        <h2 className="font-heading text-xl font-semibold">Échanges autour de vous</h2>
        <Link to="/petites-missions" className="text-xs text-primary hover:underline font-medium">
          Voir toutes les missions →
        </Link>
      </div>
      <p className="text-sm text-foreground/60 mt-1 mb-4">
       {mySkills.length > 0
          ? "Les échanges près de chez vous — en priorité ceux qui correspondent à vos compétences."
          : "Des gens du coin qui cherchent de l'aide, d'autres qui proposent la leur."}
      </p>

      {/* Two action buttons */}
      <div className="flex gap-3 mb-4">
        <Link to="/petites-missions/creer?type=besoin" className="flex-1">
          <Button className="w-full rounded-full text-sm font-semibold gap-1.5" size="sm">
            Publier un besoin <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </Link>
        <Link to="/petites-missions/creer?type=offre" className="flex-1">
          <Button variant="outline" className="w-full rounded-full text-sm font-semibold border-primary text-primary gap-1.5" size="sm">
            Proposer mon aide <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </Link>
      </div>

      {/* Mission cards */}
      {missions.length > 0 ? (
        <div className="space-y-2">
          {missions.map((m: any) => {
            const meta = CATEGORY_META[m.category] || CATEGORY_META.animals;
            const Icon = meta.icon;
            const isBesoin = m.mission_type !== "offre";
            return (
              <Link
                key={m.id}
                to={`/petites-missions/${m.id}`}
                className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:bg-accent/50 transition-colors"
              >
                <Icon className={`h-5 w-5 ${meta.colorClass} shrink-0`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      isBesoin ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
                    }`}>
                      {isBesoin ? "Besoin" : "Offre"}
                    </span>
                    <p className="text-sm font-heading font-semibold truncate">{m.title}</p>
                  </div>
                  <p className="text-xs text-foreground/50 mt-0.5">
                    {m.city && `${m.city} · `}{meta.label}
                  </p>
                </div>
                <span className="text-xs text-primary font-semibold shrink-0">Voir →</span>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="p-6 rounded-xl border border-dashed border-border bg-accent/30 text-center">
          <Handshake className="h-8 w-8 text-primary/40 mx-auto mb-2" />
           <p className="text-sm text-foreground/80">Pas encore d'échange dans votre zone</p>
           <p className="text-xs text-muted-foreground mt-1">Publiez un besoin ou proposez votre aide</p>
        </div>
      )}

      {/* Skill incentive prompt */}
      {mySkills.length === 0 && !dismissed && (
        <div className="bg-muted rounded-xl p-4 flex items-start gap-3 mt-4">
          <Sparkles className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div className="flex-1">
             <p className="text-sm text-foreground font-medium">
               Déclarez vos compétences pour voir en priorité les échanges qui vous correspondent.
             </p>
            <Link to="/profile#competences" className="text-sm text-primary font-semibold mt-1 inline-block">
              Ajouter mes compétences →
            </Link>
          </div>
          <button onClick={dismissPrompt} className="text-muted-foreground hover:text-foreground shrink-0">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
};

export default MissionsNearbySection;
