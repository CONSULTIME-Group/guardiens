import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";

/* ── Illustrations aquarelle narrative française ──
   Scènes évocatrices de campagne, palette douce (sage, lavande, terre,
   crème), peinture délicate qui se fond dans le fond crème de la page.
   Chaque scène raconte l'intention de la page où elle apparaît. */
import waitingBenchImg from "@/assets/empty-states/v2/waiting-bench.webp";
import ruralMailboxImg from "@/assets/empty-states/v2/rural-mailbox.webp";
import countryPathImg from "@/assets/empty-states/v2/country-path.webp";
import openCalendarImg from "@/assets/empty-states/v2/open-calendar.webp";
import bouquetBookmarkImg from "@/assets/empty-states/v2/bouquet-bookmark.webp";
import sitterReadyImg from "@/assets/empty-states/v2/sitter-ready.webp";
import quietLeafImg from "@/assets/empty-states/v2/quiet-leaf.webp";

import { SVG_FALLBACKS } from "./empty-state-fallbacks";

/* Composant générique image — applique le mix-blend-multiply pour
   intégrer la peinture au fond crème de la page. En cas d'échec de
   chargement (réseau, 404, blocage), bascule sur un SVG inline léger
   qui garde la même empreinte visuelle (taille, centrage, blend). */
const PaintedIllustration = ({
  src,
  alt,
  fallbackKey,
}: {
  src: string;
  alt: string;
  fallbackKey: IllustrationKey;
}) => {
  const [errored, setErrored] = useState(false);
  // Tailles +40% par rapport à la version précédente (w-36→w-[12.6rem], etc.)
  // mix-blend-darken au lieu de multiply : conserve mieux les couleurs claires
  // de l'aquarelle et évite le "halo gris" sur les zones crème de l'image
  // lorsque le fond de page diffère légèrement (blanc, gris, carte).
  // Wrapper crème (#FAF9F6) imposé autour de l'illustration : garantit que le
  // fond aquarelle de l'image se confond TOUJOURS avec un fond crème identique,
  // peu importe le contexte (page blanche, carte gris-bleu, section colorée).
  // Le fondu est assuré par un masque radial doux qui efface les bords du carré
  // crème vers le fond réel de la page → aucune bordure visible.
  // Tailles +40% par rapport à v1 (w-36→w-[12.6rem], etc.)
  const wrapperClass =
    "relative block mx-auto h-auto w-[12.6rem] sm:w-[15.4rem] md:w-[18.2rem] lg:w-[19.6rem] max-w-[84vw] aspect-square select-none pointer-events-none motion-safe:animate-painted-reveal motion-reduce:opacity-100";

  // Fond crème exact (#FAF9F6) + masque radial pour fondre les bords
  const wrapperStyle: React.CSSProperties = {
    backgroundColor: "#FAF9F6",
    WebkitMaskImage:
      "radial-gradient(ellipse at center, #000 55%, rgba(0,0,0,0.6) 75%, transparent 100%)",
    maskImage:
      "radial-gradient(ellipse at center, #000 55%, rgba(0,0,0,0.6) 75%, transparent 100%)",
  };

  const imgClass =
    "absolute inset-0 w-full h-full object-contain mix-blend-darken dark:mix-blend-screen dark:opacity-80";

  if (errored) {
    const Fallback = SVG_FALLBACKS[fallbackKey];
    return (
      <div className={wrapperClass} style={wrapperStyle} role="img" aria-label={alt}>
        <div className={imgClass}>
          <Fallback />
        </div>
      </div>
    );
  }

  return (
    <div className={wrapperClass} style={wrapperStyle}>
      <img
        src={src}
        alt={alt}
        loading="lazy"
        width={1024}
        height={1024}
        onError={() => setErrored(true)}
        className={imgClass}
        draggable={false}
      />
    </div>
  );
};

const SleepingCat = () => <PaintedIllustration src={waitingBenchImg} alt="" fallbackKey="sleepingCat" />;
const EmptyMailbox = () => <PaintedIllustration src={ruralMailboxImg} alt="" fallbackKey="emptyMailbox" />;
const WalkingDog = () => <PaintedIllustration src={countryPathImg} alt="" fallbackKey="walkingDog" />;
const EmptyCalendar = () => <PaintedIllustration src={openCalendarImg} alt="" fallbackKey="emptyCalendar" />;
const HeartBookmark = () => <PaintedIllustration src={bouquetBookmarkImg} alt="" fallbackKey="heartBookmark" />;
const SitterReady = () => <PaintedIllustration src={sitterReadyImg} alt="" fallbackKey="sitterReady" />;
const QuietLeaf = () => <PaintedIllustration src={quietLeafImg} alt="" fallbackKey="quietLeaf" />;

export const ILLUSTRATIONS = {
  sleepingCat: SleepingCat,
  emptyMailbox: EmptyMailbox,
  walkingDog: WalkingDog,
  emptyCalendar: EmptyCalendar,
  heartBookmark: HeartBookmark,
  sitterReady: SitterReady,
  quietLeaf: QuietLeaf,
} as const;

export type IllustrationKey = keyof typeof ILLUSTRATIONS;

interface EmptyStateProps {
  illustration?: IllustrationKey;
  title: string;
  description?: string;
  actionLabel?: string;
  actionTo?: string;
  actionIcon?: LucideIcon;
  onAction?: () => void;
  className?: string;
}

const EmptyState = ({
  illustration = "sleepingCat",
  title,
  description,
  actionLabel,
  actionTo,
  actionIcon: ActionIcon = ArrowRight,
  onAction,
  className = "",
}: EmptyStateProps) => {
  const Illustration = ILLUSTRATIONS[illustration];

  return (
    <div className={`text-center py-12 px-4 space-y-5 motion-safe:animate-soft-fade-in ${className}`}>
      <Illustration />
      <div className="space-y-2">
        <h3 className="font-heading text-lg font-semibold text-foreground">{title}</h3>
        {description && (
          <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">{description}</p>
        )}
      </div>
      {actionLabel && actionTo && (
        <Link to={actionTo}>
          <Button variant="outline" className="gap-2 mt-2">
            {actionLabel}
            <ActionIcon className="h-4 w-4" />
          </Button>
        </Link>
      )}
      {actionLabel && onAction && !actionTo && (
        <Button variant="outline" className="gap-2 mt-2" onClick={onAction}>
          {actionLabel}
          <ActionIcon className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
};

export default EmptyState;
