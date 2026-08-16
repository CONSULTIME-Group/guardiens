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
import { UntappedCityCard } from "@/components/admin/signals/UntappedCityCard";
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
import {
  buildActionQueue,
  type QueueEntry,
  type SuggestedAction,
} from "@/components/admin/signals/actionQueue";

interface Snapshot {
  signals: AdminSignalBase[];
  generated_at: string;
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
  if (s.signal_type === "untapped_city") {
    return <UntappedCityCard signal={s as unknown as import("@/components/admin/signals/UntappedCityCard").UntappedCitySignal} />;
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

/** Action suggérée par l'analyse IA, sans signal équivalent dans la file. */
const AiActionCard = ({ action }: { action: SuggestedAction }) => (
  <div className="rounded-lg border border-border p-3">
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <Badge
          variant={AI_PRIORITY_VARIANT[action.priority] ?? "outline"}
          className="mb-1.5 text-[10px] uppercase tracking-wide"
        >
          <Sparkles className="h-3 w-3 mr-1" aria-hidden />
          Priorité {action.priority}
        </Badge>
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
 * l'analyse IA, triés par priorité réelle. Une action IA dont la cible
 * correspond à un signal existant est écartée : le signal porte l'action
 * concrète, la suggestion IA n'est que descriptive.
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

  if (flagLoading) return null;

  const signals = flagEnabled
    ? (data?.signals ?? []).filter((s) => s.severity !== "info")
    : [];

  const signalPaths = new Set(signals.map((s) => linkPath(signalAdminLink(s))));
  const dedupedAiActions = aiActions.filter((a) => !signalPaths.has(linkPath(a.link)));

  const groups = groupSignals(signals);
  const signalEntries: QueueEntry[] = groups.flatMap((g): QueueEntry[] =>
    g.items.length > GROUP_THRESHOLD
      ? [{ kind: "group", group: g }]
      : g.items.map((s) => ({ kind: "signal", signal: s })),
  );
  const queue: QueueEntry[] = [
    ...signalEntries,
    ...dedupedAiActions.map((a): QueueEntry => ({ kind: "ai", action: a })),
  ].sort((a, b) => rankOf(a) - rankOf(b));

  const loading = (flagEnabled && isLoading) || aiLoading;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-heading flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-muted-foreground" aria-hidden />
          À traiter
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
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
