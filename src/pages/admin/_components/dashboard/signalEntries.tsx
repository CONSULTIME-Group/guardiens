/**
 * Lot ADM14 (lot 3 du plan de l'arène admin du 09/11/2026) : cartes d'action
 * des lignes de la vue d'ensemble, reprises de l'ancienne file « À traiter »
 * (SignalsSection, retirée avec WaitingMembersLine : plus rendues depuis le
 * lot ADM10, lot A V14).
 */
import { NoApplicationsCard } from "@/components/admin/signals/NoApplicationsCard";
import { PendingApplicationCard } from "@/components/admin/signals/PendingApplicationCard";
import { StaleVerificationCard } from "@/components/admin/signals/StaleVerificationCard";
import { DormantTopSitterCard } from "@/components/admin/signals/DormantTopSitterCard";
import { SuspiciousAccountCard } from "@/components/admin/signals/SuspiciousAccountCard";
import { RepeatedCancellationsCard } from "@/components/admin/signals/RepeatedCancellationsCard";
import { RepeatedRepublishCard } from "@/components/admin/signals/RepeatedRepublishCard";
import { OwnerMissingCoordinatesCard } from "@/components/admin/signals/OwnerMissingCoordinatesCard";
import { IdentityNeedsReviewCard } from "@/components/admin/signals/IdentityNeedsReviewCard";
import { StaleDraftCard } from "@/components/admin/signals/StaleDraftCard";
import { GenericSignalCard } from "@/components/admin/signals/GenericSignalCard";
import { GroupedSignalCard } from "@/components/admin/signals/GroupedSignalCard";
import type { AdminSignalBase } from "@/components/admin/signals/signalGrouping";
import { SitSignalGroupCard, type SitInfo } from "@/components/admin/signals/SitSignalGroupCard";
import type { QueueEntry } from "@/components/admin/signals/actionQueue";

/**
 * Rendu unitaire d'un signal : carte dédiée si elle existe, générique sinon.
 * Lot ADM4 : les types d'animation et de couverture (dormant_sitter,
 * affinity_onboarding_stale, city_coverage_gap, city_seo_tension) ne vont pas
 * dans la file ; leurs cartes, jamais rendues, sont retirées.
 */
function renderSignal(s: AdminSignalBase) {
  if (s.signal_type === "no_applications") {
    return <NoApplicationsCard signal={s as unknown as import("@/components/admin/signals/NoApplicationsCard").AdminSignal} />;
  }
  if (s.signal_type === "pending_application") {
    return <PendingApplicationCard signal={s as unknown as import("@/components/admin/signals/PendingApplicationCard").PendingApplicationSignal} />;
  }
  if (s.signal_type === "stale_verification") {
    return <StaleVerificationCard signal={s as unknown as import("@/components/admin/signals/StaleVerificationCard").StaleVerificationSignal} />;
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

/** Rendu d'une entrée de la file (annonce, groupe, signal ou suggestion IA). */
export function renderEntry(entry: QueueEntry, sitMap?: Map<string, SitInfo>) {
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
  // Les suggestions de l'analyse IA ne vont plus dans la liste (lot ADM10).
  return null;
}
