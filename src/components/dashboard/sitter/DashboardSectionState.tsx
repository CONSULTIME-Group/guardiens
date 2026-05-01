import { Link } from "react-router-dom";
import { ArrowRight, RefreshCw, AlertCircle } from "lucide-react";

type Variant = "loading" | "error" | "empty";

interface DashboardSectionStateProps {
  /** loading | error | empty */
  variant: Variant;
  /** Eyebrow (UPPERCASE label en haut à gauche). Ex: "Prochaine garde", "Annonces près de vous" */
  eyebrow: string;
  /** Titre principal. Override par défaut selon variant. */
  title?: string;
  /** Texte secondaire / description. */
  description?: string;
  /** CTA principal (lien). Affiché uniquement en variant="empty". */
  ctaTo?: string;
  ctaLabel?: string;
  /** Callback de retry. Affiché uniquement en variant="error". */
  onRetry?: () => void;
  /** Préserver la hauteur visuelle d'un hero contextuel. */
  compact?: boolean;
}

/**
 * État unifié pour les sections du dashboard (loading / erreur / vide).
 * Garde le même squelette visuel quelle que soit la variante pour
 * éviter les sauts de layout entre les états.
 */
const DashboardSectionState = ({
  variant,
  eyebrow,
  title,
  description,
  ctaTo,
  ctaLabel = "Explorer",
  onRetry,
  compact = false,
}: DashboardSectionStateProps) => {
  const defaultTitle =
    variant === "loading"
      ? "Chargement…"
      : variant === "error"
      ? "Données momentanément indisponibles"
      : "Aucun élément à afficher";

  const defaultDescription =
    variant === "loading"
      ? "Récupération des informations en cours."
      : variant === "error"
      ? "Une erreur est survenue. Réessayez dans quelques instants."
      : null;

  const containerClasses =
    variant === "error"
      ? "bg-destructive/5 border-destructive/30"
      : "bg-muted/30 border-dashed border-border";

  const badgeLabel =
    variant === "loading" ? "…" : variant === "error" ? "Erreur" : "Aucune";
  const badgeClasses =
    variant === "error"
      ? "bg-destructive/15 text-destructive"
      : "bg-muted text-muted-foreground";

  const isEmptyWithCta = variant === "empty" && ctaTo;

  const Inner = (
    <div
      className={`block border rounded-2xl p-4 sm:p-5 transition-all duration-300 ease-out ${containerClasses} ${
        isEmptyWithCta ? "hover:bg-muted/50 hover:border-primary/30 hover:-translate-y-0.5 cursor-pointer group" : ""
      } ${variant === "loading" ? "animate-pulse" : ""}`}
      role={variant === "error" ? "alert" : undefined}
      aria-busy={variant === "loading" || undefined}
    >
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs uppercase tracking-widest text-muted-foreground font-sans font-medium">
          {eyebrow}
        </p>
        <span className={`text-xs rounded-full px-2.5 py-0.5 font-medium inline-flex items-center gap-1 ${badgeClasses}`}>
          {variant === "error" && <AlertCircle className="h-3 w-3" aria-hidden="true" />}
          {badgeLabel}
        </span>
      </div>

      <p
        className={`text-sm font-semibold mb-1 ${
          variant === "error" ? "text-destructive" : "text-foreground"
        } ${isEmptyWithCta ? "transition-colors group-hover:text-primary" : ""}`}
      >
        {title || defaultTitle}
      </p>

      {(description || defaultDescription) && (
        <p className="text-xs text-muted-foreground mb-2">
          {description || defaultDescription}
        </p>
      )}

      {!compact && variant === "empty" && ctaTo && (
        <div className="flex items-center justify-end mt-3">
          <span className="inline-flex items-center gap-1 text-xs font-medium text-primary transition-transform duration-200 group-hover:translate-x-0.5">
            {ctaLabel} <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
        </div>
      )}

      {variant === "error" && onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-destructive hover:underline"
        >
          <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
          Réessayer
        </button>
      )}
    </div>
  );

  return (
    <div className="px-4 sm:px-5 md:px-8 mb-6 md:mb-8">
      {isEmptyWithCta ? <Link to={ctaTo!}>{Inner}</Link> : Inner}
    </div>
  );
};

export default DashboardSectionState;
