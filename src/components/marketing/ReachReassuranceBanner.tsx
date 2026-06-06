/**
 * Bandeau de réassurance « périmètre », lève l'idée fausse que Guardiens serait
 * limité au quartier. Le concept reste « gens du coin », mais on rappelle que
 * l'utilisateur peut élargir la recherche partout en France.
 *
 * Usage : home, moteur de recherche, partages, etc.
 *
 * Variants :
 *  - "inline"   : phrase courte sur une ligne (sous un titre, sous un slogan)
 *  - "card"     : bloc encadré avec micro-explication (au-dessus d'une liste)
 */

import { cn } from "@/lib/utils";

interface ReachReassuranceBannerProps {
  variant?: "inline" | "card";
  className?: string;
  /** Texte court (utilisé pour la variante inline). */
  inlineText?: string;
}

const DEFAULT_INLINE = "Du coin… ou d'ailleurs : les annonces sont accessibles partout en France.";

const ReachReassuranceBanner = ({
  variant = "inline",
  className,
  inlineText = DEFAULT_INLINE,
}: ReachReassuranceBannerProps) => {
  if (variant === "inline") {
    return (
      <p
        className={cn(
          "font-body text-sm md:text-[15px] text-muted-foreground italic",
          className,
        )}
      >
        {inlineText}
      </p>
    );
  }

  return (
    <aside
      className={cn(
        "rounded-xl border border-primary/20 bg-primary/[0.04] px-4 py-3 md:px-5 md:py-4",
        className,
      )}
      aria-label="Périmètre de recherche Guardiens"
    >
      <p className="font-heading font-semibold text-sm md:text-base text-foreground mb-1">
        Local par envie, national par liberté
      </p>
      <p className="font-body text-sm text-muted-foreground leading-relaxed">
        Notre promesse, c'est de retisser du lien <strong className="font-semibold text-foreground">avec les gens du coin</strong>.
        Mais rien ne vous y oblige : élargissez votre rayon, explorez d'autres régions, créez du lien partout en France.
        <span className="block mt-1">
          C'est vous qui choisissez le périmètre.
        </span>
      </p>
    </aside>
  );
};

export default ReachReassuranceBanner;
