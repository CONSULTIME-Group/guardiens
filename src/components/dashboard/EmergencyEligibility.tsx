import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Zap, CheckCircle2, XCircle } from "lucide-react";
import { Link } from "react-router-dom";

const EmergencyEligibility = () => {
  const { user } = useAuth();
  const [checks, setChecks] = useState<{
    completedSits: number;
    avgRating: number;
    recentCancellations: number;
    identityVerified: boolean;
  } | null>(null);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const [appsRes, reviewsRes, profileRes, cancellationsRes] = await Promise.all([
        supabase.from("applications").select("id, sit:sits!inner(status)").eq("sitter_id", user.id).eq("status", "accepted"),
        supabase.from("reviews").select("overall_rating").eq("reviewee_id", user.id).eq("published", true),
        supabase.from("profiles").select("identity_verified").eq("id", user.id).single(),
        // Count cancellations in last 6 months only
        supabase.from("sits")
          .select("id")
          .eq("cancelled_by", user.id)
          .gte("cancelled_at", sixMonthsAgo.toISOString()),
      ]);
      const completedSits = (appsRes.data || []).filter((a: any) => a.sit?.status === "completed").length;
      const reviews = reviewsRes.data || [];
      const avgRating = reviews.length > 0 ? reviews.reduce((s: number, r: any) => s + r.overall_rating, 0) / reviews.length : 0;
      setChecks({
        completedSits,
        avgRating: Math.round(avgRating * 10) / 10,
        recentCancellations: cancellationsRes.data?.length || 0,
        identityVerified: profileRes.data?.identity_verified || false,
      });
    };
    load();
  }, [user]);

  if (!checks) return null;

  const items = [
    { label: `Gardes : ${checks.completedSits}/3`, ok: checks.completedSits >= 3 },
    { label: `Note : ${checks.avgRating || "—"}/4.7`, ok: checks.avgRating >= 4.7 },
    { label: `Annulations (6 mois) : ${checks.recentCancellations}`, ok: checks.recentCancellations === 0 },
    { label: "ID vérifiée", ok: checks.identityVerified },
  ];

  const doneCount = items.filter(i => i.ok).length;
  const remaining = Math.max(0, 3 - checks.completedSits);

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-3">
      <div className="flex items-center gap-2.5">
        <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-muted">
          <Zap className="h-4 w-4 text-amber-500" />
        </span>
        <div>
          <p className="font-heading font-semibold text-sm">Gardien d'urgence</p>
          <p className="text-xs text-muted-foreground">Le plus haut niveau de confiance sur Guardiens</p>
        </div>
      </div>

      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            {item.ok ? (
              <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
            ) : (
              <XCircle className="h-4 w-4 text-red-400 shrink-0" />
            )}
            <span className={item.ok ? "text-foreground" : "text-muted-foreground"}>{item.label}</span>
          </div>
        ))}
      </div>

      {remaining > 0 && (
        <p className="text-xs text-muted-foreground">
          Encore {remaining} garde{remaining > 1 ? "s" : ""} pour débloquer le statut !
        </p>
      )}

      <Link to="/gardien-urgence" className="text-xs text-primary hover:underline inline-block">
        En savoir plus →
      </Link>
    </div>
  );
};

export default EmergencyEligibility;
