import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useFeatureFlag } from "@/hooks/useFeatureFlag";
import { ADMIN_BADGES_QUERY_KEY, fetchAdminBadges, type AdminBadges } from "@/hooks/useAdminBadges";
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
import { GenericSignalCard } from "@/components/admin/signals/GenericSignalCard";
import { GroupedSignalCard } from "@/components/admin/signals/GroupedSignalCard";
import type { AdminSignalBase } from "@/components/admin/signals/signalGrouping";
import { PriorityBadge } from "@/components/admin/signals/PriorityBadge";
import { SitSignalGroupCard, type SitInfo } from "@/components/admin/signals/SitSignalGroupCard";
import {
  buildActionQueue,
  entryPriority,
  entrySection,
  sitIdOf,
  type QueueEntry,
  type SuggestedAction,
} from "@/components/admin/signals/actionQueue";
import {
  QUEUE_SECTION_LABELS,
  QUEUE_SECTION_ORDER,
  SIT_TIMED_TYPES,
  type QueueSection,
} from "../../../../../supabase/functions/_shared/admin-signal-config.ts";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

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

/**
 * Lot ADM1 : ligne de compte par section, en actions et non en signaux bruts.
 * « 7 actions : 4 membres à contacter, 1 en modération, 2 techniques. »
 */
export function queueSummaryLine(counts: Record<QueueSection, number>): string | null {
  const total = counts.membres + counts.moderation + counts.technique;
  if (total <= 0) return null;
  const parts: string[] = [];
  if (counts.membres) parts.push(`${counts.membres} ${counts.membres > 1 ? "membres" : "membre"} à contacter`);
  if (counts.moderation) parts.push(`${counts.moderation} en modération`);
  if (counts.technique) parts.push(`${counts.technique} ${counts.technique > 1 ? "techniques" : "technique"}`);
  return `${total} ${total > 1 ? "actions" : "action"} : ${parts.join(", ")}.`;
}

/**
 * Lot ADM2 : files où un membre attend une réponse humaine. Mêmes définitions
 * que les pastilles du menu (admin_menu_badges), un lien par file non vide.
 */
export const WAITING_QUEUES: { key: keyof AdminBadges; one: string; many: string; to: string }[] = [
  { key: "contactMessages", one: "message de contact", many: "messages de contact", to: "/admin/contact-messages" },
  { key: "reports", one: "signalement", many: "signalements", to: "/admin/reports" },
  { key: "deletionRequests", one: "demande RGPD", many: "demandes RGPD", to: "/admin/demandes-suppression" },
  { key: "reviewDisputes", one: "contestation d'avis", many: "contestations d'avis", to: "/admin/review-disputes" },
  { key: "verifications", one: "vérification d'identité", many: "vérifications d'identité", to: "/admin/verifications" },
];

export function waitingQueueItems(badges: Partial<AdminBadges>) {
  return WAITING_QUEUES
    .map((q) => ({ ...q, count: Number(badges[q.key] ?? 0) }))
    .filter((q) => q.count > 0)
    .map((q) => ({ to: q.to, label: `${q.count} ${q.count > 1 ? q.many : q.one}` }));
}

const WaitingMembersLine = () => {
  // Même lecture que les pastilles du menu ; la clé sous « admin-badges » est
  // rafraîchie par refreshAdminBadges() après chaque action sur une file.
  const { data: badges, isError } = useQuery<AdminBadges>({
    queryKey: [...ADMIN_BADGES_QUERY_KEY, "accueil"],
    queryFn: fetchAdminBadges,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
  if (isError) {
    return (
      <p className="text-sm text-muted-foreground" data-testid="waiting-members">
        Membres qui attendent : lecture indisponible, ouvrez les files depuis le menu.
      </p>
    );
  }
  const items = waitingQueueItems(badges ?? {});
  if (items.length === 0) return null;
  return (
    <div className="rounded-lg border border-border bg-accent/40 p-3" data-testid="waiting-members">
      <p className="text-sm font-semibold text-foreground">Membres qui attendent une réponse</p>
      <ul className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1">
        {items.map((it) => (
          <li key={it.to}>
            <Link to={it.to} className="text-sm text-primary underline underline-offset-2">{it.label}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
};

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

/** Rendu d'une entrée de la file (annonce, groupe, signal ou suggestion IA). */
function renderEntry(entry: QueueEntry, sitMap?: Map<string, SitInfo>) {
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
}

/**
 * Lot ADM1 : une section de la file. « Membres à contacter » reste ouverte ;
 * Modération et Technique et contenus sont repliées, sauf si une action de
 * priorité haute s'y trouve.
 */
const QueueSectionBlock = ({
  section,
  entries,
  sitMap,
}: {
  section: QueueSection;
  entries: QueueEntry[];
  sitMap?: Map<string, SitInfo>;
}) => {
  const high = entries.filter((e) => entryPriority(e) === "haute").length;
  const label = QUEUE_SECTION_LABELS[section];
  const meta = entries.length === 0
    ? "rien à traiter"
    : `${entries.length}${high ? `, dont ${high} en priorité haute` : ""}`;

  if (section === "membres") {
    return (
      <section data-testid={`queue-section-${section}`} className="space-y-2">
        <h3 className="text-sm font-semibold text-foreground">
          {label} <span className="font-normal text-muted-foreground">({meta})</span>
        </h3>
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun membre à contacter pour le moment.</p>
        ) : (
          <ul className="space-y-2">{entries.map((e) => renderEntry(e, sitMap))}</ul>
        )}
      </section>
    );
  }

  if (entries.length === 0) return null;
  return (
    <Accordion
      type="single"
      collapsible
      defaultValue={high > 0 ? section : undefined}
      data-testid={`queue-section-${section}`}
    >
      <AccordionItem value={section} className="rounded-lg border border-border">
        <AccordionTrigger className="px-3 py-2 text-sm font-semibold hover:no-underline">
          <span>
            {label} <span className="font-normal text-muted-foreground">({meta})</span>
          </span>
        </AccordionTrigger>
        <AccordionContent className="px-3 pb-3">
          <ul className="space-y-2">{entries.map((e) => renderEntry(e, sitMap))}</ul>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
};

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
  // Lot ADM2 : clé rangée sous « admin_dashboard_snapshot », que toutes les
  // cartes invalident après une action : la carte traitée disparaît aussitôt.
  const { data: openSignals, isLoading: openLoading } = useQuery<AdminSignalBase[]>({
    queryKey: ["admin_dashboard_snapshot", "open"],
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

  // Lot ADM1 : dates de début aussi pour les signaux portés par l'annonce elle-même.
  const sitIds = [...new Set(
    signals
      .filter((s) => typeof s.metadata?.sit_id === "string" || SIT_TIMED_TYPES.has(s.signal_type))
      .map((s) => sitIdOf(s))
      .filter((x): x is string => typeof x === "string"),
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

  const queue: QueueEntry[] = buildActionQueue(signals, aiActions, { sits: sitMap });
  const bySection = Object.fromEntries(
    QUEUE_SECTION_ORDER.map((sec) => [sec, queue.filter((e) => entrySection(e) === sec)]),
  ) as Record<QueueSection, QueueEntry[]>;

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
          const line = queueSummaryLine({
            membres: bySection.membres.length,
            moderation: bySection.moderation.length,
            technique: bySection.technique.length,
          });
          return line ? <p className="text-sm text-muted-foreground" data-testid="signals-count-line">{line}</p> : null;
        })()}
        <WaitingMembersLine />

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
            {!flagEnabled ? (
              <p className="text-sm text-foreground" data-testid="signals-disabled">
                Les signaux sont désactivés : la file ne se remplit plus et les relances automatiques sont coupées.{" "}
                <Link to="/admin/settings" className="underline">Réactiver dans Paramètres</Link>.
              </p>
            ) : queue.length === 0 ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-success" aria-hidden />
                Tout est calme, aucune action en attente.
              </div>
            ) : (
              <div className="space-y-4">
                {QUEUE_SECTION_ORDER.map((sec) => (
                  <QueueSectionBlock key={sec} section={sec} entries={bySection[sec]} sitMap={sitMap} />
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};
