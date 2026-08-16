import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
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
import {
  groupSignals,
  GROUP_THRESHOLD,
  type AdminSignalBase,
} from "@/components/admin/signals/signalGrouping";

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

export const SignalsSection = () => {
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
  if (!flagEnabled) return null;

  const signals = (data?.signals ?? []).filter((s) => s.severity !== "info");
  const groups = groupSignals(signals);

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

        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-14 rounded-lg" />
            <Skeleton className="h-14 rounded-lg" />
          </div>
        ) : error ? (
          <p className="text-sm text-destructive">
            Chargement des signaux impossible. Réessayez plus tard.
          </p>
        ) : signals.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-success" aria-hidden />
            Tout est calme, aucun signal ouvert.
          </div>
        ) : (
          <ul className="space-y-2">
            {groups.map((g) =>
              g.items.length > GROUP_THRESHOLD ? (
                <li key={g.signalType}>
                  <GroupedSignalCard
                    signalType={g.signalType}
                    signals={g.items}
                    severity={g.severity}
                    renderDetail={renderSignal}
                  />
                </li>
              ) : (
                g.items.map((s) => <li key={s.id}>{renderSignal(s)}</li>)
              ),
            )}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};
