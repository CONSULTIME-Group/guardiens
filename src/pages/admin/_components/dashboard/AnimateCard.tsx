import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { UNAVAILABLE_LABEL, reportAdminReadError } from "@/lib/admin/readError";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SIGNAL_TYPES, ANIMATE_TYPES } from "../../../../../supabase/functions/_shared/admin-signal-config.ts";

/** Lien vers la liste de chaque type à animer. */
export const ANIMATE_LINKS: Record<string, string> = {
  dormant_sitter: "/admin/users",
  affinity_onboarding_stale: "/admin/affinity",
};

/**
 * Lot S2 : carte « À animer », hors file d'actions. Les détecteurs et leurs
 * relances automatiques continuent de tourner ; ici, deux compteurs exacts.
 */
export const AnimateCard = () => {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin_animate_counts"],
    queryFn: async () => {
      const out: Record<string, number> = {};
      for (const t of ANIMATE_TYPES) {
        const { count, error } = await supabase
          .from("admin_signals")
          .select("id", { count: "exact", head: true })
          .eq("signal_type", t)
          .is("resolved_at", null);
        if (error) { reportAdminReadError("À animer", error); throw error; }
        out[t] = count ?? 0;
      }
      return out;
    },
    staleTime: 60_000,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-heading">À animer</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="grid gap-3 sm:grid-cols-2">
          {ANIMATE_TYPES.map((t) => (
            <li key={t} className="rounded-lg border border-border p-3" data-testid={`animate-${t}`}>
              <p className="text-2xl font-heading text-foreground">{isError ? <span className="text-base text-destructive">{UNAVAILABLE_LABEL}</span> : isLoading ? "…" : data?.[t] ?? 0}</p>
              <p className="text-sm text-muted-foreground">{SIGNAL_TYPES[t].label}</p>
              <Link to={ANIMATE_LINKS[t] ?? "/admin"} className="text-sm text-primary underline-offset-4 hover:underline">
                Voir la liste
              </Link>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
};
