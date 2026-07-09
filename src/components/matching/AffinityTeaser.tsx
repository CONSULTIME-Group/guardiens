/**
 * Teaser d'affinité pour les visiteurs NON connectés.
 *
 * N'affiche AUCUN score. C'est une accroche de valeur qui incite à
 * l'inscription pour découvrir son affinité réelle avec la personne ou
 * l'annonce consultée.
 *
 * Aucun emoji, aucune icône Lucide décorative, aucun tiret cadratin,
 * tokens de couleur uniquement.
 */
import { Link } from "react-router-dom";

interface Props {
  /** Rôle attendu du visiteur pour l'inscription. */
  role: "sitter" | "owner";
  /** Prénom (ou libellé court) de la cible, ex: "Marie" ou "cette annonce". */
  targetLabel: string;
  /** URL de redirection après inscription. Par défaut, la page actuelle. */
  redirectTo?: string;
  className?: string;
}

const AffinityTeaser = ({ role, targetLabel, redirectTo, className }: Props) => {
  const redirect =
    redirectTo ??
    (typeof window !== "undefined" ? window.location.pathname + window.location.search : "/");
  const href = `/inscription?role=${role}&redirect=${encodeURIComponent(redirect)}`;

  return (
    <div
      className={
        "rounded-2xl border border-border bg-muted/40 p-4 flex items-center gap-3 " +
        (className ?? "")
      }
    >
      <div
        aria-hidden
        className="shrink-0 h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-sm"
      >
        ✦
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground leading-snug">
          Découvrez votre affinité avec {targetLabel}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
          Créez votre compte pour voir votre score de compatibilité.
        </p>
      </div>
      <Link
        to={href}
        className="shrink-0 inline-flex items-center rounded-full bg-primary text-primary-foreground text-xs font-semibold px-3 py-1.5 hover:opacity-90 transition-opacity"
      >
        Créer un compte
      </Link>
    </div>
  );
};

export default AffinityTeaser;
