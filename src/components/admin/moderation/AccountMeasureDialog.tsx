import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { ModerationRuleSelect } from "./ModerationRuleSelect";
import {
  DEFAULT_OBSERVATION_DAYS,
  MAX_FACTS_LENGTH,
  MAX_OBSERVATION_DAYS,
  SUSPENSION_DURATIONS,
  executeAccountMeasure,
  fetchLastMeasureNotice,
  validateAccountMeasure,
  type AccountMeasure,
  type AccountMeasureInput,
  type AccountMeasureResult,
  type MeasureAutomation,
  type MeasureClient,
  type MeasureMode,
  type MeasureOrigin,
} from "@/lib/admin/accountMeasure";
import { allowsImmediateEffect } from "../../../../supabase/functions/_shared/moderation-rules.ts";

/**
 * Lot J2c : dialogue unique de suspension et de résiliation (CGU 11.3, 11.4,
 * 14.5). L'équipe choisit la règle, décrit les faits, la durée et le mode ;
 * chaque mesure envoie l'email motivé et se journalise. Bouton verrouillé
 * pendant l'appel.
 */
export interface AccountMeasureTarget {
  userId: string;
  userName: string;
  firstName?: string | null;
}

interface Props {
  target: AccountMeasureTarget | null;
  measure: AccountMeasure;
  origin?: MeasureOrigin;
  automated?: MeasureAutomation;
  defaultDurationDays?: number | null;
  /** Indice affiché sous les faits (par exemple le signal détecté). */
  factsHint?: string;
  onClose: () => void;
  onDone?: (result: AccountMeasureResult, input: AccountMeasureInput) => void;
}

const TITLES: Record<AccountMeasure, string> = {
  suspend: "Suspendre le compte",
  terminate: "Résilier le compte",
};

function newMeasureId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
}

function frenchDay(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" });
}

export const AccountMeasureDialog = ({
  target,
  measure,
  origin = "initiative",
  automated = "none",
  defaultDurationDays = 7,
  factsHint,
  onClose,
  onDone,
}: Props) => {
  const open = !!target;
  const [ruleId, setRuleId] = useState("");
  const [facts, setFacts] = useState("");
  const [durationDays, setDurationDays] = useState<number | null>(defaultDurationDays);
  const [mode, setMode] = useState<MeasureMode>("notice");
  const [observationDays, setObservationDays] = useState(DEFAULT_OBSERVATION_DAYS);
  const [priorNoticeAt, setPriorNoticeAt] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const measureIdRef = useRef<string>("");

  useEffect(() => {
    if (!target) return;
    measureIdRef.current = newMeasureId();
    setRuleId("");
    setFacts("");
    setDurationDays(defaultDurationDays);
    setMode("notice");
    setObservationDays(DEFAULT_OBSERVATION_DAYS);
    setPriorNoticeAt(null);
    let alive = true;
    void fetchLastMeasureNotice(supabase as unknown as MeasureClient, target.userId).then((at) => {
      if (alive) setPriorNoticeAt(at);
    });
    return () => { alive = false; };
  }, [target?.userId, defaultDurationDays]); // eslint-disable-line react-hooks/exhaustive-deps

  // Un cas hors 11.4 ne permet pas l'effet immédiat.
  const immediateAllowed = allowsImmediateEffect(ruleId);
  useEffect(() => {
    if (mode === "immediate" && ruleId && !immediateAllowed) setMode("notice");
  }, [ruleId, immediateAllowed, mode]);

  if (!target) return null;

  const input: AccountMeasureInput = {
    measureId: measureIdRef.current,
    userId: target.userId,
    firstName: target.firstName ?? null,
    measure,
    mode,
    ruleId,
    facts,
    durationDays: measure === "suspend" ? durationDays : null,
    observationDays,
    origin,
    automated,
    priorNoticeAt,
  };
  const invalid = validateAccountMeasure(input);

  const confirmLabel = mode === "notice"
    ? "Envoyer l'avertissement"
    : measure === "suspend" ? "Suspendre et notifier" : "Résilier et notifier";

  const submit = async () => {
    if (busy || invalid) return;
    setBusy(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const adminId = userData.user?.id;
      if (!adminId) { toast.error("Session admin introuvable."); return; }
      const result = await executeAccountMeasure(supabase as unknown as MeasureClient, input, adminId);
      if (!result.ok) { toast.error(result.error ?? "Mesure non appliquée."); return; }
      const done = mode === "notice"
        ? "Avertissement enregistré"
        : measure === "suspend" ? "Compte suspendu" : "Compte résilié";
      if (result.email.sent) toast.success(`${done}, email envoyé au membre.`);
      else toast.warning(`${done}, email non parti (${result.email.reason}). Prévenez le membre par écrit.`);
      onDone?.(result, input);
      onClose();
    } finally {
      setBusy(false);
    }
  };

  const radio = (value: MeasureMode, label: string, enabled: boolean, hint?: string) => (
    <label className={`flex items-start gap-2 text-sm ${enabled ? "" : "opacity-50"}`}>
      <input
        type="radio"
        name="measure-mode"
        value={value}
        checked={mode === value}
        disabled={!enabled || busy}
        onChange={() => setMode(value)}
        className="mt-1"
      />
      <span>
        <span className="font-medium">{label}</span>
        {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
      </span>
    </label>
  );

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{TITLES[measure]}</DialogTitle>
          <DialogDescription>
            Membre : <strong>{target.userName}</strong>. Le membre reçoit un email motivé (CGU 14.5).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="measure-rule" className="text-sm font-medium">Règle appliquée</label>
            <ModerationRuleSelect id="measure-rule" value={ruleId} onChange={setRuleId} disabled={busy} />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="measure-facts" className="text-sm font-medium">Faits retenus, en une phrase</label>
            <Textarea
              id="measure-facts"
              value={facts}
              onChange={(e) => setFacts(e.target.value)}
              rows={2}
              maxLength={MAX_FACTS_LENGTH}
              disabled={busy}
              placeholder="Par exemple : une somme a été demandée à un gardien pour la garde du 12/10/2026."
            />
            {factsHint && <p className="text-xs text-muted-foreground">Signal : {factsHint}</p>}
          </div>

          {measure === "suspend" && (
            <div className="space-y-1.5">
              <label htmlFor="measure-duration" className="text-sm font-medium">Durée de la suspension</label>
              <select
                id="measure-duration"
                value={durationDays === null ? "review" : String(durationDays)}
                disabled={busy}
                onChange={(e) => setDurationDays(e.target.value === "review" ? null : Number(e.target.value))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {SUSPENSION_DURATIONS.map((d) => (
                  <option key={d.label} value={d.value === null ? "review" : String(d.value)}>{d.label}</option>
                ))}
              </select>
            </div>
          )}

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium mb-1">Mode</legend>
            {radio("notice", "Prévenir et demander ses observations", true,
              "Email d'avertissement avec délai, le compte reste actif (article 11.3).")}
            {mode === "notice" && (
              <div className="pl-6 flex items-center gap-2 text-sm">
                <label htmlFor="measure-observation-days">Délai en jours</label>
                <input
                  id="measure-observation-days"
                  type="number"
                  min={1}
                  max={MAX_OBSERVATION_DAYS}
                  value={observationDays}
                  disabled={busy}
                  onChange={(e) => setObservationDays(Number(e.target.value))}
                  className="h-9 w-20 rounded-md border border-input bg-background px-2"
                />
              </div>
            )}
            {radio("immediate", "Effet immédiat (cas de l'article 11.4)", immediateAllowed,
              immediateAllowed
                ? "La mesure s'applique tout de suite, puis l'email de décision part. Le membre présente ses observations."
                : "Choisissez un cas de l'article 11.4 pour l'activer.")}
            {radio("after_notice", "Décider après le délai d'observations", !!priorNoticeAt,
              priorNoticeAt
                ? `Avertissement envoyé le ${frenchDay(priorNoticeAt)}.`
                : "Disponible après un avertissement envoyé à ce membre.")}
          </fieldset>

          {invalid && (ruleId || facts) && <p className="text-xs text-destructive">{invalid}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>Annuler</Button>
          <Button
            variant={mode === "notice" ? "default" : "destructive"}
            onClick={() => { void submit(); }}
            disabled={busy || !!invalid}
          >
            {busy ? "En cours…" : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
