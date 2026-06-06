import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Carte d'action prioritaire, UN SEUL CTA dominant.
 *
 * Pourquoi un composant dédié : la promesse du cockpit est "une seule chose
 * à faire maintenant". Ce composant matérialise cette règle visuellement ,  * gros titre narratif, sous-texte contextuel, CTA plein largeur.
 *
 * Variante "urgency" pilote l'intensité visuelle :
 *  - high   : ring primary, légère teinte
 *  - medium : neutre, ring border
 *  - low    : muted, sans accent
 */

export interface PriorityActionCardProps {
  eyebrow: string;
  title: string;
  description?: string;
  ctaLabel: string;
  ctaTo: string;
  urgency?: "high" | "medium" | "low";
  /** Si le CTA pointe vers une ancre (#id) sur la page courante, on intercepte. */
  onCtaClick?: () => void;
}

const PriorityActionCard = ({
  eyebrow,
  title,
  description,
  ctaLabel,
  ctaTo,
  urgency = "medium",
  onCtaClick,
}: PriorityActionCardProps) => {
  const isAnchor = ctaTo.startsWith("#");

  const cardClasses = cn(
    "relative overflow-hidden rounded-2xl p-5 sm:p-6 transition-all",
    urgency === "high" && "bg-gradient-to-br from-primary/8 via-card to-card ring-1 ring-primary/25",
    urgency === "medium" && "bg-card ring-1 ring-border",
    urgency === "low" && "bg-muted/40 ring-1 ring-border/40"
  );

  return (
    <div className={cardClasses}>
      <p
        className={cn(
          "text-[10px] uppercase tracking-[2px] font-sans font-semibold mb-2",
          urgency === "high" ? "text-primary" : "text-muted-foreground"
        )}
      >
        {eyebrow}
      </p>
      <h2 className="font-heading text-xl sm:text-2xl font-bold text-foreground leading-snug">
        {title}
      </h2>
      {description && (
        <p className="text-sm text-foreground/70 leading-relaxed mt-2 max-w-prose">
          {description}
        </p>
      )}
      <div className="mt-4">
        {isAnchor ? (
          <Button
            size="lg"
            onClick={onCtaClick}
            className="rounded-xl w-full sm:w-auto group"
            variant={urgency === "high" ? "default" : "outline"}
          >
            {ctaLabel}
            <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </Button>
        ) : (
          <Button
            asChild
            size="lg"
            className="rounded-xl w-full sm:w-auto group"
            variant={urgency === "high" ? "default" : "outline"}
          >
            <Link to={ctaTo}>
              {ctaLabel}
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
};

export default PriorityActionCard;
