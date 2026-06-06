import { Info } from "lucide-react";
import { useActiveSittersCount } from "@/hooks/useActiveSittersCount";
import { useActiveOwnersCount } from "@/hooks/useActiveOwnersCount";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/**
 * Bandeau signal vivant, preuve sociale temps réel.
 *
 * Pourquoi : sur un dashboard à 0 sit/0 candidature, le user ressent du vide.
 * Ce strip apporte 1 ligne de "battement de cœur", montre que la plateforme
 * est habitée, même si son propre coin est calme.
 *
 * Format : pulse vert + 2 segments séparés par "·".
 * Pas un CTA, juste un signal. Pas d'action, pas de clic.
 *
 * Le slot `secondarySignal` permet d'injecter une info contextuelle locale
 * (ex : "12 annonces publiées en 24h", "3 candidats en attente").
 */

interface LiveSignalStripProps {
  /** Texte secondaire optionnel (signal contextuel local). */
  secondarySignal?: string | null;
}

const LiveSignalStrip = ({ secondarySignal }: LiveSignalStripProps) => {
  const { data: sittersCount } = useActiveSittersCount();
  const { data: ownersCount } = useActiveOwnersCount();
  const hasSitters = !!sittersCount && sittersCount >= 10;
  const hasOwners = !!ownersCount && ownersCount >= 10;
  if (!hasSitters && !hasOwners) return null;

  return (
    <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-muted/30 ring-1 ring-border/40 text-xs sm:text-sm">
      <span className="relative flex h-2 w-2 shrink-0" aria-hidden="true">
        <span className="absolute inline-flex h-full w-full rounded-full bg-success opacity-60 animate-ping" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
      </span>
      <p className="text-foreground/80 font-sans">
        {hasSitters && (
          <>
            <span className="font-semibold text-foreground tabular-nums">
              {sittersCount!.toLocaleString("fr-FR")}
            </span>{" "}
            gardiens
          </>
        )}
        {hasSitters && hasOwners && (
          <span className="mx-1.5 text-muted-foreground/60">·</span>
        )}
        {hasOwners && (
          <>
            <span className="font-semibold text-foreground tabular-nums">
              {ownersCount!.toLocaleString("fr-FR")}
            </span>{" "}
            propriétaires
          </>
        )}
        <span className="text-foreground/60"> actifs en France</span>
        <TooltipProvider delayDuration={150}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label="Que signifie « actifs » ?"
                className="ml-1 inline-flex items-center align-middle text-muted-foreground/70 hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-full"
              >
                <Info className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs text-xs leading-relaxed">
              <p className="font-semibold mb-1">Que veut dire « actifs » ?</p>
              <p className="text-muted-foreground">
                Nombre total de membres ayant activé leur espace sur Guardiens :
                gardiens (rôle gardien ou les deux) et propriétaires (rôle
                propriétaire ou les deux). Calculé à partir des inscriptions
                réelles à la plateforme, mis à jour en continu (rafraîchi toutes
                les 5 min).
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        {secondarySignal && (
          <>
            <span className="mx-1.5 text-muted-foreground/60">·</span>
            <span className="text-foreground/70">{secondarySignal}</span>
          </>
        )}
      </p>
    </div>
  );
};

export default LiveSignalStrip;
