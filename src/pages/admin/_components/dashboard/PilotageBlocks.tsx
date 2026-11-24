import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { KpiTile } from "@/components/admin/ui";
import { useFeatureFlag } from "@/hooks/useFeatureFlag";
import { useWorkList, workListCountText, WORK_LIST_QUERY_KEY } from "@/hooks/useWorkList";
import { isMondayInParis, technicalFamiliesText } from "@/lib/admin/overviewText";
import { UNAVAILABLE_LABEL, reportAdminReadError } from "@/lib/admin/readError";
import {
  autoBreakdown,
  hebdoBreakdown,
  unavailableSentence,
  type PilotageSignal,
  type WorkItem,
} from "@/lib/admin/pilotage";
import { buildActionQueue } from "@/components/admin/signals/actionQueue";
import type { AdminSignalBase } from "@/components/admin/signals/signalGrouping";
import type { SitInfo } from "@/components/admin/signals/SitSignalGroupCard";
import { AUTO_RELANCE_TEMPLATES } from "../../../../../supabase/functions/_shared/admin-signal-config.ts";
import { renderEntry } from "./signalEntries";
import { applyOwnerAbsence, broadcastSitIds, buildGestures, gesturesSentence, type Gesture, type GestureWrite } from "@/lib/admin/gestures";
import { memberMessageDrafts } from "@/lib/admin/memberMessageDrafts";
import { ownerMessageDraft } from "@/lib/admin/ownerMessageDrafts";
import { BroadcastSitDialog } from "@/components/admin/signals/BroadcastSitDialog";
import type { AdminSignal as BroadcastSignal } from "@/components/admin/signals/NoApplicationsCard";
import { IgnoreSignalsButton } from "@/components/admin/signals/IgnoreSignalsButton";
import { WriteToMemberDialog, type WriteToMemberTarget } from "../users/WriteToMemberDialog";
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

/** Liens nommés montrés sur une ligne, au plus (lot ADM16). */
export const ELEMENT_LINKS_SHOWN = 3;

const LINK_CLASS = "inline-flex min-h-11 items-center text-[13px] font-semibold text-primary underline underline-offset-2";
/** Lot VE-6 : « Marquer comme traité » se lit comme un lien de la ligne, en retrait des gestes. */
const CLOSE_CLASS = "h-auto min-h-11 rounded-none px-0 py-0 text-[13px] font-semibold text-muted-foreground underline underline-offset-2 hover:bg-transparent hover:text-foreground";
const PRIMARY_CLASS = "min-h-11 w-full rounded-full px-5 font-bold sm:w-auto";

/** Ce que le membre a écrit à Alma ce jour-là, pour le rappeler au-dessus du message. */
async function almaContextLines(g: Gesture): Promise<string[]> {
  const fallback = g.quote ? [`${g.detail} Son message : « ${g.quote} »`] : [g.detail];
  const userId = g.write?.userId;
  const oldest = g.signals.map((s) => s.detected_at).sort()[0];
  if (!userId || !oldest) return fallback;
  const from = new Date(new Date(oldest).getTime() - 6 * 3_600_000).toISOString();
  const { data, error } = await supabase
    .from("alma_conversations")
    .select("question, created_at")
    .eq("user_id", userId)
    .gte("created_at", from)
    .order("created_at", { ascending: true })
    .limit(6);
  const asked = (data ?? []).map((r) => (typeof r.question === "string" ? r.question.trim() : "")).filter(Boolean);
  if (error || asked.length === 0) return fallback;
  return [g.detail, `Ses messages à Alma : ${asked.map((q) => `« ${q.slice(0, 160)} »`).join(", ")}.`];
}

/** Cible du composeur pour une ligne « Écrire à… » : contexte, trois versions, messagerie d'abord. */
async function writeTargetOf(g: Gesture, w: GestureWrite, closes: boolean): Promise<WriteToMemberTarget> {
  const m = g.signals[0]?.metadata ?? {};
  const alma = w.topic === "alma_help" || w.topic === "alma_churn";
  const drafts = memberMessageDrafts(w.topic, {
    name: w.firstName,
    quote: g.quote,
    subjectHint: alma && Array.isArray(m.messages) ? (m.messages as { bug_item?: string }[])[0]?.bug_item : null,
    city: typeof m.sit_city === "string" ? m.sit_city : null,
    startsWhen: g.chip.startsWith("Départ ") ? g.chip.replace(/^Départ /, "") : null,
    sittersNearby: Number(m.eligible_sitters_count ?? 0) || 0,
    daysPublished: Number(m.days_since_published ?? 0) || 0,
    daysQuiet: Number(m.days_since_last_application ?? 0) || 0,
  });
  return {
    userId: w.userId,
    userName: w.firstName || (w.topic === "no_applications" ? "le propriétaire" : "ce membre"),
    sitId: w.sitId,
    drafts,
    channel: "message",
    context: { lines: alma ? await almaContextLines(g) : [g.title, g.detail], link: alma ? { label: "Les échanges avec Alma", to: "/admin/alma" } : undefined },
    signalIds: closes ? g.signals.map((s) => s.id) : undefined,
  };
}

/**
 * Lot VE-6 : message au propriétaire d'une ligne de garde, texte prêt par
 * ownerMessageDraft (mêmes gabarits que la carte de l'annonce).
 */
export function ownerWriteTargetOf(g: Gesture): WriteToMemberTarget | null {
  const o = g.ownerWrite;
  if (!o) return null;
  const name = o.firstName || "le propriétaire";
  return {
    userId: o.userId,
    userName: name,
    sitId: o.sitId,
    draft: ownerMessageDraft(o.types, { ownerName: name, city: o.city, startDate: o.startDate, applications: o.applications }) ?? undefined,
  };
}

/**
 * Lot VE-6 : dernière visite des propriétaires des annonces « aucune
 * candidature », en une lecture pour toutes les lignes (même jointure que
 * useSitOwnerLastSeen, cache 5 minutes). En échec, la liste reste telle quelle.
 */
export function useSitOwnersLastSeen(sitIds: string[]) {
  return useQuery<Map<string, string | null>>({
    queryKey: ["admin-sits-owner-last-seen", sitIds],
    enabled: sitIds.length > 0,
    staleTime: 5 * 60_000,
    retry: 1,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sits")
        .select("id, owner:profiles!sits_user_id_fkey(last_seen_at)")
        .in("id", sitIds);
      if (error) throw error;
      const rows = (data ?? []) as unknown as { id: string; owner?: { last_seen_at?: string | null } | null }[];
      return new Map(rows.map((r) => [r.id, r.owner?.last_seen_at ?? null]));
    },
  });
}

/** Lot VE-6 : à l'envoi du message au propriétaire, les signaux de la ligne se ferment (comme SitSignalGroupCard). */
async function closeAsOwnerWritten(ids: string[]): Promise<boolean> {
  if (ids.length === 0) return true;
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase
    .from("admin_signals")
    .update({ resolved_at: new Date().toISOString(), action_taken: "owner_written", admin_id: user?.id ?? null })
    .in("id", ids);
  return !error;
}

/**
 * Lot VE-1 : une ligne = une personne ou une annonce. Le bouton porte le
 * verbe et fait le geste sur place : écrire (message prêt), prévenir les
 * gardiens (diffusion), ouvrir la file, ou déplier la carte d'action du signal.
 */
const GestureRow = ({ g, sitMap, last, onWrite, onOwnerWrite }: {
  g: Gesture;
  sitMap: Map<string, SitInfo>;
  last: boolean;
  onWrite: (g: Gesture, w: GestureWrite, closes: boolean) => void;
  onOwnerWrite: (g: Gesture) => void;
}) => {
  const [open, setOpen] = useState(false);
  const [more, setMore] = useState(false);
  const [broadcast, setBroadcast] = useState(false);
  const qc = useQueryClient();
  const id = `pilotage-${g.key.replace(/[^a-z0-9_-]/gi, "-")}`;
  // Lot VE-6 : propriétaire absent, le bouton écrit et la diffusion passe en lien.
  const ownerAway = g.kind === "broadcast" && g.ownerAbsentDays != null && !!g.secondaryWrite;
  // Lot VE-6 : toute ligne qui porte des signaux se ferme d'un mot, sur la ligne.
  const closable = g.signals.length > 0 && g.kind !== "more";
  return (
    <li className={last ? "" : "border-b border-border/70"} data-testid="pilotage-line" data-family={g.family} data-kind={g.kind}>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-4 py-4 sm:px-5">
        <div className="min-w-0 flex-[1_1_320px]">
          <p className="text-[15px] font-semibold text-foreground">{g.title}</p>
          <p className="mt-0.5 text-[13px] text-muted-foreground">{g.detail}</p>
          {g.quote && <p className="mt-1.5 inline-block rounded-lg bg-muted/60 px-3 py-2 text-sm text-foreground">« {g.quote.slice(0, 200)} »</p>}
          {(g.links.length > 0 || g.secondaryWrite || g.moreActions || closable) && (
            <ul className="mt-1.5 flex flex-wrap gap-x-4 gap-y-0" data-testid="pilotage-elements">
              {g.links.slice(0, ELEMENT_LINKS_SHOWN).map((l) => (
                <li key={l.to + l.label}><Link to={l.to} className={LINK_CLASS}>{l.label}</Link></li>
              ))}
              {g.secondaryWrite && !ownerAway && (
                <li><button type="button" className={LINK_CLASS} onClick={() => onWrite(g, g.secondaryWrite!, false)}>{g.secondaryWrite.label}</button></li>
              )}
              {ownerAway && (
                <li><button type="button" className={LINK_CLASS} data-testid="pilotage-broadcast-link" onClick={() => setBroadcast(true)}>Diffuser l'annonce</button></li>
              )}
              {g.moreActions && (
                <li><button type="button" className={LINK_CLASS} aria-expanded={more} onClick={() => setMore((v) => !v)}>{more ? "Replier" : "Autres gestes"}</button></li>
              )}
              {closable && (
                <li data-testid="pilotage-close"><IgnoreSignalsButton ids={g.signals.map((s) => s.id)} label="Marquer comme traité" className={CLOSE_CLASS} done /></li>
              )}
            </ul>
          )}
        </div>
        <span className={`text-[13px] ${TONE_CLASS[g.tone]}`}>{g.chip}</span>
        {g.kind === "link" ? (
          <Button asChild variant="outline" className={PRIMARY_CLASS}><Link to={g.link ?? "/admin"}>{g.actionLabel}</Link></Button>
        ) : g.kind === "write" ? (
          <Button className={PRIMARY_CLASS} onClick={() => (g.ownerWrite ? onOwnerWrite(g) : g.write && onWrite(g, g.write, true))}>{g.actionLabel}</Button>
        ) : ownerAway ? (
          <Button className={PRIMARY_CLASS} onClick={() => onWrite(g, g.secondaryWrite!, false)}>{g.actionLabel}</Button>
        ) : g.kind === "broadcast" ? (
          <Button className={PRIMARY_CLASS} onClick={() => setBroadcast(true)}>{g.actionLabel}</Button>
        ) : (
          <Button variant="outline" className={PRIMARY_CLASS} aria-expanded={open} aria-controls={id} onClick={() => setOpen((o) => !o)}>
            {open ? "Replier" : g.actionLabel}
          </Button>
        )}
      </div>
      {((g.kind === "card" && open) || (g.moreActions && more)) && <div id={id}><LineDetail signals={g.signals} sitMap={sitMap} /></div>}
      {g.kind === "more" && open && (
        <ul id={id} className="border-t border-border/70 bg-muted/20">
          {(g.children ?? []).map((c, i) => <GestureRow key={c.key} g={c} sitMap={sitMap} last={i === (g.children?.length ?? 0) - 1} onWrite={onWrite} onOwnerWrite={onOwnerWrite} />)}
        </ul>
      )}
      {g.kind === "broadcast" && broadcast && (
        <BroadcastSitDialog
          open={broadcast}
          onOpenChange={setBroadcast}
          signal={g.signals[0] as unknown as BroadcastSignal}
          onSent={() => { void qc.invalidateQueries({ queryKey: ["admin_dashboard_snapshot"] }); }}
        />
      )}
    </li>
  );
};

const BUCKET_LABELS = { today: "Aujourd'hui", week: "Cette semaine" } as const;

const GestureGroup = ({ bucket, rows, sitMap, onWrite, onOwnerWrite }: {
  bucket: "today" | "week";
  rows: Gesture[];
  sitMap: Map<string, SitInfo>;
  onWrite: (g: Gesture, w: GestureWrite, closes: boolean) => void;
  onOwnerWrite: (g: Gesture) => void;
}) => (
  <div className="overflow-hidden rounded-2xl border border-border bg-card" data-testid="pilotage-group" data-bucket={bucket}>
    <p className={`border-b border-border/70 px-4 py-3 text-xs font-semibold uppercase tracking-[0.08em] sm:px-5 ${bucket === "today" ? "bg-destructive/5 text-destructive" : "text-muted-foreground"}`}>
      {BUCKET_LABELS[bucket]}
    </p>
    <ul>{rows.map((g, i) => <GestureRow key={g.key} g={g} sitMap={sitMap} last={i === rows.length - 1} onWrite={onWrite} onOwnerWrite={onOwnerWrite} />)}</ul>
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

/** Question 2 : ce qui vous attend, une ligne par personne ou par annonce (lot VE-1). */
export const TodaySection = () => {
  const { flagEnabled, flagLoading, model, sitMap, loading, error } = usePilotage();
  const [writeTarget, setWriteTarget] = useState<WriteToMemberTarget | null>(null);
  // Lot VE-6 : signaux à fermer quand le message au propriétaire est parti.
  const [ownerSignalIds, setOwnerSignalIds] = useState<string[]>([]);
  const qc = useQueryClient();
  const built = useMemo(() => buildGestures(model), [model]);
  const sitIds = useMemo(() => broadcastSitIds(built), [built]);
  const lastSeen = useSitOwnersLastSeen(sitIds);
  if (flagLoading) return null;
  const gestures = applyOwnerAbsence(built, lastSeen.data);
  const membresWaiting = (model?.items ?? []).some((i) => i.family === "membres");
  const onWrite = (g: Gesture, w: GestureWrite, closes: boolean) => {
    setOwnerSignalIds([]);
    void writeTargetOf(g, w, closes).then(setWriteTarget);
  };
  const onOwnerWrite = (g: Gesture) => {
    setOwnerSignalIds(g.signals.map((s) => s.id));
    setWriteTarget(ownerWriteTargetOf(g));
  };
  const onSent = () => {
    if (ownerSignalIds.length === 0) return;
    void closeAsOwnerWritten(ownerSignalIds).then((ok) => {
      if (!ok) toast.error("Message parti, la ligne reste dans la liste : marquez-la comme traitée.");
      void qc.invalidateQueries({ queryKey: ["admin_dashboard_snapshot"] });
    });
  };

  return (
    <section aria-labelledby="pilotage-today" className="space-y-3.5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="pilotage-today" className="font-heading text-2xl font-semibold">Ce qui vous attend</h2>
        {model && <p className="text-sm text-muted-foreground" data-testid="pilotage-count">{workListCountText(gestures.length)}</p>}
      </div>
      {model && !error && <p className="text-[15px] text-foreground" data-testid="pilotage-sentence">{gesturesSentence(gestures)}</p>}

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
          {(["today", "week"] as const).map((bucket) => {
            const rows = gestures.filter((g) => g.bucket === bucket);
            return rows.length === 0 ? null : <GestureGroup key={bucket} bucket={bucket} rows={rows} sitMap={sitMap} onWrite={onWrite} onOwnerWrite={onOwnerWrite} />;
          })}
          {!membresWaiting && !model.unavailable.includes("queues") && (
            <p className="text-sm text-muted-foreground" data-testid="waiting-members">
              Tous les membres ont leur réponse.
            </p>
          )}
        </>
      )}
      <WriteToMemberDialog target={writeTarget} onClose={() => setWriteTarget(null)} onSent={onSent} />
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
          onClick={() => navigate("/admin/listings?filter=awaiting_reply")}
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
          onClick={() => navigate("/admin/users?new=7")}
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
