import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { Star } from "lucide-react";

interface SitterRow {
  id: string;
  first_name: string | null;
  avatar_url: string | null;
  city: string | null;
  avgRating: string | null;
  skills: string[];
}

/**
 * Carte sidebar compacte « Gardiens d'urgence à proximité ».
 * Design optimisé pour colonne droite : header coloré urgence, lignes denses,
 * pas d'icônes décoratives dans le contenu (uniquement Star fonctionnelle pour la note).
 */
const NearbyEmergencySitters = ({ hideHeader = false }: { hideHeader?: boolean } = {}) => {
  const { user } = useAuth();
  const [sitters, setSitters] = useState<SitterRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data: emergencyProfiles } = await supabase
        .from("emergency_sitter_profiles")
        .select("user_id, radius_km, animal_types")
        .eq("is_active", true)
        .limit(10);

      if (!emergencyProfiles || emergencyProfiles.length === 0) {
        setLoading(false);
        return;
      }

      const userIds = emergencyProfiles.map(e => e.user_id).filter(id => id !== user.id);
      if (userIds.length === 0) {
        setLoading(false);
        return;
      }

      const [profilesRes, reviewsRes, sitterRes] = await Promise.all([
        supabase.from("profiles").select("id, first_name, avatar_url, city, custom_skills").in("id", userIds),
        supabase.from("reviews").select("reviewee_id, overall_rating").in("reviewee_id", userIds).eq("published", true),
        supabase.from("sitter_profiles").select("user_id, competences").in("user_id", userIds),
      ]);

      const ratingMap = new Map<string, number[]>();
      (reviewsRes.data || []).forEach((r: any) => {
        if (!ratingMap.has(r.reviewee_id)) ratingMap.set(r.reviewee_id, []);
        ratingMap.get(r.reviewee_id)!.push(r.overall_rating);
      });

      const skillsMap = new Map<string, string[]>();
      (sitterRes.data || []).forEach((s: any) => {
        if (Array.isArray(s.competences)) {
          skillsMap.set(
            s.user_id,
            s.competences.filter((c: any) => typeof c === "string" && c.trim().length > 0),
          );
        }
      });

      const normalizeCustom = (raw: any): string[] => {
        if (!raw) return [];
        const arr = Array.isArray(raw) ? raw : [raw];
        return arr
          .flatMap((s: any) =>
            typeof s === "string"
              ? s.split(/[,;·•|/]+/).map((x) => x.trim())
              : [],
          )
          .filter((x) => x.length > 0 && x.length < 40);
      };

      const enriched: SitterRow[] = (profilesRes.data || []).slice(0, 3).map((p: any) => {
        const ratings = ratingMap.get(p.id) || [];
        const avg = ratings.length > 0 ? (ratings.reduce((s, v) => s + v, 0) / ratings.length).toFixed(1) : null;
        const sitterSkills = skillsMap.get(p.id) || [];
        const profileSkills = normalizeCustom(p.custom_skills);
        const skills = Array.from(new Set([...sitterSkills, ...profileSkills])).slice(0, 3);
        return { id: p.id, first_name: p.first_name, avatar_url: p.avatar_url, city: p.city, avgRating: avg, skills };
      });

      setSitters(enriched);
      setLoading(false);
    };
    load();
  }, [user]);

  if (loading || sitters.length === 0) return null;

  return (
    <section
      className="rounded-2xl border border-border bg-card overflow-hidden animate-fade-in"
      aria-label="Gardiens d'urgence à proximité"
    >
      {!hideHeader && (
        <header className="px-4 py-3 bg-gradient-to-r from-destructive/8 via-destructive/5 to-transparent border-b border-border">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[2px] text-destructive font-sans font-semibold">
                Urgence
              </p>
              <h2 className="font-heading text-sm font-bold text-foreground leading-tight mt-0.5">
                Gardiens disponibles rapidement
              </h2>
            </div>
          </div>
        </header>
      )}

      {/* Liste dense */}
      <ul className="divide-y divide-border">
        {sitters.map((s) => (
          <li key={s.id}>
            <Link
              to={`/gardiens/${s.id}`}
              className="flex items-center gap-3 px-4 py-2.5 hover:bg-accent/40 transition-colors focus-visible:outline-none focus-visible:bg-accent/40"
            >
              {s.avatar_url ? (
                <img
                  src={s.avatar_url}
                  alt=""
                  className="w-10 h-10 rounded-full object-cover shrink-0 ring-1 ring-border"
                  loading="lazy"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-bold shrink-0">
                  {s.first_name?.charAt(0) || "?"}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">
                  {s.first_name || "Gardien"}
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                  {s.city && <span className="truncate">{s.city}</span>}
                  {s.city && s.avgRating && <span aria-hidden="true">·</span>}
                  {s.avgRating && (
                    <span className="flex items-center gap-0.5 shrink-0">
                      <Star className="h-3 w-3 text-amber-500 fill-amber-500" aria-hidden="true" />
                      <span className="tabular-nums">{s.avgRating}</span>
                    </span>
                  )}
                </div>
                {s.skills.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {s.skills.map((skill) => (
                      <span
                        key={skill}
                        className="inline-flex items-center rounded-full bg-accent/30 text-accent-foreground px-2 py-0.5 text-[10px] font-medium"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </Link>
          </li>
        ))}
      </ul>

      {/* Footer CTA */}
      <Link
        to="/search?emergency=true"
        className="block px-4 py-2.5 text-xs text-center text-primary font-semibold hover:bg-accent/30 border-t border-border transition-colors"
      >
        Voir tous les gardiens d'urgence →
      </Link>
    </section>
  );
};

export default NearbyEmergencySitters;
