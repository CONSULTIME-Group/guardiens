import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { KpiTile } from "@/components/admin/ui";
import { useFeatureFlag } from "@/hooks/useFeatureFlag";
import { useWorkList, WORK_LIST_QUERY_KEY } from "@/hooks/useWorkList";
import { isMondayInParis, technicalFamiliesText } from "@/lib/admin/overviewText";
import { UNAVAILABLE_LABEL, reportAdminReadError } from "@/lib/admin/readError";
import {
  autoBreakdown,
  hebdoBreakdown,
  unavailableSentence,
  WORK_FAMILY_LABELS,
  WORK_FAMILY_ORDER,
  type PilotageSignal,
  type WorkItem,
} from "@/lib/admin/pilotage";
import { buildActionQueue } from "@/components/admin/signals/actionQueue";
import type { AdminSignalBase } from "@/components/admin/signals/signalGrouping";
import type { SitInfo } from "@/components/admin/signals/SitSignalGroupCard";
import { AUTO_RELANCE_TEMPLATES } from "../../../../../supabase/functions/_shared/admin-signal-config.ts";
import { renderEntry } from "./signalEntries";
import { useKeyFigures, useListingFlow } from "./useDashboardData";
import { useLiquiditySnapshot } from "./LiquidityBlock";

export { WORK_LIST_QUERY_KEY };

/**
 * Lot ADM10 puis lot ADM13 (09/11/2026) : la vue d'ensemble lit la liste de
 * travail en une lecture (public.admin_work_list) et la met en forme par
 * buildWorkList (supabase/functions/_shared/admin-work-list.ts), comme l'email
 * du matin : même nombre de lignes à l'écran et dans l'email. Lot ADM14 : la
 * même lecture (useWorkList) porte la pastille du menu et l'état du site.
 */
export function usePilotage() {
  const { enabled: flagEnabled, loading: flagLoading } = useFeatureFlag("admin_signals_active");
  const { model, loading, error } = useWorkList();
  const sitMap = (model?.sits ?? new Map()) as unknown as Map<string, SitInfo>;
  return { flagEnabled, flagLoading, model, sitMap, loading, error };
}

/** Cartes d'action existantes d'une ligne, regroupées comme dans l'ancienne file. */
const LineDetail = ({ signals, sitMap }: { signals: PilotageSignal[]; sitMap: Map<string, SitInfo> }) => {
  const entries = buildActionQueue(signals as unknown as AdminSignalBase[], [], { sits: sitMap });
  return <ul className="space-y-2 px-4 pb-4 sm:px-5">{entries.map((e) => renderEntry(e, sitMap))}</ul>;
};

const TONE_CLASS: Record<WorkItem["tone"], string> = {
  urgent: "text-destructive font-semibold",
  late: "text-secondary font-semibold",
  normal: "text-muted-foreground",
};

/**
 * Une ligne de la liste : la phrase dit quoi faire, le bouton « Voir » montre
 * où (lot ADM14, lot A V4 : le bouton ne promet plus une action qu'il ne fait
 * pas). Un signal ou plus déplie ses cartes d'action ; une ligne sans signal
 * (voyant, file des membres, relances) mène à sa file.
 */
const LineRow = ({ line, sitMap, last }: { line: WorkItem; sitMap: Map<string, SitInfo>; last: boolean }) => {
  const [open, setOpen] = useState(false);
  const id = `pilotage-${line.key.replace(/[^a-z0-9_-]/gi, "-")}`;
  const unfolds = line.signals.length > 0;
  return (
    <li className={last ? "" : "border-b border-border/70"} data-testid="pilotage-line" data-family={line.family}>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-4 py-4 sm:px-5">
        <div className="min-w-0 flex-[1_1_320px]">
          <p className="text-[15px] font-semibold text-foreground">{line.title}</p>
          <p className="mt-0.5 text-[13px] text-muted-foreground">{line.detail}</p>
        </div>
        <span className={`text-[13px] ${TONE_CLASS[line.tone]}`}>{line.deadline}</span>
        {unfolds ? (
          <Button
            variant="outline"
            className="min-h-11 rounded-full px-5 font-bold"
            aria-expanded={open}
            aria-controls={id}
            onClick={() => setOpen((o) => !o)}
          >
            {open ? "Replier" : "Voir"}
          </Button>
        ) : (
          <Button asChild variant="outline" className="min-h-11 rounded-full px-5 font-bold">
            <Link to={line.link}>Voir</Link>
          </Button>
        )}
      </div>
      {unfolds && open && <div id={id}><LineDetail signals={line.signals} sitMap={sitMap} /></div>}
    </li>
  );
};

const LineGroup = ({ label, lines, sitMap, urgent }: { label: string; lines: WorkItem[]; sitMap: Map<string, SitInfo>; urgent?: boolean }) => (
  <div className="overflow-hidden rounded-2xl border border-border bg-card" data-testid="pilotage-group">
    <p className={`border-b border-border/70 px-4 py-3 text-xs font-semibold uppercase tracking-[0.08em] sm:px-5 ${urgent ? "bg-destructive/5 text-destructive" : "text-muted-foreground"}`}>
      {label}
    </p>
    <ul>{lines.map((l, i) => <LineRow key={l.key} line={l} sitMap={sitMap} last={i === lines.length - 1} />)}</ul>
  </div>
);

/** Question 1, suite de l'état du site : les signaux techniques, repliés. */
export const TechnicalSignalsLine = () => {
  const { model, sitMap, loading, error } = usePilotage();
  const [open, setOpen] = useState(false);
  if (loading) return null;
  // Lot ADM14 (lot A V10) : une lecture en échec se dit, la ligne ne disparaît pas.
  if (error || !model || model.unavailable.includes("signals")) {
    return (
      <p className="mt-2 rounded-xl border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-foreground" data-testid="pilotage-technique-error">
        Signaux techniques : lecture impossible.
      </p>
    );
  }
  if (model.technique.length === 0) return null;
  const k = model.technique.length;
  return (
    <div className="mt-2 rounded-xl border border-border bg-card" data-testid="pilotage-technique">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
        <p className="text-sm text-foreground">{k} {k > 1 ? "signaux techniques ouverts" : "signal technique ouvert"} : {technicalFamiliesText(model.technique)}.</p>
        <Button variant="ghost" size="sm" aria-expanded={open} onClick={() => setOpen((o) => !o)}>{open ? "Replier" : "Voir"}</Button>
      </div>
      {open && <LineDetail signals={model.technique} sitMap={sitMap} />}
    </div>
  );
};

/** Question 2 : ce qui vous attend aujourd'hui, la liste de travail entière. */
export const TodaySection = () => {
  const { flagEnabled, flagLoading, model, sitMap, loading, error } = usePilotage();
  if (flagLoading) return null;
  const items = model?.items ?? [];
  const lineCount = items.length;
  const membresWaiting = items.some((i) => i.family === "membres");

  return (
    <section aria-labelledby="pilotage-today" className="space-y-3.5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="pilotage-today" className="font-heading text-2xl font-semibold">Ce qui vous attend aujourd'hui</h2>
        {model && <p className="text-sm text-muted-foreground" data-testid="pilotage-count">{lineCount} {lineCount > 1 ? "lignes" : "ligne"}</p>}
      </div>

      {!flagEnabled && (
        <p className="text-sm text-foreground" data-testid="signals-disabled">
          Les signaux sont désactivés : la file ne se remplit plus et les relances automatiques sont coupées.{" "}
          <Link to="/admin/settings" className="underline">Réactiver dans Paramètres</Link>.
        </p>
      )}

      {loading ? (
        <div className="space-y-2"><Skeleton className="h-16 rounded-2xl" /><Skeleton className="h-16 rounded-2xl" /></div>
      ) : error || !model ? (
        <p className="text-sm text-destructive" data-testid="pilotage-error">Lecture impossible : les files restent ouvertes dans le menu, sous Outils.</p>
      ) : (
        <>
          {model.unavailable.length > 0 && (
            <p className="text-sm font-semibold text-destructive" data-testid="pilotage-unavailable">{unavailableSentence(model.unavailable)}</p>
          )}
          {WORK_FAMILY_ORDER.map((family) => {
            const lines = items.filter((i) => i.family === family);
            if (lines.length === 0) return null;
            return (
              <LineGroup
                key={family}
                label={WORK_FAMILY_LABELS[family]}
                lines={lines}
                sitMap={sitMap}
                urgent={family === "depart" || family === "site"}
              />
            );
          })}
          {lineCount === 0 && model.unavailable.length === 0 && <p className="text-sm text-foreground">Tout est à jour aujourd'hui.</p>}
          {!membresWaiting && !model.unavailable.includes("queues") && (
            <p className="text-sm text-muted-foreground" data-testid="waiting-members">
              Tous les membres ont leur réponse.
            </p>
          )}
        </>
      )}
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

/**
 * Le système s'en charge : ce qui avance seul, pour surveiller sans agir.
 * Lot ADM14 : replié (une phrase), le détail des relances n'est lu qu'à
 * l'ouverture ; la synthèse de la semaine ne s'affiche que le lundi (lot A V12).
 */
export const SystemSection = ({ now = Date.now() }: { now?: number } = {}) => {
  const { model } = usePilotage();
  const [open, setOpen] = useState(false);
  if (!model) return null;
  const headline = model.autoTotal > 0
    ? `${model.autoTotal} ${model.autoTotal > 1 ? "situations suivies" : "situation suivie"} par les relances automatiques.`
    : "Relances automatiques : file vide.";
  return (
    <section aria-labelledby="pilotage-system" className="space-y-2.5 rounded-2xl border border-primary/20 bg-primary/5 p-5 sm:p-6" data-testid="pilotage-systeme">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <h2 id="pilotage-system" className="text-base font-semibold text-primary">Le site s'en charge, vous surveillez</h2>
          <p className="text-[15px] text-foreground">{headline}</p>
        </div>
        <Button variant="ghost" size="sm" className="min-h-11" aria-expanded={open} aria-controls="pilotage-system-detail" onClick={() => setOpen((o) => !o)}>
          {open ? "Replier" : "Voir"}
        </Button>
      </div>
      {open && <SystemDetail model={model} />}
      {isMondayInParis(now) && model.hebdo.length > 0 && (
        <p className="border-t border-primary/15 pt-3 text-sm text-muted-foreground" data-testid="pilotage-hebdo">Synthèse de la semaine : {hebdoBreakdown(model.hebdo)}.</p>
      )}
    </section>
  );
};

const SystemDetail = ({ model }: { model: NonNullable<ReturnType<typeof usePilotage>["model"]> }) => {
  const auto = useAutomation();
  const a = auto.data;
  return (
    <div id="pilotage-system-detail" className="space-y-2.5">
      {model.autoTotal > 0 && (
        <p className="text-[15px] leading-relaxed text-foreground">
          {`Dans le détail : ${autoBreakdown(model.auto)}. Elles remontent dans la liste si le départ approche ou si une relance échoue.`}
        </p>
      )}
      <p className="text-sm text-foreground/80">
        {auto.error
          ? `Relances des dernières 24 heures : ${UNAVAILABLE_LABEL.toLowerCase()}.`
          : !a
            ? "Relances des dernières 24 heures : chargement…"
            : `Dernières 24 heures : ${a.sent24h} ${a.sent24h > 1 ? "relances parties" : "relance partie"}, ${a.waiting24h} en attente d'envoi, ${a.failed24h} en échec. ${a.closed24h} ${a.closed24h > 1 ? "situations closes" : "situation close"} d'elles-mêmes.`}
      </p>
      <Link to="/admin/emails" className="inline-flex min-h-11 items-center text-sm font-semibold text-primary underline underline-offset-2">Voir le détail des relances</Link>
    </div>
  );
};
