import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";

/* ── Illustrations aquarelle narrative française ──
   Scènes évocatrices de campagne, palette douce (sage, lavande, terre,
   crème), peinture délicate qui se fond dans le fond crème de la page.
   Chaque scène raconte l'intention de la page où elle apparaît.

   Format unifié : WebP carré, qualité 78, 3 variantes responsive
   (256/384/640 px) servies via `srcset`. Le navigateur choisit la
   variante adaptée au DPR et au viewport. La source 1024 px d'origine
   reste disponible comme fallback ultime via `src=` standard. */
import waitingBench256 from "@/assets/empty-states/v2/responsive/waiting-bench-256.webp";
import waitingBench384 from "@/assets/empty-states/v2/responsive/waiting-bench-384.webp";
import waitingBench640 from "@/assets/empty-states/v2/responsive/waiting-bench-640.webp";
import ruralMailbox256 from "@/assets/empty-states/v2/responsive/rural-mailbox-256.webp";
import ruralMailbox384 from "@/assets/empty-states/v2/responsive/rural-mailbox-384.webp";
import ruralMailbox640 from "@/assets/empty-states/v2/responsive/rural-mailbox-640.webp";
import countryPath256 from "@/assets/empty-states/v2/responsive/country-path-256.webp";
import countryPath384 from "@/assets/empty-states/v2/responsive/country-path-384.webp";
import countryPath640 from "@/assets/empty-states/v2/responsive/country-path-640.webp";
import openCalendar256 from "@/assets/empty-states/v2/responsive/open-calendar-256.webp";
import openCalendar384 from "@/assets/empty-states/v2/responsive/open-calendar-384.webp";
import openCalendar640 from "@/assets/empty-states/v2/responsive/open-calendar-640.webp";
import bouquetBookmark256 from "@/assets/empty-states/v2/responsive/bouquet-bookmark-256.webp";
import bouquetBookmark384 from "@/assets/empty-states/v2/responsive/bouquet-bookmark-384.webp";
import bouquetBookmark640 from "@/assets/empty-states/v2/responsive/bouquet-bookmark-640.webp";
import sitterReady256 from "@/assets/empty-states/v2/responsive/sitter-ready-256.webp";
import sitterReady384 from "@/assets/empty-states/v2/responsive/sitter-ready-384.webp";
import sitterReady640 from "@/assets/empty-states/v2/responsive/sitter-ready-640.webp";
import quietLeaf256 from "@/assets/empty-states/v2/responsive/quiet-leaf-256.webp";
import quietLeaf384 from "@/assets/empty-states/v2/responsive/quiet-leaf-384.webp";
import quietLeaf640 from "@/assets/empty-states/v2/responsive/quiet-leaf-640.webp";

/** Trio de variantes responsive d'une illustration. */
interface IllustrationSet {
  src: string;        // fallback (variante moyenne)
  srcSet: string;     // "url 256w, url 384w, url 640w"
}

const makeSet = (s256: string, s384: string, s640: string): IllustrationSet => ({
  src: s384,
  srcSet: `${s256} 256w, ${s384} 384w, ${s640} 640w`,
});

const SETS = {
  sleepingCat:    makeSet(waitingBench256,    waitingBench384,    waitingBench640),
  emptyMailbox:   makeSet(ruralMailbox256,    ruralMailbox384,    ruralMailbox640),
  walkingDog:     makeSet(countryPath256,     countryPath384,     countryPath640),
  emptyCalendar:  makeSet(openCalendar256,    openCalendar384,    openCalendar640),
  heartBookmark:  makeSet(bouquetBookmark256, bouquetBookmark384, bouquetBookmark640),
  sitterReady:    makeSet(sitterReady256,     sitterReady384,     sitterReady640),
  quietLeaf:      makeSet(quietLeaf256,       quietLeaf384,       quietLeaf640),
} as const;

/** `sizes` aligné sur la classe wrapper :
 *    base   12.6rem ≈ 202 px  → mobile
 *    sm     15.4rem ≈ 246 px
 *    md     18.2rem ≈ 291 px
 *    lg     19.6rem ≈ 314 px
 *  Avec DPR 2 le navigateur prend 640w pour mobile retina ; sans retina
 *  il prend 256w (mobile) ou 384w (desktop). */
const ILLUSTRATION_SIZES =
  "(max-width: 639px) 202px, (max-width: 767px) 246px, (max-width: 1023px) 291px, 314px";

import { SVG_FALLBACKS } from "./empty-state-fallbacks";

/* Composant générique image — délègue TOUTE la logique de fondu
   (masque radial + blend modes light/dark + filtre dark) à la classe
   utilitaire `.illustration-blend` définie dans src/index.css.
   Aucun style de blend/mask/filter n'est dupliqué ici : la classe est
   la SOURCE UNIQUE de vérité pour tous les composants qui afficheraient
   ces illustrations aquarelle. */
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
    "illustration-wrapper relative block mx-auto h-auto w-[12.6rem] sm:w-[15.4rem] md:w-[18.2rem] lg:w-[19.6rem] max-w-[84vw] aspect-square select-none pointer-events-none motion-safe:animate-painted-reveal motion-reduce:opacity-100";

  const imgClass =
    "illustration-blend absolute inset-0 w-full h-full object-contain";

  if (errored) {
    const Fallback = SVG_FALLBACKS[fallbackKey];
    return (
      <div className={wrapperClass} role="img" aria-label={alt}>
        <div className={imgClass}>
          <Fallback />
        </div>
      </div>
    );
  }

  return (
    <div className={wrapperClass}>
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
