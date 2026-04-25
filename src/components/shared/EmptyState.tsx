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
  // Tailles +40% par rapport à v1 (w-36 → w-[12.6rem], etc.).
  //
  // Stratégie de fondu — DOUBLE adaptation thème + contexte :
  //
  // 1. LIGHT MODE
  //    Le fond crème de l'aquarelle (#FAF9F6) ≈ couleur de page (--background:
  //    40 33% 97%). On utilise `mix-blend-darken` pour que les pixels clairs
  //    de l'image laissent passer le fond du contexte (carte, section, page)
  //    et un overlay radial discret peint la couleur exacte de --background
  //    sur les bords pour annuler tout micro-écart.
  //
  // 2. DARK MODE
  //    Le fond crème de l'aquarelle est en violent contraste avec le fond
  //    sombre (--background: 160 10% 8%). Sans correction, l'image apparaît
  //    comme un disque lumineux flottant. On applique alors un filtre CSS
  //    `invert(1) hue-rotate(180deg)` qui transforme le crème de l'image en
  //    sombre (proche de --background) tout en préservant les teintes
  //    aquarelle (le hue-rotate compense l'inversion des couleurs). Combiné
  //    avec un overlay radial plus marqué (commence plus tôt et plus opaque),
  //    le rendu se fond exactement comme en light, sans halo.
  const wrapperClass =
    "relative block mx-auto h-auto w-[12.6rem] sm:w-[15.4rem] md:w-[18.2rem] lg:w-[19.6rem] max-w-[84vw] aspect-square select-none pointer-events-none motion-safe:animate-painted-reveal motion-reduce:opacity-100";

  // Light : darken (laisse passer le fond du contexte sur les zones claires).
  // Dark  : invert + hue-rotate transforme crème → sombre, opacité 90 % pour
  //         atténuer légèrement la saturation et éviter tout aspect néon.
  const imgClass =
    "absolute inset-0 w-full h-full object-contain mix-blend-darken dark:mix-blend-normal dark:[filter:invert(1)_hue-rotate(180deg)_brightness(0.9)_saturate(0.85)] dark:opacity-90";

  // Overlay radial : fond les bords vers --background.
  // - Light : transition douce et tardive (le contraste est minime).
  // - Dark  : transition plus précoce et plus opaque pour absorber les pixels
  //           résiduels qui ne sont pas parfaitement noirs après inversion.
  const fadeOverlayStyle: React.CSSProperties = {
    background:
      "radial-gradient(ellipse at center, transparent var(--es-fade-start, 50%), hsl(var(--background) / var(--es-fade-mid-alpha, 0.55)) var(--es-fade-mid, 68%), hsl(var(--background)) var(--es-fade-end, 88%))",
  };

  const renderFade = () => (
    <div
      aria-hidden="true"
      className="absolute inset-0 pointer-events-none dark:[--es-fade-start:38%] dark:[--es-fade-mid-alpha:0.7] dark:[--es-fade-mid:58%] dark:[--es-fade-end:82%]"
      style={fadeOverlayStyle}
    />
  );

  if (errored) {
    const Fallback = SVG_FALLBACKS[fallbackKey];
    return (
      <div className={wrapperClass} role="img" aria-label={alt}>
        <div className={imgClass}>
          <Fallback />
        </div>
        {renderFade()}
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
      {renderFade()}
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
