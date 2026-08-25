/** Repli typographique quand un article n'a pas d'image de couverture :
 *  papier crème, lavis vert pin et terracotta, initiale du titre.
 *  Même règle que sur /races : jamais de trou dans la grille.
 *  Source unique : /actualites, page article, ressources du dashboard. */
const ArticleCoverFallback = ({
  title,
  compact = false,
  className = "",
}: {
  title: string;
  compact?: boolean;
  className?: string;
}) => (
  <div
    aria-hidden="true"
    className={`flex flex-col items-center justify-center ${className}`}
    style={{
      backgroundColor: "hsl(var(--hero-paper))",
      backgroundImage:
        "radial-gradient(ellipse 65% 55% at 26% 20%, hsl(var(--primary) / 0.10), transparent 70%)," +
        "radial-gradient(ellipse 60% 50% at 76% 80%, hsl(var(--secondary) / 0.14), transparent 70%)",
    }}
  >
    <span
      className={`font-heading font-semibold text-secondary/70 select-none leading-none ${
        compact ? "text-2xl" : "text-5xl"
      }`}
    >
      {title.trim().charAt(0).toUpperCase()}
    </span>
  </div>
);

export default ArticleCoverFallback;
