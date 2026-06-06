import { memo } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

export interface TodoItem {
  key: string;
  label: string;
  hint?: string;
  to: string;
  tone?: "warning" | "primary" | "info";
}

interface TodoCardProps {
  items: TodoItem[];
}

/**
 * Bloc unifié "À faire maintenant", agrège vérif identité, candidatures à examiner,
 * avis à laisser. Disparaît si vide. Remplace les chips éparses du hero.
 */
const TodoCard = memo(({ items }: TodoCardProps) => {
  if (items.length === 0) return null;

  const toneDot = (tone?: TodoItem["tone"]) => {
    switch (tone) {
      case "warning":
        return "bg-warning";
      case "primary":
        return "bg-primary";
      default:
        return "bg-info";
    }
  };

  return (
    <section
      aria-label="À faire maintenant"
      className="rounded-2xl border border-border bg-card overflow-hidden animate-fade-in"
    >
      <header className="px-4 md:px-5 pt-4 pb-2 flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[2px] text-muted-foreground font-sans font-semibold">
            À faire
          </p>
          <h2 className="font-heading text-base md:text-lg font-bold text-foreground leading-tight">
            {items.length} action{items.length > 1 ? "s" : ""} en attente
          </h2>
        </div>
      </header>
      <ul className="divide-y divide-border">
        {items.map((it) => (
          <li key={it.key}>
            <Link
              to={it.to}
              className="flex items-center gap-3 px-4 md:px-5 py-3 hover:bg-muted/40 transition-colors group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
            >
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${toneDot(it.tone)}`}
                aria-hidden="true"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {it.label}
                </p>
                {it.hint && (
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {it.hint}
                  </p>
                )}
              </div>
              <ArrowRight
                className="w-4 h-4 text-muted-foreground shrink-0 group-hover:translate-x-0.5 transition-transform"
                aria-hidden="true"
              />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
});

TodoCard.displayName = "TodoCard";
export default TodoCard;
