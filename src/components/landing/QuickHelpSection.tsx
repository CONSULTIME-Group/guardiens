import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { trackEvent } from "@/lib/analytics";

export const QUICK_HELP_EXAMPLES = [
  "Arroser mon jardin pendant un week-end",
  "Nourrir mon chat samedi",
  "Monter un meuble",
  "Réceptionner un colis",
  "Changer une ampoule au plafond",
  "M'aider pour un dossier en ligne",
] as const;

export const quickHelpTarget = (title: string, isAuthenticated: boolean) => {
  const mission = `/petites-missions/creer?titre=${encodeURIComponent(title)}`;
  return isAuthenticated ? mission : `/inscription?redirect=${encodeURIComponent(mission)}`;
};

export function QuickHelpSection() {
  const { isAuthenticated } = useAuth();
  return (
    <section className="bg-background py-[52px] md:py-20" aria-labelledby="quick-help-title">
      <div className="lp-wide">
        <h2 id="quick-help-title" className="font-heading text-3xl font-semibold text-foreground md:text-5xl">
          Demander un coup de main, en un clic
        </h2>
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {QUICK_HELP_EXAMPLES.map((title, index) => (
            <Link
              key={title}
              to={quickHelpTarget(title, isAuthenticated)}
              onClick={() => void trackEvent("home_quick_help_clicked", { metadata: { title, position: index + 1 } })}
              className="flex min-h-16 items-center border-b border-border px-2 py-4 font-body text-base font-medium text-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {title}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}