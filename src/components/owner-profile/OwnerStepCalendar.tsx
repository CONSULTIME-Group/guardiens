import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import HintBubble from "../profile/HintBubble";
import { fr } from "date-fns/locale";
import { useState } from "react";
import type { DateRange } from "react-day-picker";

const OwnerStepCalendar = () => {
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  return (
    <div className="space-y-6">
      <h2 className="font-heading text-2xl font-bold">Calendrier</h2>
      <HintBubble>Ajoutez vos prochaines dates d'absence. Plus vous remplissez tôt, plus vous aurez de candidatures.</HintBubble>

      <div className="space-y-3">
        <Label>Périodes d'absence</Label>
        <p className="text-sm text-muted-foreground">
          Sélectionnez vos dates d'absence sur le calendrier. Cette fonctionnalité sera liée à vos annonces de garde.
        </p>
        <div className="bg-card rounded-lg border border-border p-4 flex justify-center">
          <Calendar
            mode="range"
            selected={dateRange}
            onSelect={setDateRange}
            locale={fr}
            numberOfMonths={1}
            disabled={{ before: new Date() }}
          />
        </div>
        {dateRange?.from && (
          <div className="bg-muted/50 rounded-lg p-3 text-sm">
            <span className="font-medium">Période sélectionnée : </span>
            {dateRange.from.toLocaleDateString("fr-FR")}
            {dateRange.to && ` — ${dateRange.to.toLocaleDateString("fr-FR")}`}
          </div>
        )}
      </div>
    </div>
  );
};

export default OwnerStepCalendar;
