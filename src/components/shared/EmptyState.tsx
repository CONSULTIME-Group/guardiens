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
  // Stratégie de fondu UNIVERSELLE — fonctionne sur n'importe quel fond
  // (page crème, carte blanche pure, section grisée, conteneur bleu-gris,
  // mode clair ou sombre) sans dépendance à un token de couleur.
  //
  // Principe : on applique un MASQUE radial (CSS `mask-image`) directement
  // sur l'image. Le masque est un dégradé alpha (noir → transparent), donc
  // les bords de l'image deviennent VRAIMENT transparents (et non recouverts
  // par une couleur). Le vrai fond du parent transparaît, quel qu'il soit.
  //
  // Mode clair : `mix-blend-darken` aide les pixels les plus clairs de
  //   l'aquarelle à se confondre avec le fond, le masque finit le travail.
  // Mode sombre : `filter: invert(1) hue-rotate(180deg)` transforme le crème
  //   de l'image en sombre tout en préservant les teintes ; le masque applique
  //   ensuite la même transparence en bordure.
  const wrapperClass =
    "relative block mx-auto h-auto w-[12.6rem] sm:w-[15.4rem] md:w-[18.2rem] lg:w-[19.6rem] max-w-[84vw] aspect-square select-none pointer-events-none motion-safe:animate-painted-reveal motion-reduce:opacity-100";

  // Masque radial : opaque jusqu'à 50 %, dégrade vers transparent à 92 %.
  // Stops intermédiaires (65 % @ 0.85, 78 % @ 0.45) lissent la transition
  // pour qu'aucune bande ne soit perceptible, même sur fond très contrasté.
  const maskImage =
    "radial-gradient(ellipse at center, " +
    "rgba(0,0,0,1) 0%, " +
    "rgba(0,0,0,1) 50%, " +
    "rgba(0,0,0,0.85) 65%, " +
    "rgba(0,0,0,0.45) 78%, " +
    "rgba(0,0,0,0.12) 88%, " +
    "rgba(0,0,0,0) 95%)";

  const maskStyle: React.CSSProperties = {
    WebkitMaskImage: maskImage,
    maskImage,
    WebkitMaskRepeat: "no-repeat",
    maskRepeat: "no-repeat",
    WebkitMaskSize: "100% 100%",
    maskSize: "100% 100%",
  };

  // Light : darken (les pixels clairs disparaissent dans le fond clair).
  // Dark  : invert + hue-rotate (le crème devient sombre, teintes préservées).
  const imgClass =
    "absolute inset-0 w-full h-full object-contain mix-blend-darken dark:mix-blend-normal dark:[filter:invert(1)_hue-rotate(180deg)_brightness(0.92)_saturate(0.85)] dark:opacity-95";

  if (errored) {
    const Fallback = SVG_FALLBACKS[fallbackKey];
    return (
      <div className={wrapperClass} role="img" aria-label={alt}>
        <div className={imgClass} style={maskStyle}>
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
        style={maskStyle}
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
