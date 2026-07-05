import { ShieldCheck } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useEffect, useRef } from "react";
import { trackEvent } from "@/lib/analytics";

type Surface = "detail" | "card_annuaire" | "card_listing";

interface Props {
  verifiedAt?: string | null;
  proId?: string;
  surface: Surface;
  size?: "sm" | "md";
  className?: string;
  trackImpression?: boolean;
}

function formatDate(iso?: string | null): string | null {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  } catch {
    return null;
  }
}

export function ProVerifiedBadge({ verifiedAt, proId, surface, size = "md", className, trackImpression = true }: Props) {
  const seen = useRef(false);
  useEffect(() => {
    if (!trackImpression || seen.current) return;
    seen.current = true;
    void trackEvent("pro_verified_badge_seen", { metadata: { pro_id: proId ?? null, surface } });
  }, [proId, surface, trackImpression]);

  const date = formatDate(verifiedAt);
  const isSm = size === "sm";

  const badge = (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 text-primary font-semibold whitespace-nowrap",
        isSm ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs",
        className,
      )}
      aria-label="Pro vérifié Guardiens"
    >
      <ShieldCheck className={isSm ? "h-3 w-3" : "h-3.5 w-3.5"} aria-hidden="true" />
      Vérifié Guardiens
    </span>
  );

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>{badge}</TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs text-xs leading-relaxed">
          {date
            ? `SIRET vérifié par Guardiens le ${date}. Ce pro a présenté un document d'entreprise valide au moment de son inscription.`
            : "SIRET vérifié par Guardiens. Ce pro a présenté un document d'entreprise valide au moment de son inscription."}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default ProVerifiedBadge;
