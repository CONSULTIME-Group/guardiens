import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Calendar } from "lucide-react";

interface Props {
  pillClass: string;
  datesLabel: string;
  startDate: string;
  endDate: string;
  setStartDate: (v: string) => void;
  setEndDate: (v: string) => void;
}

export default function DatesPickerPopover({
  pillClass, datesLabel, startDate, endDate, setStartDate, setEndDate,
}: Props) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className={pillClass}>
          <Calendar className="h-4 w-4 text-primary" />
          <span className="text-foreground">{datesLabel}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-4" align="start">
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
      </PopoverContent>
    </Popover>
  );
}
