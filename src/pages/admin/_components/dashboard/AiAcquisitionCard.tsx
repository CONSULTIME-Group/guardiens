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
  fbTotal: number;
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

        const [ai, fb] = await Promise.all([
          supabase
            .from("analytics_events")
            .select("user_id, metadata, created_at")
            .eq("event_type", "ai_referral_landing")
            .gte("created_at", since),
          supabase
            .from("analytics_events")
            .select("*", { count: "exact", head: true })
            .eq("event_type", "fb_referral_landing")
            .gte("created_at", since),
        ]);

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
          fbTotal: fb.count ?? 0,
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
          Trafic entrant depuis les assistants IA génératifs sur 30 jours glissants, et inscriptions
          attribuées.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading || !stats ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-lg" />
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              <Stat label="Atterrissages IA" value={stats.total} hint="30 derniers jours" />
              <Stat label="Visiteurs identifiés" value={stats.identifiedUsers} hint="rattachés à un compte" />
              <Stat label="Inscriptions attribuées" value={stats.signups} hint="signup ou onboarding" />
              <Stat
                label="Taux de conversion IA"
                value={stats.conversionRate}
                suffix=" %"
                decimals={1}
              />
              <Stat label="Atterrissages Facebook" value={stats.fbTotal} hint="ordre de grandeur" />
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
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                  {stats.byEngine.map((e) => (
                    <Stat
                      key={e.engine}
                      label={ENGINE_LABELS[e.engine] ?? e.engine}
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
