/**
 * Lot J2-B : pilotage d'Alma. Taux d'action à 10 minutes, retours utile /
 * pas utile, et rejeu du jeu de non-régression, uniquement au clic.
 */
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ALMA_REPLAY_CASES } from "@/data/almaReplayCases";
import { checkReplayAnswer } from "@/lib/alma/replayChecks";

interface RateRow { action_reason: string; register: string; answers: number; acted: number }
interface ReplayResult { id: string; question: string; passed: boolean; reasons: string[]; answer: string }
interface ReplayRun { id: string; created_at: string; total: number; passed: number; failed: number; results: ReplayResult[] }

const pct = (n: number, d: number) => (d > 0 ? `${Math.round((100 * n) / d)} %` : "·");

export function PilotageTab({ range }: { range: "7d" | "30d" | "90d" }) {
  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  const [rates, setRates] = useState<RateRow[] | null>(null);
  const [feedback, setFeedback] = useState<{ useful: number; notUseful: number } | null>(null);
  const [runs, setRuns] = useState<ReplayRun[]>([]);
  const [replaying, setReplaying] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [r, f, h] = await Promise.all([
      (supabase.rpc as any)("admin_alma_action_rate", { p_days: days }),
      (supabase.from as any)("alma_feedback").select("value").gte("created_at", new Date(Date.now() - days * 86_400_000).toISOString()),
      (supabase.from as any)("alma_replay_runs").select("id, created_at, total, passed, failed, results").order("created_at", { ascending: false }).limit(5),
    ]);
    if (r.error) setError("Taux d'action indisponible.");
    setRates((r.data ?? []) as RateRow[]);
    const vals = ((f.data ?? []) as { value: string }[]).map((x) => x.value);
    setFeedback({ useful: vals.filter((v) => v === "useful").length, notUseful: vals.filter((v) => v === "not_useful").length });
    setRuns((h.data ?? []) as ReplayRun[]);
  }, [days]);

  useEffect(() => { void load(); }, [load]);

  const replay = async () => {
    setError(null);
    const results: ReplayResult[] = [];
    setReplaying({ done: 0, total: ALMA_REPLAY_CASES.length });
    for (const c of ALMA_REPLAY_CASES) {
      const { data, error: e } = await supabase.functions.invoke("alma-chat", {
        body: {
          replay: true,
          message: c.question,
          history: c.history.map((q) => ({ role: "user", content: q })),
          surface: c.surface,
          active_role: c.activeRole,
        },
      });
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
          });
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
  const totalAnswers = (rates ?? []).reduce((s, r) => s + Number(r.answers), 0);
  const totalActed = (rates ?? []).reduce((s, r) => s + Number(r.acted), 0);

  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Card>
        <CardHeader><CardTitle className="text-base">Action à 10 minutes</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>Toutes réponses : {pct(totalActed, totalAnswers)} ({totalActed} sur {totalAnswers}).</p>
          <table className="w-full text-left text-sm">
            <thead><tr className="text-muted-foreground"><th>Action proposée</th><th>Registre</th><th>Réponses</th><th>Taux</th></tr></thead>
            <tbody>
              {(rates ?? []).map((r) => (
                <tr key={`${r.action_reason}-${r.register}`}>
                  <td>{r.action_reason}</td><td>{r.register}</td><td>{r.answers}</td><td>{pct(Number(r.acted), Number(r.answers))}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {feedback && (
            <p>Retours : {feedback.useful} utile, {feedback.notUseful} pas utile ({pct(feedback.notUseful, feedback.useful + feedback.notUseful)} pas utile).</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Jeu de non-régression ({ALMA_REPLAY_CASES.length} cas réels)</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          <Button onClick={() => void replay()} disabled={!!replaying}>
            {replaying ? `Rejeu en cours, ${replaying.done} sur ${replaying.total}` : "Rejouer le jeu de test"}
          </Button>
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
