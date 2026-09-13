/**
 * Entonnoir de découvrabilité du fil d'Alma (N6).
 *
 * Cinq étapes lues dans `analytics_events` : panneau ouvert, composeur vu,
 * champ focalisé, premier caractère, message envoyé. Le taux affiché est
 * toujours relatif à la première étape.
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const ALMA_FUNNEL_STEPS: { event: string; label: string }[] = [
  { event: "alma_dock_expanded", label: "Panneau ouvert" },
  { event: "alma_composer_seen", label: "Composeur vu" },
  { event: "alma_prompt_suggestion_clicked", label: "Amorce cliquée" },
  { event: "alma_composer_focused", label: "Champ focalisé" },
  { event: "alma_composer_typed", label: "Premier caractère" },
  { event: "alma_conversation_message_sent", label: "Message envoyé" },
];


export function DiscoveryFunnelCard({ since }: { since: string }) {
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin-alma-funnel", since],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("analytics_events")
        .select("event_type")
        .in(
          "event_type",
          ALMA_FUNNEL_STEPS.map((s) => s.event),
        )
        .gte("created_at", since)
        .limit(20000);
      if (error) throw error;
      return (data ?? []) as Array<{ event_type: string }>;
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of rows) m.set(r.event_type, (m.get(r.event_type) ?? 0) + 1);
    return m;
  }, [rows]);

  const base = counts.get(ALMA_FUNNEL_STEPS[0].event) ?? 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Entonnoir de la conversation</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading && <p className="text-sm text-muted-foreground">Lecture des mesures.</p>}
        {!isLoading &&
          ALMA_FUNNEL_STEPS.map((step) => {
            const n = counts.get(step.event) ?? 0;
            const share = base > 0 ? Math.round((n / base) * 100) : 0;
            return (
              <div key={step.event} className="space-y-1">
                <div className="flex items-baseline justify-between text-sm">
                  <span className="text-foreground">{step.label}</span>
                  <span className="text-muted-foreground">
                    {n} ({share} %)
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted">
                  <div
                    className="h-2 rounded-full bg-primary"
                    style={{ width: `${share}%` }}
                    aria-hidden
                  />
                </div>
              </div>
            );
          })}
      </CardContent>
    </Card>
  );
}

export default DiscoveryFunnelCard;
