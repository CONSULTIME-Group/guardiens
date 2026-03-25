import { ShieldCheck } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface VerifiedBadgeProps {
  size?: "sm" | "md";
}

const VerifiedBadge = ({ size = "sm" }: VerifiedBadgeProps) => {
  const iconSize = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex items-center gap-0.5 text-primary">
            <ShieldCheck className={iconSize} />
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">Identité vérifiée</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default VerifiedBadge;
