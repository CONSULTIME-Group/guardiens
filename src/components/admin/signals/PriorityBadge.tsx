import { Activity, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  severityToPriority,
  type AdminSignalBase,
  type QueuePriority,
} from "./signalGrouping";

const PRIORITY_STYLE: Record<QueuePriority, string> = {
  haute: "bg-destructive/10 text-destructive border-destructive/30",
  moyenne: "bg-warning/10 text-warning-foreground border-warning/30",
  basse: "bg-muted text-muted-foreground border-border",
};

interface Props {
  priority: QueuePriority;
  origin: "signal" | "suggestion";
}

/**
 * Badge de priorité unifié de la file "À traiter" : une seule échelle à
 * trois niveaux (haute, moyenne, basse) et un seul code couleur pour les
 * signaux automatiques et les suggestions IA. L'origine reste visible via
 * une icône discrète (Activity = signal, Sparkles = suggestion IA).
 */
export const PriorityBadge = ({ priority, origin }: Props) => {
  const Icon = origin === "suggestion" ? Sparkles : Activity;
  const originLabel = origin === "suggestion" ? "Suggestion IA" : "Signal automatique";
  return (
    <Badge
      variant="outline"
      className={cn("text-[10px] uppercase tracking-wide shrink-0", PRIORITY_STYLE[priority])}
      title={originLabel}
    >
      <Icon className="h-3 w-3 mr-1" aria-hidden />
      Priorité {priority}
      <span className="sr-only"> ({originLabel})</span>
    </Badge>
  );
};

/** Badge de priorité d'un signal, projeté sur l'échelle unifiée. */
export const SignalPriorityBadge = ({
  severity,
}: {
  severity: AdminSignalBase["severity"];
}) => <PriorityBadge priority={severityToPriority(severity)} origin="signal" />;
