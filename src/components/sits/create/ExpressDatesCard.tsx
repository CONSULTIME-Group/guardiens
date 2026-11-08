/**
 * Lot L5 (08/11/2026, arène tableau de bord v2, emprunt A-02) : les dates de
 * la publication rapide en une seule carte.
 *
 * Dates connues : une phrase (« Du 19 décembre au 3 janvier · 15 nuits ») et
 * « Modifier », qui ouvre une feuille du bas (raccourcis de Noël en liste,
 * autres dates, « Valider ces dates »). La feuille suit le clavier et se
 * referme au geste Retour (lot L1).
 * Dates inconnues : les deux champs, directement dans la carte.
 */
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { daysBetween } from "@/lib/calendarDate";
import { storyDate } from "@/lib/dashboardStory";
import { nextDay, validPresets, type DatePreset } from "@/lib/sitExpress";
import type { DeparturePeriod } from "@/lib/ownerDeparture";

export type DatesMethod = "preset" | "autres";

/** « Du 19 décembre au 3 janvier · 15 nuits », null si une date manque ou si la fin précède le début. */
export function expressDatesPhrase(start: string, end: string): string | null {
  const a = storyDate(start);
  const b = storyDate(end);
  const nights = daysBetween(start, end);
  if (!a || !b || nights === null || nights <= 0) return null;
  return `Du ${a} au ${b} · ${nights} nuit${nights > 1 ? "s" : ""}`;
}

/** Dates acceptables : début à partir d'aujourd'hui, fin après le début. */
export const datesValid = (start: string, end: string, today: string) => !!start && !!end && start >= today && end > start;

interface Props {
  period: DeparturePeriod;
  today: string;
  startDate: string;
  endDate: string;
  onDates: (start: string, end: string, method: DatesMethod) => void;
  dateError: string | null;
  flexibleDates: boolean;
  onFlexibleDates: (v: boolean) => void;
}

const DateFields = ({
  idPrefix, start, end, today, onStart, onEnd,
}: { idPrefix: string; start: string; end: string; today: string; onStart: (v: string) => void; onEnd: (v: string) => void }) => (
  <div className="grid grid-cols-2 gap-3" data-testid="express-date-inputs">
    <div>
      <Label htmlFor={`${idPrefix}-start`} className="mb-1 block text-[14px] text-foreground/80">Début</Label>
      <Input id={`${idPrefix}-start`} type="date" min={today} value={start} className="h-12 text-base" onChange={(e) => onStart(e.target.value)} />
    </div>
    <div>
      <Label htmlFor={`${idPrefix}-end`} className="mb-1 block text-[14px] text-foreground/80">Fin</Label>
      <Input id={`${idPrefix}-end`} type="date" min={start ? nextDay(start) : today} value={end} className="h-12 text-base" onChange={(e) => onEnd(e.target.value)} />
    </div>
  </div>
);

export default function ExpressDatesCard(p: Props) {
  const phrase = expressDatesPhrase(p.startDate, p.endDate);
  const presets: DatePreset[] = p.period === "noel" ? validPresets(p.today) : [];
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({ start: p.startDate, end: p.endDate, method: "autres" as DatesMethod });

  // La feuille repart toujours des dates en cours.
  useEffect(() => {
    if (!open) return;
    const isPreset = presets.some((d) => d.start === p.startDate && d.end === p.endDate);
    setDraft({ start: p.startDate, end: p.endDate, method: isPreset ? "preset" : "autres" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, p.startDate, p.endDate]);

  const draftOk = datesValid(draft.start, draft.end, p.today);
  const draftPhrase = expressDatesPhrase(draft.start, draft.end);

  return (
    <section className="rounded-2xl border border-border bg-card p-5" data-testid="express-dates">
      <h2 className="font-heading text-[19px] text-foreground">Vos dates</h2>

      {phrase ? (
        <div className="mt-3 flex items-center justify-between gap-3" data-testid="express-dates-summary">
          <p className="min-w-0 text-[16px] font-semibold leading-snug text-foreground">{phrase}</p>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="min-h-[44px] shrink-0 rounded-full border-[1.5px] border-border px-4 text-[15px] font-semibold text-foreground"
          >
            Modifier
          </button>
        </div>
      ) : (
        <div className="mt-3">
          <DateFields
            idPrefix="express"
            start={p.startDate}
            end={p.endDate}
            today={p.today}
            onStart={(v) => p.onDates(v, p.endDate, "autres")}
            onEnd={(v) => p.onDates(p.startDate, v, "autres")}
          />
        </div>
      )}

      {p.dateError && <p className="mt-2 text-sm text-destructive">{p.dateError}</p>}

      <label className="mt-4 flex min-h-[44px] items-center gap-3 text-[15px] text-foreground">
        <Checkbox checked={p.flexibleDates} onCheckedChange={(v) => p.onFlexibleDates(v === true)} />
        Mes dates sont flexibles
      </label>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="max-h-[90dvh] overflow-y-auto rounded-t-3xl px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]" data-testid="express-dates-sheet">
          <SheetHeader className="text-left">
            <SheetTitle className="font-heading text-[22px]">Vos dates</SheetTitle>
            <SheetDescription className="text-[15px]">Choisissez la période de la garde.</SheetDescription>
          </SheetHeader>

          {presets.length > 0 && (
            <ul className="mt-4 space-y-2" role="radiogroup" aria-label="Pour Noël" data-testid="express-date-presets">
              {presets.map((d) => {
                const on = draft.start === d.start && draft.end === d.end;
                return (
                  <li key={d.key}>
                    <button
                      type="button"
                      role="radio"
                      aria-checked={on}
                      onClick={() => setDraft({ start: d.start, end: d.end, method: "preset" })}
                      className={cn(
                        "flex min-h-[52px] w-full items-center rounded-2xl border-[1.5px] px-4 text-left text-[15px] font-semibold",
                        on ? "border-primary bg-primary/10 text-foreground" : "border-border bg-card text-foreground",
                      )}
                    >
                      {expressDatesPhrase(d.start, d.end)}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          <p className="mt-5 text-[14px] font-semibold text-foreground">{presets.length > 0 ? "Autres dates" : "Début et fin"}</p>
          {draftOk && draftPhrase && draft.method === "autres" && (
            <p className="mt-1 text-[14px] text-foreground/80" data-testid="express-dates-draft">{draftPhrase}</p>
          )}
          <div className="mt-2">
            <DateFields
              idPrefix="express-sheet"
              start={draft.start}
              end={draft.end}
              today={p.today}
              onStart={(v) => setDraft((d) => ({ ...d, start: v, method: "autres" }))}
              onEnd={(v) => setDraft((d) => ({ ...d, end: v, method: "autres" }))}
            />
          </div>

          <button
            type="button"
            disabled={!draftOk}
            onClick={() => { p.onDates(draft.start, draft.end, draft.method); setOpen(false); }}
            className="mt-5 flex min-h-[50px] w-full items-center justify-center rounded-full bg-primary px-5 text-[16px] font-semibold text-primary-foreground disabled:opacity-50"
            data-testid="express-dates-validate"
          >
            Valider ces dates
          </button>
        </SheetContent>
      </Sheet>
    </section>
  );
}
