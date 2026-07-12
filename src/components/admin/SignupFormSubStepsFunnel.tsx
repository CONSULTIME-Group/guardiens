/**
 * Funnel des sous-étapes du formulaire /inscription sur 30j.
 * Objectif : localiser précisément le drop entre "rôle choisi" et
 * "submit cliqué". Compte les utilisateurs uniques par étape
 * (fallback : nb d'events si user_id NULL — visiteurs anonymes).
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

const STEPS: { key: string; label: string }[] = [
  { key: "signup_page_loaded", label: "Page chargée" },
  { key: "signup_role_selected", label: "Rôle sélectionné" },
  { key: "signup_email_entered", label: "Email saisi" },
  { key: "signup_password_entered", label: "Mot de passe saisi" },
  { key: "signup_submit_clicked", label: "Submit cliqué" },
];

export function SignupFormSubStepsFunnel() {
  const since = useMemo(
    () => new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(),
    [],
  );

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["signup-substeps-funnel", since],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("analytics_events")
        .select("event_type, user_id, source, created_at")
        .in("event_type", STEPS.map((s) => s.key))
        .gte("created_at", since)
        .limit(50000);
      if (error) throw error;
      return (data ?? []) as Array<{
        event_type: string;
        user_id: string | null;
        source: string | null;
        created_at: string;
      }>;
    },
    staleTime: 5 * 60_000,
  });

  const stats = useMemo(() => {
    return STEPS.map((step) => {
      const scoped = rows.filter((r) => r.event_type === step.key);
      // Compte utilisateurs uniques (auth) + events anonymes (visiteurs sans user_id)
      const users = new Set<string>();
      let anonymous = 0;
      for (const r of scoped) {
        if (r.user_id) users.add(r.user_id);
        else anonymous++;
      }
      return { ...step, count: users.size + anonymous };
    });
  }, [rows]);

  const max = stats[0]?.count ?? 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Sous-étapes formulaire /inscription (30j)</CardTitle>
        <p className="text-xs text-muted-foreground">
          Utilisateurs uniques par étape. Le drop d'une ligne à la suivante indique
          où l'on perd le prospect dans le formulaire.
        </p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="py-8 flex items-center justify-center text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : (
          <div className="space-y-2">
            {stats.map((s, i) => {
              const prev = i > 0 ? stats[i - 1].count : null;
              const dropPct =
                prev && prev > 0 ? Math.round(((prev - s.count) / prev) * 100) : null;
              const widthPct = max > 0 ? Math.max(4, (s.count / max) * 100) : 0;
              return (
                <div key={s.key} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-foreground">{s.label}</span>
                    <span className="tabular-nums text-muted-foreground">
                      {s.count.toLocaleString("fr-FR")}
                      {dropPct !== null && dropPct > 0 && (
                        <span className="ml-2 text-destructive">-{dropPct}%</span>
                      )}
                      {dropPct !== null && dropPct <= 0 && (
                        <span className="ml-2 text-muted-foreground/60">–</span>
                      )}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {stats.every((s) => s.count === 0) && (
              <p className="mt-3 text-xs text-muted-foreground">
                Aucun événement sur cette période. Vérifiez que les 5 events
                (`signup_page_loaded`, `signup_role_selected`, `signup_email_entered`,
                `signup_password_entered`, `signup_submit_clicked`) sont bien déployés.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default SignupFormSubStepsFunnel;
