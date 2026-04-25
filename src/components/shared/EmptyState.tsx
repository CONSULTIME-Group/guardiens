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
  const wrapperClass =
    "block mx-auto h-auto w-36 sm:w-44 md:w-52 lg:w-56 max-w-[60vw] mix-blend-multiply select-none pointer-events-none dark:mix-blend-screen dark:opacity-80 motion-safe:animate-painted-reveal motion-reduce:opacity-100";

  if (errored) {
    const Fallback = SVG_FALLBACKS[fallbackKey];
    return (
      <div className={wrapperClass} role="img" aria-label={alt}>
        <Fallback />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      width={1024}
      height={1024}
      onError={() => setErrored(true)}
      className={wrapperClass}
      draggable={false}
    />
  );
};

const SleepingCat = () => <PaintedIllustration src={sleepingCatImg} alt="" fallbackKey="sleepingCat" />;
const EmptyMailbox = () => <PaintedIllustration src={emptyMailboxImg} alt="" fallbackKey="emptyMailbox" />;
const WalkingDog = () => <PaintedIllustration src={walkingDogImg} alt="" fallbackKey="walkingDog" />;
const EmptyCalendar = () => <PaintedIllustration src={emptyCalendarImg} alt="" fallbackKey="emptyCalendar" />;
const HeartBookmark = () => <PaintedIllustration src={heartBookmarkImg} alt="" fallbackKey="heartBookmark" />;

export const ILLUSTRATIONS = {
  sleepingCat: SleepingCat,
  emptyMailbox: EmptyMailbox,
  walkingDog: WalkingDog,
  emptyCalendar: EmptyCalendar,
  heartBookmark: HeartBookmark,
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
