/**
 * SitterMissingOpportunities, bloc « occasions manquées » du dashboard
 * gardien. Nomme au maximum deux questions sans réponse, formulées en
 * annonces réelles recalculées à l'affichage (« 8 des 11 annonces en ligne
 * demandent un gardien véhiculé, vous n'avez pas répondu. »).
 *
 * Disparaît dès que tout est répondu ou qu'aucune annonce en ligne n'est
 * concernée. Jamais de barre de progression, jamais de badge permanent.
 */
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSitterMissingOpportunities } from "@/hooks/useSitterMissingOpportunities";
import { pickMissingOpportunities } from "@/lib/missingOpportunities";

const SitterMissingOpportunities = () => {
  const { user } = useAuth();
  const stats = useSitterMissingOpportunities(user?.id);
  const items = useMemo(() => pickMissingOpportunities(stats), [stats]);

  if (items.length === 0) return null;

  return (
    <section
      aria-labelledby="missing-opportunities-heading"
      className="rounded-2xl border border-border bg-card p-5 sm:p-6"
    >
      <h2
        id="missing-opportunities-heading"
        className="font-heading text-lg font-semibold text-foreground"
      >
        Ces réponses comptent pour les annonces en ligne
      </h2>
      <ul className="mt-4 space-y-4">
        {items.map((item) => (
          <li
            key={item.key}
            className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
          >
            <p className="text-sm text-muted-foreground">{item.sentence}</p>
            <Link
              to={item.href}
              className="inline-flex min-h-[44px] shrink-0 items-center justify-center rounded-full border border-primary px-4 text-sm font-medium text-primary transition-colors hover:bg-primary/5"
            >
              {item.ctaLabel}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
};

export default SitterMissingOpportunities;
