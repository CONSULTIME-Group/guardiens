/**
 * Entonnoir de découvrabilité du fil d'Alma (N6).
 *
 * Étapes lues dans `analytics_events` par admin_a3_alma_funnel_counts :
 * panneau ouvert (volontaire ou automatique), composeur vu, amorce cliquée,
 * champ focalisé, premier caractère, message envoyé, lien suivi. Le taux
 * affiché est toujours relatif à la première étape.
 *
 * Lot A3 : membres connectés seulement, équipe exclue (les lignes anonymes
 * venaient des tests du dépôt), ouverture volontaire séparée de l'ouverture
 * automatique déclenchée par un chuchotement.
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { reportAdminReadError, UNAVAILABLE_LABEL } from "@/lib/admin/readError";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const ALMA_FUNNEL_RPC = "admin_a3_alma_funnel_counts";

export const ALMA_FUNNEL_STEPS: { event: string; label: string }[] = [
  { event: "alma_dock_expanded", label: "Panneau ouvert" },
  { event: "alma_composer_seen", label: "Composeur vu" },
  { event: "alma_prompt_suggestion_clicked", label: "Amorce cliquée" },
  { event: "alma_composer_focused", label: "Champ focalisé" },
  { event: "alma_composer_typed", label: "Premier caractère" },
  { event: "alma_conversation_message_sent", label: "Message envoyé" },
  { event: "alma_action_clicked", label: "Lien suivi depuis la conversation" },
];

/** Détail de la première étape : qui a ouvert le panneau. */
export const ALMA_OPENING_KINDS: { step: string; label: string }[] = [
  { step: "opened_voluntary", label: "Ouvert par le membre" },
  { step: "opened_automatic", label: "Ouvert automatiquement" },
];

export interface AlmaFunnelRow {
  step: string;
  n: number;
  members: number;
}

export interface AlmaFunnelLine {
  key: string;
  label: string;
  n: number;
  members: number;
  share: number;
  detail: boolean;
}

/** Lignes affichées, la base étant le total des ouvertures du panneau. */
export function buildAlmaFunnel(rows: AlmaFunnelRow[]): { base: number; lines: AlmaFunnelLine[] } {
  const byStep = new Map<string, { n: number; members: number }>();
  for (const r of rows) byStep.set(r.step, { n: Number(r.n) || 0, members: Number(r.members) || 0 });
  const get = (k: string) => byStep.get(k) ?? { n: 0, members: 0 };
  const openings = ALMA_OPENING_KINDS.map((k) => ({ ...k, ...get(k.step) }));
  const base = openings.reduce((sum, o) => sum + o.n, 0);
  const share = (n: number) => (base > 0 ? Math.round((n / base) * 100) : 0);
  const lines: AlmaFunnelLine[] = [];
  for (const s of ALMA_FUNNEL_STEPS) {
    if (s.event === "alma_dock_expanded") {
      lines.push({
        key: s.event,
        label: s.label,
        n: base,
        // Membres distincts toutes ouvertures confondues (ligne dédiée en SQL).
        members: get(s.event).members,
        share: base > 0 ? 100 : 0,
        detail: false,
      });
      for (const o of openings) {
        lines.push({ key: o.step, label: o.label, n: o.n, members: o.members, share: share(o.n), detail: true });
      }
      continue;
    }
    const v = get(s.event);
    lines.push({ key: s.event, label: s.label, n: v.n, members: v.members, share: share(v.n), detail: false });
  }
  return { base, lines };
}

export function DiscoveryFunnelCard({ since }: { since: string }) {
  const { data: rows = [], isLoading, isError } = useQuery({
    queryKey: ["admin-alma-funnel-a3", since],
    queryFn: async () => {
      const { data, error } = await supabase.rpc(ALMA_FUNNEL_RPC as any, { p_since: since });
      if (error) { reportAdminReadError("Alma : entonnoir", error); throw error; }
      return (data ?? []) as unknown as AlmaFunnelRow[];
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const funnel = useMemo(() => buildAlmaFunnel(rows), [rows]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Entonnoir de la conversation</CardTitle>
        <p className="text-xs text-muted-foreground">Membres connectés, équipe exclue.</p>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading && <p className="text-sm text-muted-foreground">Lecture des mesures.</p>}
        {isError && <p className="text-sm text-destructive">{UNAVAILABLE_LABEL}</p>}
        {!isLoading && !isError &&
          funnel.lines.map((line) => (
            <div key={line.key} className={line.detail ? "space-y-1 pl-4" : "space-y-1"} data-testid={`alma-funnel-${line.key}`}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className={line.detail ? "text-muted-foreground" : "text-foreground"}>{line.label}</span>
                <span className="shrink-0 text-muted-foreground">
                  {line.n} ({line.share} %), {line.members} {line.members > 1 ? "membres" : "membre"}
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted">
                <div
                  className={line.detail ? "h-2 rounded-full bg-primary/50" : "h-2 rounded-full bg-primary"}
                  style={{ width: `${Math.min(100, line.share)}%` }}
                  aria-hidden
                />
              </div>
            </div>
          ))}
      </CardContent>
    </Card>
  );
}

export default DiscoveryFunnelCard;
