/**
 * Carte Alma « Vous partez quand ? » en tête du dashboard propriétaire (lot N4).
 * Trois états : ask (question), known (période connue, préparation), hidden.
 * Disparaît dès qu'une annonce est publiée, et pour le groupe témoin.
 */
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  finishUrl, remainingPhrase, PERIOD_OF, type DeparturePayload, type DeparturePeriod,
} from "@/lib/ownerDeparture";
import { Faces, PeriodChoices, ProgressBar } from "@/components/departure/DepartureParts";

export function departureCardVisible(d: DeparturePayload | null | undefined): boolean {
  return !!d && !d.holdout && !d.has_published && d.alma_state !== "hidden";
}

interface Props { data: DeparturePayload | null | undefined; onPick: (p: DeparturePeriod) => void; busy?: boolean }

const OwnerDepartureAlmaCard = ({ data, onPick, busy }: Props) => {
  if (!departureCardVisible(data) || !data) return null;
  const known = data.alma_state === "known" && data.period && data.period !== "plus_tard";
  return (
    <section className="rounded-2xl border border-border bg-card p-5 md:p-6" data-testid="owner-departure-card" data-state={known ? "known" : "ask"}>
      <p className="text-[11.5px] font-semibold uppercase tracking-[0.16em] text-secondary">Alma</p>
      {known ? (
        <>
          <h2 className="mt-1 font-heading text-[22px] leading-snug text-foreground">
            Votre annonce de {PERIOD_OF[data.period as Exclude<DeparturePeriod, "plus_tard">]} est prête à {data.readiness.percent} %.
          </h2>
          <p className="mt-2 text-[15px] text-muted-foreground">{remainingPhrase(data.readiness.todo)}</p>
          <div className="mt-4"><ProgressBar percent={data.readiness.percent} /></div>
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <Button asChild className="h-[46px] rounded-full px-6">
              <Link to={finishUrl(data.period as DeparturePeriod)}>Terminer mon annonce</Link>
            </Button>
            {data.nearby && data.nearby.count > 0 && (
              <span className="flex items-center gap-2 text-[14px] text-muted-foreground">
                <Faces sitters={data.nearby.sitters} />
                {data.nearby.count} gardiens à moins de 50 km
              </span>
            )}
          </div>
        </>
      ) : (
        <>
          <h2 className="mt-1 mb-4 font-heading text-[22px] leading-snug text-foreground">Vous partez quand, cette année ?</h2>
          <PeriodChoices onPick={onPick} busy={busy} variant="pills" />
        </>
      )}
    </section>
  );
};

export default OwnerDepartureAlmaCard;
