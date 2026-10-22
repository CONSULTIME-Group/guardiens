import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { KpiTile } from "@/components/admin/ui";
import { useFeatureFlag } from "@/hooks/useFeatureFlag";
import { ADMIN_BADGES_QUERY_KEY, fetchAdminBadges, type AdminBadges } from "@/hooks/useAdminBadges";
import { UNAVAILABLE_LABEL, reportAdminReadError } from "@/lib/admin/readError";
import {
  autoBreakdown,
  buildPilotage,
  hebdoBreakdown,
  type PilotageLine,
  type PilotageModel,
  type PilotageSignal,
} from "@/lib/admin/pilotage";
import { buildActionQueue } from "@/components/admin/signals/actionQueue";
import type { AdminSignalBase } from "@/components/admin/signals/signalGrouping";
import type { SitInfo } from "@/components/admin/signals/SitSignalGroupCard";
import { AUTO_RELANCE_TEMPLATES } from "../../../../../supabase/functions/_shared/admin-signal-config.ts";
import { renderEntry, waitingQueueItems } from "./SignalsSection";
import { useKeyFigures, useListingFlow } from "./useDashboardData";
import { useLiquiditySnapshot } from "./LiquidityBlock";

/**
 * Lot ADM10 (22/10/2026, maquette Claude Design validée par Jérémie) :
 * la vue d'ensemble répond à trois questions. Une seule lecture des signaux
 * ouverts (clé rangée sous admin_dashboard_snapshot : une carte traitée
 * disparaît aussitôt), rangée par buildPilotage (src/lib/admin/pilotage.ts).
 */
export function usePilotage() {
  const { enabled: flagEnabled, loading: flagLoading } = useFeatureFlag("admin_signals_active");
  const open = useQuery<PilotageSignal[]>({
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
      return (data ?? []) as unknown as PilotageSignal[];
    },
    enabled: flagEnabled,
    staleTime: 30_000,
  });
  const signals = open.data ?? [];
  const sitIds = [...new Set(signals.map((s) => {
    const m = s.metadata ?? {};
    return typeof m.sit_id === "string" ? m.sit_id : s.entity_type === "sit" ? s.entity_id : null;
  }).filter((x): x is string => typeof x === "string"))].sort();
  const sits = useQuery<Map<string, SitInfo>>({
    queryKey: ["admin_signal_sits", sitIds],
    queryFn: async () => {
      const { data, error } = await supabase.from("sits").select("id, title, city, start_date").in("id", sitIds);
      if (error) throw error;
      return new Map((data ?? []).map((r) => [r.id, r as SitInfo]));
    },
    enabled: flagEnabled && sitIds.length > 0,
    staleTime: 60_000,
  });
  const sitMap = sits.data ?? new Map<string, SitInfo>();
  const ready = !open.isLoading && (sitIds.length === 0 || !sits.isLoading);
  const model: PilotageModel | null = flagEnabled && open.data && ready ? buildPilotage(signals, sitMap) : null;
  return { flagEnabled, flagLoading, model, sitMap, loading: open.isLoading || (sitIds.length > 0 && sits.isLoading), error: open.error || sits.error };
}

/** Cartes d'action existantes d'une ligne, regroupées comme dans l'ancienne file. */
const LineDetail = ({ signals, sitMap }: { signals: PilotageSignal[]; sitMap: Map<string, SitInfo> }) => {
  const entries = buildActionQueue(signals as unknown as AdminSignalBase[], [], { sits: sitMap });
  return <ul className="space-y-2 px-4 pb-4 sm:px-5">{entries.map((e) => renderEntry(e, sitMap))}</ul>;
};

const TONE_CLASS: Record<PilotageLine["tone"], string> = {
  urgent: "text-destructive font-semibold",
  late: "text-secondary font-semibold",
  normal: "text-muted-foreground",
};

const LineRow = ({ line, sitMap, last }: { line: PilotageLine; sitMap: Map<string, SitInfo>; last: boolean }) => {
  const [open, setOpen] = useState(false);
  const id = `pilotage-${line.key.replace(/[^a-z0-9_-]/gi, "-")}`;
  return (
    <li className={last ? "" : "border-b border-border/70"} data-testid="pilotage-line">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-4 py-4 sm:px-5">
        <div className="min-w-0 flex-[1_1_320px]">
          <p className="text-[15px] font-semibold text-foreground">{line.title}</p>
          <p className="mt-0.5 text-[13px] text-muted-foreground">{line.detail}</p>
        </div>
        <span className={`text-[13px] ${TONE_CLASS[line.tone]}`}>{line.deadline}</span>
        <Button
          variant="outline"
          className="min-h-11 rounded-full px-5 font-bold"
          aria-expanded={open}
          aria-controls={id}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? "Replier" : line.action}
        </Button>
      </div>
      {open && <div id={id}><LineDetail signals={line.signals} sitMap={sitMap} /></div>}
    </li>
  );
};

const LineGroup = ({ label, lines, sitMap, urgent }: { label: string; lines: PilotageLine[]; sitMap: Map<string, SitInfo>; urgent?: boolean }) => (
  <div className="overflow-hidden rounded-2xl border border-border bg-card">
    <p className={`border-b border-border/70 px-4 py-3 text-xs font-semibold uppercase tracking-[0.08em] sm:px-5 ${urgent ? "bg-destructive/5 text-destructive" : "text-muted-foreground"}`}>
      {label}
    </p>
    <ul>{lines.map((l, i) => <LineRow key={l.key} line={l} sitMap={sitMap} last={i === lines.length - 1} />)}</ul>
  </div>
);

/** Question 1, suite de l'état du site : les signaux techniques, repliés. */
export const TechnicalSignalsLine = () => {
  const { model, sitMap } = usePilotage();
  const [open, setOpen] = useState(false);
  if (!model || model.technique.length === 0) return null;
  const k = model.technique.length;
  return (
    <div className="mt-2 rounded-xl border border-border bg-card" data-testid="pilotage-technique">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
        <p className="text-sm text-foreground">{k} {k > 1 ? "signaux techniques ouverts" : "signal technique ouvert"} (emails, rendu SEO, contenus).</p>
        <Button variant="ghost" size="sm" aria-expanded={open} onClick={() => setOpen((o) => !o)}>{open ? "Replier" : "Voir"}</Button>
      </div>
      {open && <LineDetail signals={model.technique} sitMap={sitMap} />}
    </div>
  );
};

/** Question 2 : ce qui vous attend aujourd'hui. */
export const TodaySection = () => {
  const { flagEnabled, flagLoading, model, sitMap, loading, error } = usePilotage();
  const { data: badges, isError: badgesError } = useQuery<AdminBadges>({
    queryKey: [...ADMIN_BADGES_QUERY_KEY, "accueil"],
    queryFn: fetchAdminBadges,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
  const failed = useAutomation().data?.failed7d ?? 0;
  const waiting = waitingQueueItems(badges ?? {});
  if (flagLoading) return null;
  const lineCount = (model?.urgent.length ?? 0) + (model?.vous.length ?? 0) + (failed > 0 ? 1 : 0);

  return (
    <section aria-labelledby="pilotage-today" className="space-y-3.5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="pilotage-today" className="font-heading text-2xl font-semibold">Ce qui vous attend aujourd'hui</h2>
        {model && <p className="text-sm text-muted-foreground">{lineCount} {lineCount > 1 ? "lignes" : "ligne"}</p>}
      </div>

      {!flagEnabled ? (
        <p className="text-sm text-foreground" data-testid="signals-disabled">
          Les signaux sont désactivés : la file ne se remplit plus et les relances automatiques sont coupées.{" "}
          <Link to="/admin/settings" className="underline">Réactiver dans Paramètres</Link>.
        </p>
      ) : loading ? (
        <div className="space-y-2"><Skeleton className="h-16 rounded-2xl" /><Skeleton className="h-16 rounded-2xl" /></div>
      ) : error || !model ? (
        <p className="text-sm text-destructive">Lecture des signaux impossible. Ouvrez les files depuis le menu.</p>
      ) : (
        <>
          {model.urgent.length > 0 && (
            <LineGroup label="Départ sous 7 jours, la relance automatique ne suffit plus" lines={model.urgent} sitMap={sitMap} urgent />
          )}
          {model.vous.length > 0 && <LineGroup label="Seul vous pouvez trancher" lines={model.vous} sitMap={sitMap} />}
          {failed > 0 && (
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-2xl border border-border bg-card px-4 py-4 sm:px-5" data-testid="pilotage-relances-echec">
              <div className="min-w-0 flex-[1_1_320px]">
                <p className="text-[15px] font-semibold">Vérifier {failed} {failed > 1 ? "relances automatiques en échec" : "relance automatique en échec"}</p>
                <p className="mt-0.5 text-[13px] text-muted-foreground">Sur 7 jours : le membre n'a pas reçu son rappel.</p>
              </div>
              <Button asChild variant="outline" className="min-h-11 rounded-full px-5 font-bold"><Link to="/admin/emails">Vérifier</Link></Button>
            </div>
          )}
          {lineCount === 0 && <p className="text-sm text-foreground">Tout est à jour aujourd'hui.</p>}
        </>
      )}

      <p className="text-sm text-muted-foreground" data-testid="waiting-members">
        {badgesError ? (
          "Membres qui attendent : lecture indisponible, ouvrez les files depuis le menu."
        ) : waiting.length === 0 ? (
          "Tous les membres ont leur réponse : messages de contact, signalements, demandes RGPD, contestations d'avis et vérifications d'identité sont à jour."
        ) : (
          <>
            <span className="font-semibold text-foreground">Membres qui attendent une réponse : </span>
            {waiting.map((w, i) => (
              <span key={w.to}>{i > 0 && ", "}<Link to={w.to} className="text-primary underline underline-offset-2">{w.label}</Link></span>
            ))}
            .
          </>
        )}
      </p>
    </section>
  );
};

/** Question 3 : Guardiens avance ? Quatre chiffres reliés à l'objectif. */
export const ProgressSection = () => {
  const navigate = useNavigate();
  const kf = useKeyFigures();
  const flow = useListingFlow();
  const liq = useLiquiditySnapshot();
  const val = (loading: boolean, err: unknown, v: number | undefined) =>
    err ? <span className="text-base text-destructive">{UNAVAILABLE_LABEL}</span> : loading ? "…" : v;
  return (
    <section aria-labelledby="pilotage-progress" className="space-y-3.5">
      <h2 id="pilotage-progress" className="font-heading text-2xl font-semibold">Guardiens avance ?</h2>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" data-testid="overview-key-figures">
        <KpiTile
          label="Annonces publiées, 7 jours"
          value={val(flow.isLoading, flow.error, flow.data?.publishedLast7d)}
          hint={flow.data ? `${flow.data.publishedPrev7d} la semaine d'avant` : undefined}
          onClick={() => navigate("/admin/listings?filter=recent")}
        />
        <KpiTile
          label="Candidatures sans réponse"
          value={val(liq.isLoading, liq.error, liq.data?.pending_applications)}
          hint={liq.data && liq.data.pending_applications > 0 && liq.data.pending_oldest_days !== null ? `Plus ancienne : ${liq.data.pending_oldest_days} j` : undefined}
          onClick={() => navigate("/admin/listings")}
        />
        <KpiTile
          label="Gardes confirmées à venir"
          value={val(kf.isLoading, kf.error, kf.data?.confirmedUpcoming)}
          hint={kf.data ? `${kf.data.ongoingSits} en cours` : undefined}
          onClick={() => navigate("/admin/sits-management")}
        />
        <KpiTile
          label="Inscrits, 7 jours"
          value={val(kf.isLoading, kf.error, kf.data?.newThisWeek)}
          hint={kf.data ? `${kf.data.newPrevWeek} la semaine d'avant` : undefined}
          onClick={() => navigate("/admin/users")}
        />
      </div>
    </section>
  );
};

export interface AutomationSummary {
  sent24h: number;
  waiting24h: number;
  failed24h: number;
  failed7d: number;
  closed24h: number;
}

const FAILED = new Set(["failed", "bounced"]);
const WAITING = new Set(["pending", "deferred", "queued"]);

/** Comptes des relances automatiques (email_send_log), une fonction pure testée. */
export function summarizeRelances(rows: { status: string; created_at: string }[], closed24h: number, now: number = Date.now()): AutomationSummary {
  const d1 = now - 86_400_000;
  const last24 = rows.filter((r) => new Date(r.created_at).getTime() >= d1);
  return {
    sent24h: last24.filter((r) => r.status === "sent" || r.status === "delivered").length,
    waiting24h: last24.filter((r) => WAITING.has(r.status)).length,
    failed24h: last24.filter((r) => FAILED.has(r.status)).length,
    failed7d: rows.filter((r) => FAILED.has(r.status)).length,
    closed24h,
  };
}

export function useAutomation() {
  return useQuery<AutomationSummary>({
    queryKey: ["admin_overview_automation"],
    staleTime: 60_000,
    queryFn: async () => {
      const now = Date.now();
      const d7 = new Date(now - 7 * 86_400_000).toISOString();
      const d1 = new Date(now - 86_400_000).toISOString();
      const [logs, closed] = await Promise.all([
        supabase.from("email_send_log").select("status, created_at").in("template_name", AUTO_RELANCE_TEMPLATES).gte("created_at", d7).limit(5000),
        supabase.from("admin_signals").select("id", { count: "exact", head: true }).gte("resolved_at", d1).like("action_taken", "auto%"),
      ]);
      const failed = [logs, closed].find((r: { error: unknown }) => r.error);
      if (failed) { reportAdminReadError("Vue d'ensemble : relances automatiques", failed.error); throw failed.error; }
      return summarizeRelances((logs.data ?? []) as { status: string; created_at: string }[], closed.count ?? 0, now);
    },
  });
}

/** Le système s'en charge : ce qui avance seul, pour surveiller sans agir. */
export const SystemSection = () => {
  const { model } = usePilotage();
  const auto = useAutomation();
  if (!model) return null;
  const a = auto.data;
  return (
    <section aria-labelledby="pilotage-system" className="space-y-2.5 rounded-2xl border border-primary/20 bg-primary/5 p-5 sm:p-6" data-testid="pilotage-systeme">
      <h2 id="pilotage-system" className="text-base font-semibold text-primary">Le système s'en charge, vous surveillez</h2>
      <p className="text-[15px] leading-relaxed text-foreground">
        {model.autoTotal > 0
          ? `${model.autoTotal} ${model.autoTotal > 1 ? "situations suivies" : "situation suivie"} par les relances automatiques : ${autoBreakdown(model.auto)}. Elles remontent en haut si le départ approche ou si une relance échoue.`
          : "Relances automatiques : file vide."}
      </p>
      <p className="text-sm text-foreground/80">
        {auto.error
          ? `Relances des dernières 24 heures : ${UNAVAILABLE_LABEL.toLowerCase()}.`
          : !a
            ? "Relances des dernières 24 heures : chargement…"
            : `Dernières 24 heures : ${a.sent24h} ${a.sent24h > 1 ? "relances parties" : "relance partie"}, ${a.waiting24h} en attente d'envoi, ${a.failed24h === 0 ? "aucun échec" : `${a.failed24h} en échec`}. ${a.closed24h} ${a.closed24h > 1 ? "situations closes" : "situation close"} d'elles-mêmes.`}
      </p>
      <Link to="/admin/emails" className="inline-flex min-h-11 items-center text-sm font-semibold text-primary underline underline-offset-2">Voir le détail des relances</Link>
      {model.hebdo.length > 0 && (
        <p className="border-t border-primary/15 pt-3 text-sm text-muted-foreground">Synthèse du lundi : {hebdoBreakdown(model.hebdo)}.</p>
      )}
    </section>
  );
};
