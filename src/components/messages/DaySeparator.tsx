import { isToday, isYesterday, format } from "date-fns";
import { fr } from "date-fns/locale";

const DaySeparator = ({ date }: { date: string }) => {
  const d = new Date(date);
  let label: string;
  if (isToday(d)) label = "Aujourd'hui";
  else if (isYesterday(d)) label = "Hier";
  else label = format(d, "EEEE d MMMM", { locale: fr });

  return (
    <div className="flex items-center gap-3 py-3">
      <div className="flex-1 h-px bg-border" />
      <span className="text-[11px] text-muted-foreground font-medium capitalize">{label}</span>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
};

export default DaySeparator;
