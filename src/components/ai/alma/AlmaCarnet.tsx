/**
 * <AlmaCarnet />, lot A7 : « Notre carnet » sur /alma pour un membre connecté.
 * Les moments datés lus en base, le stade avec sa date, puis le prochain pas
 * réel. Rien d'autre : aucun moment sans donnée.
 */
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { bondDateLabel, BOND_STAGE_LABEL, type AlmaBond } from "@/lib/alma/bond";

interface Props {
  bond: AlmaBond;
}

export function AlmaCarnet({ bond }: Props) {
  return (
    <section id="carnet" aria-labelledby="alma-carnet-title" className="mb-10 scroll-mt-24" data-testid="alma-carnet">
      <p className="text-[10.5px] font-bold uppercase text-terra [letter-spacing:.16em]">Ce que nous avons vécu</p>
      <h2 id="alma-carnet-title" className="mt-1 text-xl md:text-2xl font-semibold text-foreground">
        Notre carnet
      </h2>
      <p className="mt-2 text-sm text-muted-foreground" data-testid="alma-carnet-stage">
        Notre lien est au stade {BOND_STAGE_LABEL[bond.stage]}
        {bond.stageSince ? ` depuis le ${bondDateLabel(bond.stageSince)}` : ""}.
        {bond.memberSince ? ` Je vous accompagne depuis le ${bondDateLabel(bond.memberSince)}.` : ""}
      </p>

      {bond.moments.length > 0 ? (
        <ol className="mt-5 space-y-0 border-l border-border pl-5" data-testid="alma-carnet-moments">
          {bond.moments.map((m) => (
            <li key={m.key} className="relative pb-4" data-moment={m.key}>
              <span aria-hidden className="absolute -left-[1.6rem] top-1.5 h-2.5 w-2.5 rounded-full bg-primary ring-4 ring-background" />
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{bondDateLabel(m.date)}</p>
              {m.href ? (
                <Link to={m.href} className="text-sm md:text-base text-foreground underline-offset-2 hover:underline">
                  {m.label}
                </Link>
              ) : (
                <p className="text-sm md:text-base text-foreground">{m.label}</p>
              )}
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-5 text-sm text-foreground/90">
          Le carnet s'ouvre avec votre première conversation avec moi ou votre premier geste vers la communauté.
        </p>
      )}

      {bond.next && (
        <Card className="mt-4 p-4 md:p-5 border-primary/30 bg-primary/5" data-testid="alma-carnet-next">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary mb-1">Prochain pas</p>
          <p className="text-sm md:text-base text-foreground/90">{bond.next.milestone}</p>
          <Button asChild size="sm" className="mt-3">
            <Link to={bond.next.href}>{bond.next.label}</Link>
          </Button>
        </Card>
      )}
    </section>
  );
}
