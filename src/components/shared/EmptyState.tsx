import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";

/* ── Illustrations gouache peintes à la main, palette du site ──
   Vert sapin #2C7A5C · Terre brune #94673D · Crème #FAF7F1
   Style éditorial premium, livre d'enfant raffiné. */
import sleepingCatImg from "@/assets/empty-states/sleeping-cat.png";
import emptyMailboxImg from "@/assets/empty-states/empty-mailbox.png";
import walkingDogImg from "@/assets/empty-states/walking-dog.png";
import emptyCalendarImg from "@/assets/empty-states/empty-calendar.png";
import heartBookmarkImg from "@/assets/empty-states/heart-bookmark.png";

/* Composant générique image — applique le mix-blend-multiply pour
   intégrer la peinture au fond crème de la page (évite le rectangle
   visible si la couleur de fond du site diffère légèrement). */
const PaintedIllustration = ({ src, alt }: { src: string; alt: string }) => (
  <img
    src={src}
    alt={alt}
    loading="lazy"
    width={1024}
    height={1024}
    className="w-48 md:w-56 h-auto mx-auto mix-blend-multiply select-none pointer-events-none dark:mix-blend-screen dark:opacity-80"
    draggable={false}
  />
);

const SleepingCat = () => <PaintedIllustration src={sleepingCatImg} alt="" />;
const EmptyMailbox = () => <PaintedIllustration src={emptyMailboxImg} alt="" />;
const WalkingDog = () => <PaintedIllustration src={walkingDogImg} alt="" />;
const EmptyCalendar = () => <PaintedIllustration src={emptyCalendarImg} alt="" />;
const HeartBookmark = () => <PaintedIllustration src={heartBookmarkImg} alt="" />;

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
    <div className={`text-center py-12 px-4 space-y-5 animate-fade-in ${className}`}>
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
