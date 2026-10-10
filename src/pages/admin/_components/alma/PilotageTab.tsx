import { adminLabel, ALMA_REGISTER_LABELS } from "@/lib/admin/labels";
import { measureActionFollowUp } from "@/lib/admin/alma-conversations";
/**
 * Lot J2-B : pilotage d'Alma. Taux d'action à 10 minutes, retours utile /
 * pas utile, et rejeu du jeu de non-régression, uniquement au clic.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { fetchAllRows } from "@/lib/admin/fetchAllRows";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ALMA_REPLAY_CASES } from "@/data/almaReplayCases";
import { checkReplayAnswer, sameOpener } from "@/lib/alma/replayChecks";
import { measureCompanion, SHARED_OPENER_TARGET, type CompanionMeasure } from "@/lib/alma/companionMetrics";

interface RateRow { action_reason: string; register: string; answers: number; acted: number }
interface ReplayResult { id: string; question: string; passed: boolean; reasons: string[]; answer: string }
interface ReplayRun { id: string; created_at: string; total: number; passed: number; failed: number; results: ReplayResult[] }

const pct = (n: number, d: number) => (d > 0 ? `${Math.round((100 * n) / d)} %` : "·");

export function PilotageTab({ range }: { range: "7d" | "30d" | "90d" }) {
  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  type Block<T> = { state: "loading" | "ok" | "error"; value: T | null; truncated?: boolean };
  const loading = { state: "loading" as const, value: null };
  const [ratesB, setRatesB] = useState<Block<RateRow[]>>(loading);
  const [feedbackB, setFeedbackB] = useState<Block<{ useful: number; notUseful: number }>>(loading);
  const [companionB, setCompanionB] = useState<Block<CompanionMeasure>>(loading);
  const [runsB, setRunsB] = useState<Block<ReplayRun[]>>(loading);
  const [replaying, setReplaying] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const version = useRef(0);
  const rates = ratesB.value;
  const feedback = feedbackB.value;
  const companion = companionB.value;
  const runs = runsB.value ?? [];

  const load = useCallback(async () => {
    const v = ++version.current;
    const fresh = () => v === version.current; // réponse d'une période obsolète ignorée
    setRatesB(loading); setFeedbackB(loading); setCompanionB(loading); setRunsB(loading);
    const since = new Date(Date.now() - days * 86_400_000).toISOString();
    const run = async <T,>(set: (b: Block<T>) => void, fn: () => Promise<{ value: T; truncated?: boolean }>) => {
      try { const r = await fn(); if (fresh()) set({ state: "ok", value: r.value, truncated: r.truncated }); }
      catch { if (fresh()) set({ state: "error", value: null }); }
    };
    await Promise.all([
      run(setRatesB, async () => {
        const r = await (supabase.rpc as any)("admin_alma_action_rate", { p_days: days });
        if (r.error) throw r.error;
        return { value: (r.data ?? []) as RateRow[] };
      }),
      run(setFeedbackB, async () => {
        const res = await fetchAllRows<{ value: string; id: string }>((from, to) =>
          (supabase.from as any)("alma_feedback").select("id, value").gte("created_at", since).order("id").range(from, to));
        const vals = res.rows.map((x) => x.value);
        return { value: { useful: vals.filter((x) => x === "useful").length, notUseful: vals.filter((x) => x === "not_useful").length }, truncated: res.truncated };
      }),
      run(setRunsB, async () => {
        const h = await (supabase.from as any)("alma_replay_runs").select("id, created_at, total, passed, failed, results").order("created_at", { ascending: false }).limit(5);
        if (h.error) throw h.error;
        return { value: (h.data ?? []) as ReplayRun[] };
      }),
      // Lot L4 : variété des amorces et replis sur gabarit, même lecture paginée que Conversations.
      run(setCompanionB, async () => {
        const res = await fetchAllRows<any>((from, to) =>
          (supabase.from as any)("alma_conversations").select("id, answer, classification").gte("created_at", since)
            .order("created_at", { ascending: false }).order("id", { ascending: false }).range(from, to), { cap: 5000 });
        return { value: measureCompanion(res.rows), truncated: res.truncated };
      }),
    ]);
  }, [days]);

  const Unavailable = ({ label }: { label: string }) => (
    <p className="flex flex-wrap items-center gap-2 text-destructive">
      {label} : indisponible, la lecture a échoué.
      <Button variant="outline" size="sm" onClick={() => void load()}>Réessayer</Button>
    </p>
  );

  useEffect(() => { void load(); }, [load]);

  const replay = async () => {
    setError(null);
    const results: ReplayResult[] = [];
    setReplaying({ done: 0, total: ALMA_REPLAY_CASES.length });
    for (const c of ALMA_REPLAY_CASES) {
      const ask = (recent?: string[]) => supabase.functions.invoke("alma-chat", {
        body: {
          replay: true,
          message: c.question,
          history: c.history.map((q) => ({ role: "user", content: q })),
          surface: c.surface,
          active_role: c.activeRole,
          ...(c.pagePath ? { page_path: c.pagePath } : {}),
          // Lot L4 : contexte simulé du membre, et réponses récentes pour la variété.
          replay_context: { ...(c.replayContext ?? {}), ...(recent ? { recent_answers: recent } : {}) },
        },
      });
      const { data, error: e } = await ask();
      const d = (data ?? {}) as any;
      const answer = typeof d.answer === "string" ? d.answer : "";
      const verdict = e || !answer
        ? { passed: false, reasons: ["aucune réponse"] }
        : checkReplayAnswer({
            question: c.question,
            answer,
            action: d.action ?? null,
            chips: d.chips ?? null,
            register: d.replay_meta?.register ?? null,
            frustration: d.replay_meta?.classification?.frustration ?? null,
            confirmedSit: d.replay_meta?.confirmed_sit ?? null,
            expect: c.expect ?? null,
          });
      // Lot L4 : deux réponses à la même question ne commencent pas pareil.
      if (c.varietyCheck && answer) {
        const again = await ask([answer]);
        const second = typeof (again.data as any)?.answer === "string" ? (again.data as any).answer : "";
        if (second && sameOpener(answer, second)) {
          verdict.passed = false;
          verdict.reasons = [...verdict.reasons, "même amorce sur deux réponses"];
        }
      }
      results.push({ id: c.id, question: c.question, answer: answer.slice(0, 400), ...verdict });
      setReplaying({ done: results.length, total: ALMA_REPLAY_CASES.length });
    }
    const { data: auth } = await supabase.auth.getUser();
    const passed = results.filter((r) => r.passed).length;
    const { error: insErr } = await (supabase.from as any)("alma_replay_runs").insert({
      run_by: auth?.user?.id,
      total: results.length,
      passed,
      failed: results.length - passed,
      results,
    });
    if (insErr) setError("Résultats non enregistrés.");
    setReplaying(null);
    void load();
  };

  const last = runs[0];
  const measure = measureActionFollowUp(rates ?? []);
  // Lot J4 : les lignes « aucune » (échanges sans action, surtout d'avant J2-A)
  // ne remplissent plus le tableau ; elles sont comptées en une phrase.
  const withAction = (rates ?? []).filter((r) => r.action_reason && r.action_reason !== "aucune");
  const withoutAction = (rates ?? [])
    .filter((r) => !r.action_reason || r.action_reason === "aucune")
    .reduce((s, r) => s + (Number(r.answers) || 0), 0);

  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Card>
        <CardHeader><CardTitle className="text-base">Action à 10 minutes</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {ratesB.state === "loading" ? <p className="text-muted-foreground">Lecture en cours.</p> : ratesB.state === "error" ? <Unavailable label="Taux d'action" /> : (<>
          <p>
            {measure.rate === null
              ? "Non mesurable : aucune réponse de la période ne propose d'action, en dehors des comptes admins."
              : `Réponses avec action : ${pct(measure.count, measure.total)} (${measure.count} sur ${measure.total}).`}
          </p>
          <p className="text-muted-foreground">
            Réponses sans action proposée : {withoutAction}. Comptes admins exclus : vos propres tests n'entrent pas dans ce calcul.
          </p>
          {withAction.length > 0 && (
          <table className="w-full text-left text-sm">
            <thead><tr className="text-muted-foreground"><th>Action proposée</th><th>Registre</th><th>Réponses</th><th>Taux</th></tr></thead>
            <tbody>
              {withAction.map((r) => (
                <tr key={`${r.action_reason}-${r.register}`}>
                  <td>{adminLabel(r.action_reason)}</td><td>{adminLabel(r.register, ALMA_REGISTER_LABELS)}</td><td>{r.answers}</td><td>{pct(Number(r.acted), Number(r.answers))}</td>
                </tr>
              ))}
            </tbody>
          </table>
          )}
          </>)}
          {feedbackB.state === "error" && <Unavailable label="Retours" />}
          {feedbackB.truncated && <p className="text-muted-foreground">Retours : données partielles, plafond de lecture atteint.</p>}
          {feedbackB.state === "loading" && <p className="text-muted-foreground">Retours : lecture en cours.</p>}
          {feedback && (
            <p>
              {feedback.useful + feedback.notUseful === 0
                ? "Retours : aucun retour sur la période."
                : `Retours : ${feedback.useful} utile, ${feedback.notUseful} pas utile (${pct(feedback.notUseful, feedback.useful + feedback.notUseful)} pas utile).`}
            </p>
          )}
        </CardContent>
      </Card>

      {companionB.state !== "ok" && (
        <Card>
          <CardHeader><CardTitle className="text-base">Compagnon : variété et faits</CardTitle></CardHeader>
          <CardContent className="text-sm">
            {companionB.state === "loading" ? <p className="text-muted-foreground">Lecture en cours.</p> : <Unavailable label="Mesures du compagnon" />}
          </CardContent>
        </Card>
      )}
      {companion && (
        <Card>
          <CardHeader><CardTitle className="text-base">Compagnon : variété et faits</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              Réponses partageant leurs cinq premiers mots : {pct(companion.sharedOpeners, companion.answers)} ({companion.sharedOpeners} sur {companion.answers}), objectif sous {Math.round(SHARED_OPENER_TARGET * 100)} %.
            </p>
            {companionB.truncated && <p className="text-muted-foreground">Données partielles : 5 000 réponses les plus récentes de la période.</p>}
            <p>
              Replis sur gabarit : {companion.lockedChecked === 0 ? "aucune réponse contrôlée sur la période." : `${pct(companion.fallbacks, companion.lockedChecked)} (${companion.fallbacks} sur ${companion.lockedChecked} réponses à faits verrouillés).`}
            </p>
            {feedback && (
              <p>Pas utile : {feedback.useful + feedback.notUseful === 0 ? "aucun retour sur la période." : `${pct(feedback.notUseful, feedback.useful + feedback.notUseful)} des retours.`}</p>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Jeu de non-régression ({ALMA_REPLAY_CASES.length} cas réels)</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          <Button onClick={() => void replay()} disabled={!!replaying}>
            {replaying ? `Rejeu en cours, ${replaying.done} sur ${replaying.total}` : "Rejouer le jeu de test"}
          </Button>
          {runsB.state === "loading" && <p className="text-muted-foreground">Historique des rejeux : lecture en cours.</p>}
          {runsB.state === "error" && <Unavailable label="Historique des rejeux" />}
          {runsB.state === "ok" && !last && <p className="text-muted-foreground">Aucun rejeu enregistré.</p>}
          {last && (
            <div className="space-y-2">
              <p>
                Dernier rejeu, {new Date(last.created_at).toLocaleString("fr-FR")} : {last.passed} réussis, {last.failed} échoués.
              </p>
              <ul className="space-y-1">
                {last.results.map((r) => (
                  <li key={r.id} className={r.passed ? "text-muted-foreground" : "text-destructive"}>
                    {r.id}, {r.passed ? "réussi" : "échoué"} : « {r.question} »{r.reasons.length ? ` (${r.reasons.join(", ")})` : ""}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
