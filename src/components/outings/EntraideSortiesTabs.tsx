import { Link } from "react-router-dom";
import { OUTING_COPY } from "@/lib/outings";

/**
 * Lot SORT1 : les deux sous-onglets de la rubrique « Entraide & sorties ».
 * Deux adresses distinctes (/petites-missions et /sorties), donc des liens.
 */
const EntraideSortiesTabs = ({ active }: { active: "entraide" | "sorties" }) => {
  const tab = (key: "entraide" | "sorties", to: string) => {
    const current = active === key;
    return (
      <Link
        to={to}
        aria-current={current ? "page" : undefined}
        className={`flex h-12 items-center justify-center rounded-xl text-base no-underline ${
          current ? "bg-card font-semibold text-foreground shadow-sm" : "font-medium text-muted-foreground hover:text-foreground"
        }`}
      >
        {OUTING_COPY.tabs[key]}
      </Link>
    );
  };
  return (
    <nav aria-label={OUTING_COPY.hubTitle} data-testid="entraide-sorties-tabs" className="grid grid-cols-2 gap-1 rounded-2xl bg-muted p-1">
      {tab("entraide", "/petites-missions")}
      {tab("sorties", "/sorties")}
    </nav>
  );
};

export default EntraideSortiesTabs;
