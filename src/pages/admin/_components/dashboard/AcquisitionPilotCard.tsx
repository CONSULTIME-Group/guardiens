import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface AcquisitionStats {
  cityPages: number;
  departmentPages: number;
  breedProfiles: number;
  articles: number;
  indexnow24h: number;
  indexnow7d: number;
  activeJourneys: number;
  journeySent24h: number;
  journeyExited24h: number;
}

export const AcquisitionPilotCard = () => {
  const [stats, setStats] = useState<AcquisitionStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const since24h = new Date(Date.now() - 24 * 3600_000).toISOString();
        const since7d = new Date(Date.now() - 7 * 86400_000).toISOString();

        const [city, dept, breed, art, idx24, idx7, journeys, sent24, exit24] = await Promise.all([
          supabase.from("seo_city_pages").select("*", { count: "exact", head: true }),
          supabase.from("seo_department_pages").select("*", { count: "exact", head: true }),
          supabase.from("breed_profiles").select("*", { count: "exact", head: true }),
          supabase.from("articles").select("*", { count: "exact", head: true }).eq("status", "published"),
          supabase.from("indexnow_submissions").select("*", { count: "exact", head: true }).gte("created_at", since24h),
          supabase.from("indexnow_submissions").select("*", { count: "exact", head: true }).gte("created_at", since7d),
          supabase.from("user_journeys").select("*", { count: "exact", head: true }).eq("status", "active"),
          supabase.from("journey_step_log").select("*", { count: "exact", head: true }).eq("sent", true).gte("created_at", since24h),
          supabase.from("journey_step_log").select("*", { count: "exact", head: true }).eq("reason", "exit_condition_met").gte("created_at", since24h),
        ]);

        if (!mounted) return;
        setStats({
          cityPages: city.count ?? 0,
          departmentPages: dept.count ?? 0,
          breedProfiles: breed.count ?? 0,
          articles: art.count ?? 0,
          indexnow24h: idx24.count ?? 0,
          indexnow7d: idx7.count ?? 0,
          activeJourneys: journeys.count ?? 0,
          journeySent24h: sent24.count ?? 0,
          journeyExited24h: exit24.count ?? 0,
        });
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <div>
          <CardTitle>Pilotage acquisition</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            SEO programmatique, soumissions automatiques et cycles de vie email.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm"><Link to="/admin/seo">SEO</Link></Button>
          <Button asChild variant="outline" size="sm"><Link to="/admin/nurturing">Cycles de vie</Link></Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading || !stats ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {Array.from({ length: 9 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            <Stat label="Pages ville" value={stats.cityPages} hint="/ 150 cibles" />
            <Stat label="Pages dépt." value={stats.departmentPages} hint="/ 96 cibles" />
            <Stat label="Fiches race" value={stats.breedProfiles} hint="/ 60 cibles" />
            <Stat label="Articles publiés" value={stats.articles} />
            <Stat label="Soumissions IndexNow 24h" value={stats.indexnow24h} hint={`${stats.indexnow7d} sur 7 j.`} />
            <Stat label="Parcours actifs" value={stats.activeJourneys} hint="cycles de vie" />
            <Stat label="Emails envoyés 24h" value={stats.journeySent24h} hint="séquences auto" />
            <Stat label="Sorties objectif 24h" value={stats.journeyExited24h} hint="objectif atteint" />
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const Stat = ({ label, value, hint }: { label: string; value: number; hint?: string }) => (
  <div className="rounded-lg border bg-card p-3">
    <p className="text-xs text-muted-foreground leading-tight">{label}</p>
    <p className="text-2xl font-semibold mt-1">{value.toLocaleString("fr-FR")}</p>
    {hint && <p className="text-[11px] text-muted-foreground mt-1">{hint}</p>}
  </div>
);
