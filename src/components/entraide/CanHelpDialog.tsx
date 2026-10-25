import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MAX_MISSION_MESSAGE_LEN, MIN_MISSION_MESSAGE_LEN, canHelpMessage } from "@/lib/missionRespond";
import { ENTRAIDE_COPY } from "@/lib/entraideCopy";
import { canHelpDayOptions, type CanHelpDayOption } from "@/lib/canHelpDays";

/**
 * Fenêtre « Je peux », geste unique de réponse à un besoin.
 * Lot E13 (24/10/2026) : la fenêtre redit le besoin (lieu, date, description,
 * lien vers la fiche) avant le message, et défile sur un petit écran.
 * Lot E18 (25/10/2026) : message vide avec un exemple en placeholder (le
 * « Je peux vous aider. » prérempli faisait 2 réponses sur 13, n° 42) ;
 * choix facultatif « Quand êtes-vous libre ? », enregistré dans
 * small_mission_responses.exchange_date.
 */
export const CanHelpDialog = ({
  open, firstName, needTitle, needMeta, needDescription, detailPath, needDateNeeded, needEndDate, sending, onCancel, onSend,
}: {
  open: boolean;
  firstName: string | null;
  needTitle: string;
  needMeta?: string | null;
  needDescription?: string | null;
  detailPath?: string | null;
  /** Dates du besoin : elles proposent les jours à toucher. */
  needDateNeeded?: string | null;
  needEndDate?: string | null;
  sending: boolean;
  onCancel: () => void;
  /** Message final (jamais vide) et jour choisi au format AAAA-MM-JJ, ou null. */
  onSend: (message: string, exchangeDate: string | null) => void;
}) => {
  const [message, setMessage] = useState("");
  const [day, setDay] = useState<string | null>(null);
  const [otherDay, setOtherDay] = useState("");
  useEffect(() => {
    if (open) { setMessage(""); setDay(null); setOtherDay(""); }
  }, [open]);

  const dayOptions: CanHelpDayOption[] = useMemo(
    () => canHelpDayOptions(needDateNeeded, needEndDate),
    [needDateNeeded, needEndDate],
  );
  const name = firstName || "l'auteur du besoin";
  const typed = message.trim();
  const valid = typed.length === 0 || typed.length >= MIN_MISSION_MESSAGE_LEN;
  const chosenDay = day === "other" ? (otherDay || null) : day;
  const chosenLabel = day === "other"
    ? null
    : dayOptions.find((o) => o.value === day)?.label ?? null;

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onCancel(); }}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto rounded-card sm:rounded-card">
        <DialogHeader>
          <DialogTitle>Vous proposez votre aide à {name}</DialogTitle>
          <DialogDescription className="text-[15px] font-semibold leading-snug text-foreground">{needTitle}</DialogDescription>
        </DialogHeader>
        <section aria-label="Le besoin" className="space-y-2 rounded-card border border-border bg-muted/30 p-3" data-testid="can-help-need">
          {needMeta && <p className="text-sm text-foreground">{needMeta}</p>}
          {needDescription && (
            <p className="max-h-48 overflow-y-auto whitespace-pre-line text-sm leading-relaxed text-foreground" data-testid="can-help-description">
              {needDescription}
            </p>
          )}
          {detailPath && (
            <Link to={detailPath} className="inline-flex min-h-11 items-center text-sm font-semibold text-primary underline underline-offset-2">
              {ENTRAIDE_COPY.readWholeNeed}
            </Link>
          )}
        </section>

        <fieldset className="space-y-2" data-testid="can-help-days">
          <legend className="text-sm font-semibold text-foreground">
            {ENTRAIDE_COPY.whenFree} <span className="font-normal text-muted-foreground">(facultatif)</span>
          </legend>
          <div className="flex flex-wrap gap-2">
            {dayOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                aria-pressed={day === option.value}
                onClick={() => setDay(day === option.value ? null : option.value)}
                className={`min-h-11 rounded-field border px-3 text-sm font-medium transition-colors ${day === option.value ? "border-primary bg-primary/10 text-foreground" : "border-field bg-card text-foreground hover:border-primary/60"}`}
              >
                {option.label}
              </button>
            ))}
            <button
              type="button"
              aria-pressed={day === "other"}
              onClick={() => setDay(day === "other" ? null : "other")}
              className={`min-h-11 rounded-field border px-3 text-sm font-medium transition-colors ${day === "other" ? "border-primary bg-primary/10 text-foreground" : "border-field bg-card text-foreground hover:border-primary/60"}`}
            >
              Un autre jour
            </button>
          </div>
          {day === "other" && (
            <div className="space-y-1">
              <label htmlFor="can-help-day" className="text-sm text-foreground">Le jour qui vous va</label>
              <input
                id="can-help-day"
                type="date"
                value={otherDay}
                min={new Date().toISOString().slice(0, 10)}
                onChange={(event) => setOtherDay(event.target.value)}
                className="block min-h-11 w-full rounded-field border border-field bg-card px-3 text-base text-foreground"
              />
            </div>
          )}
        </fieldset>

        <label htmlFor="can-help-message" className="text-sm font-semibold text-foreground">
          Un mot pour {name} <span className="font-normal text-muted-foreground">(facultatif)</span>
        </label>
        <Textarea
          id="can-help-message"
          value={message}
          maxLength={MAX_MISSION_MESSAGE_LEN}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Par exemple : je passe samedi matin, j'ai l'habitude de ce genre de coup de main."
          rows={3}
          className="rounded-field border-field"
        />
        <p className="text-sm text-muted-foreground">
          {name} voit votre prénom et vous répond dans la messagerie. La rencontre reste libre.
        </p>
        <DialogFooter className="gap-2">
          <Button type="button" variant="ghost" className="rounded-full" onClick={onCancel}>Revenir au besoin</Button>
          <Button
            type="button"
            className="rounded-full"
            onClick={() => onSend(canHelpMessage(typed, chosenLabel ?? (chosenDay ? formatIsoDay(chosenDay) : null)), chosenDay)}
            disabled={!valid || sending}
          >
            {sending ? "Envoi..." : firstName ? `Envoyer à ${firstName}` : ENTRAIDE_COPY.send}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

function formatIsoDay(iso: string): string | null {
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
}

export default CanHelpDialog;
