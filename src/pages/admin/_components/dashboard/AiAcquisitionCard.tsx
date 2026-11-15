import { adminLabel } from "@/lib/admin/labels";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";

interface AiStats {
  total: number;
  byEngine: { engine: string; count: number }[];
  identifiedUsers: number;
  signups: number;
  conversionRate: number;
}

const ENGINE_LABELS: Record<string, string> = {
  chatgpt: "ChatGPT",
  perplexity: "Perplexity",
  gemini: "Gemini",
  copilot: "Copilot",
  claude: "Claude",
  mistral: "Mistral",
  iask: "iAsk",
  phind: "Phind",
  poe: "Poe",
  huggingface: "Hugging Face",
  writesonic: "Writesonic",
  other: "Autre IA",
};

export const AiAcquisitionCard = () => {
  const [stats, setStats] = useState<AiStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const since = new Date(Date.now() - 30 * 86400_000).toISOString();

        // Lot TRF1 (P4) : la tuile Facebook quitte cette carte, elle doublait
        // « Arrivées depuis Facebook » sur une autre période.
        const ai = await supabase
          .from("analytics_events")
          .select("user_id, metadata, created_at")
          .eq("event_type", "ai_referral_landing")
          .gte("created_at", since);

        const rows = ai.data ?? [];
        const counts = new Map<string, number>();
        const users = new Set<string>();
        let total = 0;
        for (const r of rows) {
          const meta = (r.metadata ?? {}) as Record<string, unknown>;
          if (meta.attribution === "identified") {
            if (r.user_id) users.add(r.user_id);
            continue;
          }
          total++;
          const engine = typeof meta.engine === "string" ? meta.engine : "other";
          counts.set(engine, (counts.get(engine) ?? 0) + 1);
          if (r.user_id) users.add(r.user_id);
        }

        let signups = 0;
        if (users.size > 0) {
          const { data: conv } = await supabase
            .from("analytics_events")
            .select("user_id")
            .in("event_type", ["signup_form_submitted", "onboarding_completed"])
            .in("user_id", Array.from(users))
            .gte("created_at", since);
          signups = new Set((conv ?? []).map((c) => c.user_id).filter(Boolean) as string[]).size;
        }

        if (!mounted) return;
        setStats({
          total,
          byEngine: Array.from(counts.entries())
            .map(([engine, count]) => ({ engine, count }))
            .sort((a, b) => b.count - a.count),
          identifiedUsers: users.size,
          signups,
          conversionRate: total > 0 ? (signups / total) * 100 : 0,
        });
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Acquisition IA</CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          Pages ouvertes depuis un assistant IA sur 30 jours glissants : une même visite en compte
          plusieurs. Les visites comptées une fois (depuis le 13/11/2026) et les inscrits qu'elles
          donnent se lisent dans le tableau « Pages d'arrivée des assistants IA » plus bas.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading || !stats ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-lg" />
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              <Stat label="Pages ouvertes depuis une IA" value={stats.total} hint="30 derniers jours, plusieurs par visite" />
              <Stat label="Visiteurs identifiés" value={stats.identifiedUsers} hint="rattachés à un compte" />
              <Stat label="Visiteurs IA retrouvés au compte" value={stats.signups} hint="inscription ou accueil terminé, anciens membres compris" />
              <Stat
                label="Part retrouvée au compte"
                value={stats.conversionRate}
                suffix=" %"
                decimals={1}
              />
            </div>

            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                Répartition par moteur
              </p>
              {stats.byEngine.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Aucun atterrissage IA enregistré sur la période.
                </p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {stats.byEngine.map((e) => (
                    <Stat
                      key={e.engine}
                      label={ENGINE_LABELS[e.engine] ?? adminLabel(e.engine)}
                      value={e.count}
                      hint={`${((e.count / Math.max(stats.total, 1)) * 100).toFixed(0)} % du trafic IA`}
                    />
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

const Stat = ({
  label,
  value,
  hint,
  suffix,
  decimals = 0,
}: {
  label: string;
  value: number;
  hint?: string;
  suffix?: string;
  decimals?: number;
}) => (
  <div className="rounded-lg border bg-card p-3">
    <p className="text-xs text-muted-foreground leading-tight">{label}</p>
    <p className="text-2xl font-semibold mt-1">
      {value.toLocaleString("fr-FR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
      {suffix}
    </p>
    {hint && <p className="text-[11px] text-muted-foreground mt-1">{hint}</p>}
  </div>
);

export default AiAcquisitionCard;
