import { Link } from "react-router-dom";
import { feeLabel, outingCategory, outingDateLabel, outingPath, outingPlaceLine, outingState, placesLine, type PublicOuting } from "@/lib/outings";

/** Carte d'une sortie dans une liste : gouache de la catégorie, jour, lieu, places. */
const OutingCard = ({ outing }: { outing: PublicOuting }) => {
  const category = outingCategory(outing.category);
  const state = outingState(outing);
  return (
    <article className="relative flex gap-3.5 rounded-2xl border border-border bg-card p-3.5" data-testid="outing-card">
      <img src={category.art} alt={category.alt} width={84} height={84} loading="lazy" className="h-[84px] w-[84px] shrink-0 object-contain" />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <span className="self-start rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
          {category.label}
        </span>
        <h3 className="text-[17px] font-semibold leading-snug">
          <Link to={outingPath(outing.slug)} className="text-foreground no-underline hover:underline after:absolute after:inset-0">
            {outing.title}
          </Link>
        </h3>
        <p className="text-sm leading-snug text-muted-foreground">
          {outingDateLabel(outing.starts_at)} · {outingPlaceLine(outing)}
        </p>
        <p className={`text-sm font-semibold ${state === "open" ? "text-primary" : "text-muted-foreground"}`}>
          {placesLine(outing)} · {feeLabel(outing.participation_eur)}
        </p>
      </div>
    </article>
  );
};

export default OutingCard;
