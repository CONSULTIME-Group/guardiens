import { Zap } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface EmergencyBadgeProps {
  size?: "sm" | "md";
  showTooltip?: boolean;
}

const EmergencyBadge = ({ size = "sm", showTooltip = true }: EmergencyBadgeProps) => {
  const badge = (
    <span
      className={`inline-flex items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-amber-500 text-white shadow-sm ${
        size === "sm" ? "h-5 w-5" : "h-6 w-6"
      }`}
    >
      <Zap className={size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"} fill="currentColor" />
    </span>
  );

  if (!showTooltip) return badge;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{badge}</TooltipTrigger>
      <TooltipContent>
        <p className="text-xs">Gardien d'urgence — Expérimenté, fiable, mobilisable rapidement</p>
      </TooltipContent>
    </Tooltip>
  );
};

export default EmergencyBadge;
