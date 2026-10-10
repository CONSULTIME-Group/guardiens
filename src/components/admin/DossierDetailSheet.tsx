import { useCallback, useEffect, useState, type ReactNode } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ErrorState, LoadingState } from "@/components/admin/ui";
import { sitSituation, missionSituation, listingCity } from "@/lib/admin/listingSituation";
import {
  adminLogEvents, APPLICATION_STATUS_LABELS, buildTimeline, countByStatus, missionFieldEvents,
  RESPONSE_STATUS_LABELS, sitFieldEvents, statusCountLabel, statusHistoryEvents, type DossierEvent,
} from "@/lib/admin/listingHistory";

type Kind = "sit" | "mission";

const fmt = (iso?: string | null, withTime = false) =>
  iso ? format(new Date(iso), withTime ? "d MMM yyyy à HH:mm" : "d MMM yyyy", { locale: fr }) : null;

interface LoadState<T> { loading: boolean; error: string | null; data: T | null }
const initial = { loading: true, error: null, data: null };

/** Historique réellement enregistré, chargé à l'ouverture seulement. */
export function useDossierHistory(kind: Kind, item: any | null, enabled: boolean) {
  const [state, setState] = useState<LoadState<DossierEvent[]>>(initial);
  const [nonce, setNonce] = useState(0);
  const retry = useCallback(() => setNonce((n) => n + 1), []);
  useEffect(() => {
    if (!enabled || !item?.id) return;
    let stale = false;
    setState(initial);
    (async () => {
      try {
        const logsP = supabase.from("admin_action_logs").select("action, created_at, note").eq("target_id", item.id)
          .order("created_at", { ascending: true }).limit(200);
        const histP = kind === "sit"
          ? supabase.from("sit_status_history").select("old_status, new_status, changed_at, changed_by, reason").eq("sit_id", item.id)
              .order("changed_at", { ascending: true }).limit(200)
          : Promise.resolve({ data: [], error: null } as any);
        const [logs, hist] = await Promise.all([logsP, histP]);
        if (logs.error) throw logs.error;
        if (hist.error) throw hist.error;
        const fields = kind === "sit" ? sitFieldEvents(item) : missionFieldEvents(item);
        const events = buildTimeline([
          ...fields,
          ...statusHistoryEvents((hist.data ?? []) as any[], item.user_id),
          ...adminLogEvents((logs.data ?? []) as any[]),
        ]);
        if (!stale) setState({ loading: false, error: null, data: events });
      } catch (e: any) {
        if (!stale) setState({ loading: false, error: e?.message || "lecture refusée", data: null });
      }
    })();
    return () => { stale = true; };
  }, [kind, item, enabled, nonce]);
  return { ...state, retry };
}

export function DossierHistory({ kind, item, enabled = true }: { kind: Kind; item: any; enabled?: boolean }) {
  const h = useDossierHistory(kind, item, enabled);
  const onlyFields = !!h.data && h.data.every((e) => e.source === "field");
  return (
    <section className="space-y-2" aria-label="Historique">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Historique</h3>
      {h.loading ? <LoadingState label="Lecture de l'historique…" /> : h.error ? (
        <ErrorState detail={`Historique : ${h.error}`} onRetry={h.retry} />
      ) : (
        <>
          {h.data!.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun événement enregistré pour ce dossier.</p>
          ) : (
            <ol className="space-y-2">
              {h.data!.map((e, i) => (
                <li key={`${e.kind}-${e.at}-${i}`} className="text-sm">
                  <span className="text-muted-foreground tabular-nums">{fmt(e.at, true)}</span>{" · "}
                  <span className="font-medium">{e.label}</span>
                  {e.detail && <span className="text-muted-foreground">, {e.detail}</span>}
                  {e.actor && <span className="text-xs text-muted-foreground"> ({e.actor})</span>}
                </li>
              ))}
            </ol>
          )}
          {onlyFields && (
            <p className="text-xs text-muted-foreground">
              Aucun journal de statut ni d'action de l'équipe pour ce dossier : seules les dates enregistrées sur l'annonce sont connues.
            </p>
          )}
        </>
      )}
    </section>
  );
}

function useCounts(kind: Kind, id: string | null, enabled: boolean) {
  const [state, setState] = useState<LoadState<Record<string, number>>>(initial);
  const [nonce, setNonce] = useState(0);
  const retry = useCallback(() => setNonce((n) => n + 1), []);
  useEffect(() => {
    if (!enabled || !id) return;
    let stale = false;
    setState(initial);
    (async () => {
      const res = kind === "sit"
        ? await supabase.rpc("admin_get_sit_applications", { p_sit_id: id })
        : await supabase.from("small_mission_responses").select("status").eq("mission_id", id);
      if (stale) return;
      if (res.error) setState({ loading: false, error: res.error.message, data: null });
      else setState({ loading: false, error: null, data: countByStatus((res.data ?? []) as any[]) });
    })();
    return () => { stale = true; };
  }, [kind, id, enabled, nonce]);
  return { ...state, retry };
}

interface Props {
  kind: Kind;
  item: any | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Lignes complémentaires (notifiés, vues), déjà chargées par la liste. */
  extra?: ReactNode;
  footer?: ReactNode;
}

/** Audit du 10/10/2026 : comprendre un dossier sans quitter l'admin. */
export function DossierDetailSheet({ kind, item, open, onOpenChange, extra, footer }: Props) {
  const counts = useCounts(kind, item?.id ?? null, open);
  const situation = item ? (kind === "sit" ? sitSituation(item) : missionSituation(item)) : null;
  const labels = kind === "sit" ? APPLICATION_STATUS_LABELS : RESPONSE_STATUS_LABELS;
  const city = item ? (kind === "sit" ? listingCity(item) : { city: item.city ?? null, fromOwner: false }) : null;
  const total = counts.data ? Object.values(counts.data).reduce((a, b) => a + b, 0) : 0;

  const rawDates = (item ? (kind === "sit" ? [
    ["Créée le", fmt(item.created_at)],
    ["Dates de garde", item.start_date ? `${fmt(item.start_date)} au ${fmt(item.end_date) ?? "date de fin non renseignée"}` : null],
    ["Dernière mise en ligne", fmt(item.published_at)],
    ["Retirée le", fmt(item.unpublished_at)],
    ["Masquée le", fmt(item.hidden_at)],
    ["Annulée le", fmt(item.cancelled_at)],
  ] : [
    ["Publiée le", fmt(item.created_at)],
    ["Date du besoin", fmt(item.date_needed)],
    ["Date de fin", fmt(item.end_date)],
    ["Masquée le", fmt(item.hidden_at)],
    ["Clôturée le", fmt(item.closed_at)],
  ]) : []) as Array<[string, string | null]>;
  const dates = rawDates.filter(([, v]) => !!v);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        {item && situation && (
          <>
            <SheetHeader>
              <SheetTitle className="text-base">{item.title || "Sans titre"}</SheetTitle>
              <SheetDescription>
                {city?.city ? `${city.city}${city.fromOwner ? " (ville du profil, l'annonce n'en précise pas)" : ""}` : "Ville non renseignée"}
              </SheetDescription>
            </SheetHeader>
            <div className="mt-5 space-y-5">
              <section className="space-y-1.5" aria-label="Situation">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={situation.tone}>{situation.label}</Badge>
                  {situation.detail && <span className="text-sm text-muted-foreground">{situation.detail}</span>}
                </div>
                <p className="text-sm"><span className="text-muted-foreground">Visibilité : </span>{situation.visible ? "Visible publiquement" : "Non visible publiquement"}</p>
                <p className="text-sm"><span className="text-muted-foreground">Résultat déclaré : </span>{situation.declaredOutcome ?? "Aucun résultat déclaré"}</p>
              </section>
              {dates.length > 0 && (
                <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
                  {dates.map(([k, v]) => (<div key={k} className="contents"><dt className="text-muted-foreground">{k}</dt><dd>{v}</dd></div>))}
                </dl>
              )}
              {extra}
              <Separator />
              <section className="space-y-2" aria-label={kind === "sit" ? "Candidatures" : "Réponses"}>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  {kind === "sit" ? "Candidatures" : "Réponses"}{counts.data ? ` (${total})` : ""}
                </h3>
                {counts.loading ? <LoadingState /> : counts.error ? (
                  <ErrorState detail={counts.error} onRetry={counts.retry} />
                ) : total === 0 ? (
                  <p className="text-sm text-muted-foreground">{kind === "sit" ? "Aucune candidature." : "Aucune réponse."}</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(counts.data!).map(([s, n]) => (
                      <Badge key={s} variant="outline">{statusCountLabel(labels, s)} : {n}</Badge>
                    ))}
                  </div>
                )}
              </section>
              <Separator />
              <DossierHistory kind={kind} item={item} enabled={open} />
              {footer && (<><Separator />{footer}</>)}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

export default DossierDetailSheet;
