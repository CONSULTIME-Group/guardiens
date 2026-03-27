import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Calendar } from "@/components/ui/calendar";
import HintBubble from "./HintBubble";
import type { SitterProfileData } from "@/hooks/useSitterProfile";
import { useState } from "react";
import type { DateRange } from "react-day-picker";
import { fr } from "date-fns/locale";

interface Props {
  data: SitterProfileData;
  onChange: (partial: Partial<SitterProfileData>) => void;
}

const StepMobility = ({ data, onChange }: Props) => {
  // Parse availability_dates as date ranges for display
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    if (data.availability_dates.length > 0) {
      const last = data.availability_dates[data.availability_dates.length - 1];
      return { from: new Date(last.from), to: last.to ? new Date(last.to) : undefined };
    }
    return undefined;
  });

  const handleDateSelect = (range: DateRange | undefined) => {
    setDateRange(range);
    if (range?.from) {
      const newDates = [
        ...data.availability_dates.slice(0, -1),
        { from: range.from.toISOString(), to: range.to?.toISOString() || null },
      ];
      // If it's a brand new range, just add it
      if (!dateRange?.from) {
        onChange({ availability_dates: [...data.availability_dates, { from: range.from.toISOString(), to: range.to?.toISOString() || null }] });
      } else {
        onChange({ availability_dates: newDates });
      }
    }
  };

  return (
    <div className="space-y-6">

      {/* Availability toggle */}
      <div className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800 p-4">
        <div>
          <Label className="text-base font-semibold">Je suis disponible</Label>
          <p className="text-sm text-muted-foreground mt-0.5">Activez pour apparaître dans les résultats de recherche avec un badge vert.</p>
        </div>
        <Switch checked={data.is_available} onCheckedChange={v => onChange({ is_available: v })} />
      </div>

      <div className="flex items-center justify-between py-2">
        <Label>Permis de conduire</Label>
        <Switch checked={data.has_license} onCheckedChange={v => onChange({ has_license: v })} />
      </div>

      <div className="flex items-center justify-between py-2">
        <Label>Véhicule personnel</Label>
        <Switch checked={data.has_vehicle} onCheckedChange={v => onChange({ has_vehicle: v })} />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Rayon géographique</Label>
          <span className="text-sm font-semibold text-primary">{data.geographic_radius} km</span>
        </div>
        <Slider
          value={[data.geographic_radius]}
          onValueChange={v => onChange({ geographic_radius: v[0] })}
          min={10}
          max={100}
          step={5}
          className="py-2"
        />
        <HintBubble>Plus votre rayon est large, plus vous verrez d'annonces. Mais la proximité est un atout — les propriétaires préfèrent les gardiens proches.</HintBubble>
      </div>

      <div className="space-y-3">
        <Label>Disponibilités</Label>
        <div className="bg-card rounded-lg border border-border p-4 flex justify-center">
          <Calendar
            mode="range"
            selected={dateRange}
            onSelect={handleDateSelect}
            locale={fr}
            numberOfMonths={1}
            disabled={{ before: new Date() }}
            className="pointer-events-auto"
          />
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Durée de garde souhaitée</Label>
          <span className="text-sm font-semibold text-primary">{data.min_duration}j — {data.max_duration}j</span>
        </div>
        <Slider
          value={[data.min_duration, data.max_duration]}
          onValueChange={v => onChange({ min_duration: v[0], max_duration: v[1] })}
          min={1}
          max={60}
          step={1}
          className="py-2"
        />
      </div>
    </div>
  );
};

export default StepMobility;
