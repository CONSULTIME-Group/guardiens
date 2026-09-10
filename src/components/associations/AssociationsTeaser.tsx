import { Link } from "react-router-dom";

/**
 * Encart de renvoi vers la section publique des associations.
 * Deux variantes de fond : claire (espace Entraide) et sombre (section
 * entraide de la page d'accueil, posée sur l'aplat vert pin).
 */
export function AssociationsTeaser({
  title,
  text,
  tone = "light",
  className = "",
}: {
  title: string;
  text: string;
  tone?: "light" | "dark";
  className?: string;
}) {
  const dark = tone === "dark";
  return (
    <div
      className={`rounded-2xl border p-5 ${
        dark
          ? "border-pine-foreground/25 bg-pine-foreground/5"
          : "border-border bg-card"
      } ${className}`}
    >
      <p
        className={`font-heading text-base md:text-lg font-semibold ${
          dark ? "text-pine-foreground" : "text-foreground"
        }`}
      >
        {title}
      </p>
      <p
        className={`mt-2 font-body text-sm leading-relaxed ${
          dark ? "text-pine-foreground/85" : "text-muted-foreground"
        }`}
      >
        {text}
      </p>
      <Link
        to="/associations"
        className={`mt-4 inline-flex items-center rounded-full px-5 py-2.5 font-body text-sm font-medium transition-colors ${
          dark
            ? "border border-pine-foreground/60 text-pine-foreground hover:bg-pine-foreground/10"
            : "border border-border text-foreground hover:bg-muted/40"
        }`}
      >
        Voir les associations
      </Link>
    </div>
  );
}
