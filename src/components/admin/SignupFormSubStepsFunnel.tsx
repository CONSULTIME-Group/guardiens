/**
 * Funnel des sous-étapes du formulaire /inscription sur 30j.
 * Objectif : localiser précisément le drop entre "rôle choisi" et
 * "submit cliqué". Compte les utilisateurs uniques par étape
 * (fallback : nb d'events si user_id NULL, visiteurs anonymes).
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { reportAdminReadError, UNAVAILABLE_LABEL } from "@/lib/admin/readError";
import { Loader2 } from "lucide-react";

const STEPS: { key: string; label: string }[] = [
  { key: "signup_page_loaded", label: "Page chargée" },
  { key: "signup_role_selected", label: "Rôle sélectionné" },
  { key: "signup_email_entered", label: "Email saisi" },
  { key: "signup_password_entered", label: "Mot de passe saisi" },
];

// Lot TRF-3 : « Envoi cliqué » compte des clics (un visiteur reclique après une
// case oubliée ou un mot de passe refusé) : lu à part, hors de l'entonnoir.
const SUBMIT_KEY = "signup_submit_clicked";

export function SignupFormSubStepsFunnel({ days = 30 }: { days?: number } = {}) {
  const since = useMemo(
    () => new Date(Date.now() - days * 24 * 3600 * 1000).toISOString(),
    [days],
  );

  // Lot A10 : agrégat SQL (membres uniques plus événements anonymes), sans plafond.
  const { data: rows = [], isLoading, isError } = useQuery({
    queryKey: ["signup-substeps-funnel", since],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_a10_signup_substeps" as any, { p_since: since });
      if (error) { reportAdminReadError("Sous-étapes d'inscription", error); throw error; }
      return (data ?? []) as unknown as Array<{ event_type: string; n: number }>;
    },
    staleTime: 5 * 60_000,
  });

  const stats = useMemo(
    () => STEPS.map((step) => ({ ...step, count: Number(rows.find((r) => r.event_type === step.key)?.n ?? 0) })),
    [rows],
  );

  const max = stats[0]?.count ?? 0;
  const submitClicks = Number(rows.find((r) => r.event_type === SUBMIT_KEY)?.n ?? 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Sous-étapes du formulaire d'inscription ({days} j)</CardTitle>
        <p className="text-xs text-muted-foreground">
          Visiteurs par étape. La baisse d'une ligne à la suivante montre où le
          formulaire perd des visiteurs. Un compte Google saute l'email et le mot de passe.
        </p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="py-8 flex items-center justify-center text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : isError ? (
          <p className="py-6 text-center text-sm text-destructive">{UNAVAILABLE_LABEL}</p>
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
                        <span className="ml-2 text-muted-foreground/60">·</span>
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
            <p className="pt-2 text-xs text-muted-foreground" data-testid="substeps-submit-clicks">
              {`Clics sur « Envoyer » : ${submitClicks.toLocaleString("fr-FR")}. Ce nombre compte chaque clic, reprises comprises après une case oubliée ou un mot de passe refusé.`}
            </p>
            {stats.every((s) => s.count === 0) && (
              <p className="mt-3 text-xs text-muted-foreground">
                Aucun événement sur cette période.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default SignupFormSubStepsFunnel;
