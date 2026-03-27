import { ShieldCheck, Star, Zap } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type StatusType = "verified" | "founder" | "emergency";

const STATUS_CONFIG: Record<StatusType, { bg: string; border: string; icon: typeof ShieldCheck; label: string; description: string }> = {
  verified: {
    bg: "#D8F3DC", border: "#2D6A4F",
    icon: ShieldCheck, label: "ID vérifiée", description: "Identité vérifiée par Guardiens",
  },
  founder: {
    bg: "#FEF3C7", border: "#C4956A",
    icon: Star, label: "Fondateur", description: "Membre fondateur de Guardiens",
  },
  emergency: {
    bg: "#D8F3DC", border: "#166534",
    icon: Zap, label: "Urgence", description: "Gardien d'urgence — mobilisable rapidement",
  },
};

interface Props {
  type: StatusType;
  size?: "xs" | "sm";
}

const StatusShield = ({ type, size = "sm" }: Props) => {
  const config = STATUS_CONFIG[type];
  const Icon = config.icon;
  const dim = size === "xs" ? { w: 20, h: 24, icon: 10 } : { w: 24, h: 29, icon: 12 };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex items-center justify-center relative cursor-default" style={{ width: dim.w, height: dim.h }}>
          <svg viewBox="0 0 40 48" width={dim.w} height={dim.h} className="absolute inset-0">
            <path
              d="M20 2 C10 2 3 6 3 6 L3 22 C3 34 20 46 20 46 C20 46 37 34 37 22 L37 6 C37 6 30 2 20 2Z"
              fill={config.bg}
              stroke={config.border}
              strokeWidth="2"
            />
          </svg>
          <Icon className="relative z-10" style={{ width: dim.icon, height: dim.icon, color: config.border }} />
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <p className="text-xs">{config.description}</p>
      </TooltipContent>
    </Tooltip>
  );
};

export default StatusShield;
