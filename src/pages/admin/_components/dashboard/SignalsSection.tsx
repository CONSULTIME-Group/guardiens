import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useFeatureFlag } from "@/hooks/useFeatureFlag";
import { NoApplicationsCard } from "@/components/admin/signals/NoApplicationsCard";
import { PendingApplicationCard } from "@/components/admin/signals/PendingApplicationCard";
import { DormantSitterCard } from "@/components/admin/signals/DormantSitterCard";
import { StaleVerificationCard } from "@/components/admin/signals/StaleVerificationCard";
import { AffinityStaleCard } from "@/components/admin/signals/AffinityStaleCard";
import { CityCoverageGapCard } from "@/components/admin/signals/CityCoverageGapCard";
import { CitySeoTensionCard } from "@/components/admin/signals/CitySeoTensionCard";
import { DormantTopSitterCard } from "@/components/admin/signals/DormantTopSitterCard";
import { SuspiciousAccountCard } from "@/components/admin/signals/SuspiciousAccountCard";
import { RepeatedCancellationsCard } from "@/components/admin/signals/RepeatedCancellationsCard";
import { RepeatedRepublishCard } from "@/components/admin/signals/RepeatedRepublishCard";
import { OwnerMissingCoordinatesCard } from "@/components/admin/signals/OwnerMissingCoordinatesCard";
import { IdentityNeedsReviewCard } from "@/components/admin/signals/IdentityNeedsReviewCard";
import { StaleDraftCard } from "@/components/admin/signals/StaleDraftCard";
import { OwnerActivationCampaignCard } from "@/components/admin/signals/OwnerActivationCampaignCard";
import { GenericSignalCard } from "@/components/admin/signals/GenericSignalCard";
import { GroupedSignalCard } from "@/components/admin/signals/GroupedSignalCard";
import type { AdminSignalBase } from "@/components/admin/signals/signalGrouping";
import { PriorityBadge } from "@/components/admin/signals/PriorityBadge";
import { SitSignalGroupCard, type SitInfo } from "@/components/admin/signals/SitSignalGroupCard";
import {
  buildActionQueue,
  type QueueEntry,
  type SuggestedAction,
} from "@/components/admin/signals/actionQueue";

interface Snapshot {
  signals: AdminSignalBase[];
  signals_open_total?: number;
  signals_critical_total?: number;
  generated_at: string;
}

/** Ligne de compte sous le titre : « 20 affichés sur N, dont X critiques ». */
export function signalsCountLine(shown: number, total?: number, critical?: number): string | null {
  if (typeof total !== "number" || total <= 0) return null;
  const crit = critical ?? 0;
  const critTxt = crit === 1 ? "dont 1 critique" : `dont ${crit} critiques`;
  const head = shown >= total
    ? `${total} ${total > 1 ? "signaux" : "signal"} ouvert${total > 1 ? "s" : ""}`
    : `${shown} affichés sur ${total}`;
  return `${head}, ${critTxt}.`;
}

/** Rendu unitaire d'un signal : carte dédiée si elle existe, générique sinon. */
function renderSignal(s: AdminSignalBase) {
  if (s.signal_type === "no_applications") {
    return <NoApplicationsCard signal={s as unknown as import("@/components/admin/signals/NoApplicationsCard").AdminSignal} />;
  }
  if (s.signal_type === "pending_application") {
    return <PendingApplicationCard signal={s as unknown as import("@/components/admin/signals/PendingApplicationCard").PendingApplicationSignal} />;
  }
  if (s.signal_type === "dormant_sitter") {
    return <DormantSitterCard signal={s as unknown as import("@/components/admin/signals/DormantSitterCard").DormantSitterSignal} />;
  }
  if (s.signal_type === "stale_verification") {
    return <StaleVerificationCard signal={s as unknown as import("@/components/admin/signals/StaleVerificationCard").StaleVerificationSignal} />;
  }
  if (s.signal_type === "affinity_onboarding_stale") {
    return <AffinityStaleCard signal={s as unknown as import("@/components/admin/signals/AffinityStaleCard").AffinityStaleSignal} />;
  }
  if (s.signal_type === "city_coverage_gap") {
    return <CityCoverageGapCard signal={s as unknown as import("@/components/admin/signals/CityCoverageGapCard").CityCoverageGapSignal} />;
  }
  if (s.signal_type === "city_seo_tension") {
    return <CitySeoTensionCard signal={s as unknown as import("@/components/admin/signals/CitySeoTensionCard").CitySeoTensionSignal} />;
  }
  if (s.signal_type === "dormant_top_sitter") {
    return <DormantTopSitterCard signal={s as unknown as import("@/components/admin/signals/DormantTopSitterCard").DormantTopSitterSignal} />;
  }
  if (s.signal_type === "suspicious_account") {
    return <SuspiciousAccountCard signal={s as unknown as import("@/components/admin/signals/SuspiciousAccountCard").SuspiciousAccountSignal} />;
  }
  if (s.signal_type === "repeated_cancellations") {
    return <RepeatedCancellationsCard signal={s as unknown as import("@/components/admin/signals/RepeatedCancellationsCard").RepeatedCancellationsSignal} />;
  }
  if (s.signal_type === "repeated_republish") {
    return <RepeatedRepublishCard signal={s as unknown as import("@/components/admin/signals/RepeatedRepublishCard").RepeatedRepublishSignal} />;
  }
  if (s.signal_type === "owner_missing_coordinates") {
    return <OwnerMissingCoordinatesCard signal={s as unknown as import("@/components/admin/signals/OwnerMissingCoordinatesCard").OwnerMissingCoordinatesSignal} />;
  }
  if (s.signal_type === "identity_needs_review") {
    return <IdentityNeedsReviewCard signal={s as unknown as import("@/components/admin/signals/IdentityNeedsReviewCard").IdentityNeedsReviewSignal} />;
  }
  if (s.signal_type === "stale_draft") {
    return <StaleDraftCard signal={s as unknown as import("@/components/admin/signals/StaleDraftCard").StaleDraftSignal} />;
  }
  // undeclared_pricing compris : libellé français, extrait, lien et Ignorer.
  return <GenericSignalCard signal={s} />;
}

/** Action suggérée par l'analyse IA, sans signal équivalent dans la file. */
const AiActionCard = ({ action }: { action: SuggestedAction }) => (
  <div className="rounded-lg border border-border p-3">
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="mb-1.5">
          <PriorityBadge priority={action.priority} origin="suggestion" />
        </div>
        <p className="text-sm font-medium text-foreground leading-snug">{action.title}</p>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{action.why}</p>
      </div>
      <Button asChild variant="outline" size="sm" className="shrink-0">
        <Link to={action.link}>Traiter</Link>
      </Button>
    </div>
  </div>
);

interface Props {
  aiActions: SuggestedAction[];
  aiLoading: boolean;
}

/**
 * File d'actions fusionnée : signaux admin_signals et actions suggérées par
 * l'analyse IA, triés sur une échelle de priorité unifiée (haute, moyenne,
 * basse). Une action IA dont le lien ou le sujet correspond à un signal
 * existant est écartée : le signal porte l'action concrète, la suggestion IA
 * n'est que descriptive. Voir actionQueue.ts pour la fusion.
 */
export const SignalsSection = ({ aiActions, aiLoading }: Props) => {
  const { enabled: flagEnabled, loading: flagLoading } = useFeatureFlag("admin_signals_active");

  const { data, isLoading, error } = useQuery<Snapshot>({
    queryKey: ["admin_dashboard_snapshot"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_dashboard_snapshot");
      if (error) throw error;
      return data as unknown as Snapshot;
    },
    enabled: flagEnabled,
    staleTime: 30_000,
  });

  // Lot S2 : la file lit tous les signaux ouverts (hors info) pour que les
  // regroupements par annonce et par famille soient complets.
  const { data: openSignals, isLoading: openLoading } = useQuery<AdminSignalBase[]>({
    queryKey: ["admin_open_signals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_signals")
        .select("id, signal_type, severity, entity_type, entity_id, detected_at, metadata")
        .is("resolved_at", null)
        .neq("severity", "info")
        .order("detected_at", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return (data ?? []) as unknown as AdminSignalBase[];
    },
    enabled: flagEnabled,
    staleTime: 30_000,
  });

  const signals = flagEnabled ? (openSignals ?? data?.signals ?? []) : [];

  const sitIds = [...new Set(
    signals.map((s) => s.metadata?.sit_id).filter((x): x is string => typeof x === "string"),
  )].sort();
  const { data: sitMap } = useQuery<Map<string, SitInfo>>({
    queryKey: ["admin_signal_sits", sitIds],
    queryFn: async () => {
      const { data, error } = await supabase.from("sits").select("id, title, city, start_date").in("id", sitIds);
      if (error) throw error;
      return new Map((data ?? []).map((r) => [r.id, r as SitInfo]));
    },
    enabled: flagEnabled && sitIds.length > 0,
    staleTime: 60_000,
  });

  if (flagLoading) return null;

  const queue: QueueEntry[] = buildActionQueue(signals, aiActions);

  const loading = (flagEnabled && (isLoading || openLoading)) || aiLoading;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-heading flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-muted-foreground" aria-hidden />
          À traiter
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {flagEnabled && data && (() => {
          const queued = queue.flatMap((e) => e.kind === "ai" ? [] : e.kind === "signal" ? [e.signal] : e.kind === "sit" ? e.items : e.group.items);
          const line = signalsCountLine(queued.length, queued.length, queued.filter((s) => s.severity === "critical").length);
          return line ? <p className="text-sm text-muted-foreground" data-testid="signals-count-line">{line}</p> : null;
        })()}
        <OwnerActivationCampaignCard />

        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-14 rounded-lg" />
            <Skeleton className="h-14 rounded-lg" />
          </div>
        ) : (
          <>
            {error && flagEnabled && (
              <p className="text-sm text-destructive">
                Chargement des signaux impossible. Réessayez plus tard.
              </p>
            )}
            {queue.length === 0 ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-success" aria-hidden />
                Tout est calme, aucune action en attente.
              </div>
            ) : (
              <ul className="space-y-2">
                {queue.map((entry) => {
                  if (entry.kind === "group") {
                    return (
                      <li key={`group-${entry.group.signalType}`}>
                        <GroupedSignalCard
                          signalType={entry.group.signalType}
                          signals={entry.group.items}
                          severity={entry.group.severity}
                          renderDetail={renderSignal}
                        />
                      </li>
                    );
                  }
                  if (entry.kind === "sit") {
                    return (
                      <li key={`sit-${entry.sitId}`}>
                        <SitSignalGroupCard sitId={entry.sitId} sit={sitMap?.get(entry.sitId)} items={entry.items} severity={entry.severity} />
                      </li>
                    );
                  }
                  if (entry.kind === "signal") {
                    return <li key={entry.signal.id}>{renderSignal(entry.signal)}</li>;
                  }
                  return (
                    <li key={`ai-${entry.action.title}`}>
                      <AiActionCard action={entry.action} />
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};
