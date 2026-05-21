import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Calendar } from "lucide-react";
import { addDays, addMonths, endOfMonth, format, startOfMonth } from "date-fns";
import { fr } from "date-fns/locale";

interface Props {
  pillClass: string;
  datesLabel: string;
  startDate: string;
  endDate: string;
  setStartDate: (v: string) => void;
  setEndDate: (v: string) => void;
}

type Mode = "custom" | "flexible" | "monthly";

const iso = (d: Date) => format(d, "yyyy-MM-dd");

const flexiblePresets = [
  { key: "weekend", label: "Ce week-end", build: () => {
    const today = new Date();
    const day = today.getDay();
    const friOffset = (5 - day + 7) % 7;
    const fri = addDays(today, friOffset);
    return { start: iso(fri), end: iso(addDays(fri, 2)) };
  }},
  { key: "week", label: "Cette semaine", build: () => {
    const today = new Date();
    return { start: iso(today), end: iso(addDays(today, 7)) };
  }},
  { key: "twoweeks", label: "Sous 15 jours", build: () => {
    const today = new Date();
    return { start: iso(today), end: iso(addDays(today, 15)) };
  }},
  { key: "month", label: "Sous 1 mois", build: () => {
    const today = new Date();
    return { start: iso(today), end: iso(addMonths(today, 1)) };
  }},
];

const monthlyPresets = Array.from({ length: 6 }).map((_, i) => {
  const ref = addMonths(new Date(), i);
  return {
    key: `m${i}`,
    label: format(ref, "MMMM yyyy", { locale: fr }),
    build: () => ({ start: iso(startOfMonth(ref)), end: iso(endOfMonth(ref)) }),
  };
});

export default function DatesPickerPopover({
  pillClass, datesLabel, startDate, endDate, setStartDate, setEndDate,
}: Props) {
  const [mode, setMode] = useState<Mode>("custom");

  const apply = (preset: { start: string; end: string }) => {
    setStartDate(preset.start);
    setEndDate(preset.end);
  };

  const reset = () => {
    setStartDate("");
    setEndDate("");
  };

  const tabBtn = (m: Mode, label: string) => (
    <button
      type="button"
      onClick={() => setMode(m)}
      className={`flex-1 text-xs font-medium rounded-full px-3 py-1.5 transition-colors ${
        mode === m
          ? "bg-primary text-primary-foreground shadow-sm"
          : "bg-muted/60 text-muted-foreground hover:bg-muted"
      }`}
    >
      {label}
    </button>
  );

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className={pillClass}>
          <Calendar className="h-4 w-4 text-primary" />
          <span className="text-foreground">{datesLabel}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4" align="start">
        <div className="flex gap-1.5 mb-4 bg-background rounded-full p-1 border">
          {tabBtn("custom", "Précises")}
          {tabBtn("flexible", "Flexible")}
          {tabBtn("monthly", "Mensuel")}
        </div>

        {mode === "custom" && (
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Du</label>
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Au</label>
              <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
          </div>
        )}

        {mode === "flexible" && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              Je suis ouvert·e, montrez-moi les annonces…
            </p>
            <div className="grid grid-cols-2 gap-2">
              {flexiblePresets.map(p => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => apply(p.build())}
                  className="text-sm rounded-xl border border-border bg-card px-3 py-2 text-left hover:border-primary hover:bg-primary/5 transition-colors"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {mode === "monthly" && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Choisissez un mois entier</p>
            <div className="grid grid-cols-2 gap-2">
              {monthlyPresets.map(p => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => apply(p.build())}
                  className="text-sm capitalize rounded-xl border border-border bg-card px-3 py-2 text-left hover:border-primary hover:bg-primary/5 transition-colors"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {(startDate || endDate) && (
          <button
            type="button"
            onClick={reset}
            className="mt-3 w-full text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
          >
            Réinitialiser les dates
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
}
