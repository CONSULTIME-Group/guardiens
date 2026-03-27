import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { Zap, Star, MapPin } from "lucide-react";
import EmergencyBadge from "@/components/profile/EmergencyBadge";

const NearbyEmergencySitters = () => {
  const { user } = useAuth();
  const [sitters, setSitters] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data: emergencyProfiles } = await supabase
        .from("emergency_sitter_profiles")
        .select("user_id, radius_km, animal_types")
        .eq("is_active", true)
        .limit(10);

      if (!emergencyProfiles || emergencyProfiles.length === 0) return;

      const userIds = emergencyProfiles.map(e => e.user_id).filter(id => id !== user.id);
      if (userIds.length === 0) return;

      const [profilesRes, reviewsRes] = await Promise.all([
        supabase.from("profiles").select("id, first_name, avatar_url, city").in("id", userIds),
        supabase.from("reviews").select("reviewee_id, overall_rating").in("reviewee_id", userIds).eq("published", true),
      ]);

      const ratingMap = new Map<string, number[]>();
      (reviewsRes.data || []).forEach((r: any) => {
        if (!ratingMap.has(r.reviewee_id)) ratingMap.set(r.reviewee_id, []);
        ratingMap.get(r.reviewee_id)!.push(r.overall_rating);
      });

      const enriched = (profilesRes.data || []).slice(0, 3).map((p: any) => {
        const ratings = ratingMap.get(p.id) || [];
        const avg = ratings.length > 0 ? (ratings.reduce((s, v) => s + v, 0) / ratings.length).toFixed(1) : null;
        return { ...p, avgRating: avg };
      });

      setSitters(enriched);
    };
    load();
  }, [user]);

  if (sitters.length === 0) return null;

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-body text-base font-semibold">Gardiens d'urgence à proximité</h2>
        <Link to="/search?emergency=true" className="text-xs text-primary hover:underline font-medium">Voir tous →</Link>
      </div>
      <p className="text-xs text-muted-foreground mb-3">Disponibles rapidement en cas d'imprévu</p>
      <div className="space-y-2">
        {sitters.map((s: any) => (
          <Link key={s.id} to={`/profil/${s.id}`} className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:bg-accent/50 transition-colors">
            {s.avatar_url ? (
              <img src={s.avatar_url} alt="" className="w-12 h-12 rounded-full object-cover shrink-0" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-sm font-bold shrink-0">
                {s.first_name?.charAt(0) || "?"}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-medium">{s.first_name}</p>
                <EmergencyBadge size="sm" />
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                {s.city && <span className="flex items-center gap-0.5"><MapPin className="h-3 w-3" />{s.city}</span>}
                {s.avgRating && <span className="flex items-center gap-0.5"><Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />{s.avgRating}</span>}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default NearbyEmergencySitters;
