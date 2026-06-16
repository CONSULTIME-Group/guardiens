/**
 * Badge d'affinité propriétaire ↔ gardien.
 * Affiche un pourcentage et la liste des critères matchés en tooltip.
 * Aucune icône Lucide ni emoji.
 */
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { AffinityResult } from "@/lib/affinityScore";
import { cn } from "@/lib/utils";

interface AffinityBadgeProps {
  result: AffinityResult | null;
  size?: "sm" | "md";
  className?: string;
}

function tone(score: number): string {
  if (score >= 80) return "bg-success/15 text-success border-success/30";
  if (score >= 60) return "bg-primary/10 text-primary border-primary/25";
  if (score >= 40) return "bg-warning/15 text-warning border-warning/30";
  return "bg-muted text-muted-foreground border-border";
}

const AffinityBadge = ({ result, size = "md", className }: AffinityBadgeProps) => {
  if (!result) return null;
  const sizing = size === "sm" ? "text-[11px] px-2 py-0.5" : "text-xs px-2.5 py-1";
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full border font-semibold leading-none",
              sizing,
              tone(result.score),
              className,
            )}
            aria-label={`Affinité ${result.score}% sur ${result.total} critères`}
          >
            {result.score}% d'affinité
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[260px]">
          <p className="text-xs font-semibold mb-1">
            {result.score}% sur {result.total} critères communs
          </p>
          {result.matched.length > 0 ? (
            <ul className="space-y-0.5">
              {result.matched.map((m) => (
                <li key={m} className="text-xs text-muted-foreground">
                  · {m}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground">Profils compatibles</p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default AffinityBadge;
