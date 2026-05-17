import { useActiveSittersCount } from "@/hooks/useActiveSittersCount";

/**
 * Bandeau signal vivant — preuve sociale temps réel.
 *
 * Pourquoi : sur un dashboard à 0 sit/0 candidature, le user ressent du vide.
 * Ce strip apporte 1 ligne de "battement de cœur" — montre que la plateforme
 * est habitée, même si son propre coin est calme.
 *
 * Format : pulse vert + 2 segments séparés par "·".
 * Pas un CTA — juste un signal. Pas d'action, pas de clic.
 *
 * Le slot `secondarySignal` permet d'injecter une info contextuelle locale
 * (ex : "12 annonces publiées en 24h", "3 candidats en attente").
 */

interface LiveSignalStripProps {
  /** Texte secondaire optionnel (signal contextuel local). */
  secondarySignal?: string | null;
}

const LiveSignalStrip = ({ secondarySignal }: LiveSignalStripProps) => {
  const { data: count } = useActiveSittersCount();
  if (!count || count < 10) return null;

  return (
    <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-muted/30 ring-1 ring-border/40 text-xs sm:text-sm">
      <span className="relative flex h-2 w-2 shrink-0" aria-hidden="true">
        <span className="absolute inline-flex h-full w-full rounded-full bg-success opacity-60 animate-ping" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
      </span>
      <p className="text-foreground/80 font-sans">
        <span className="font-semibold text-foreground tabular-nums">
          {count.toLocaleString("fr-FR")}
        </span>{" "}
        gardiens actifs en France
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
