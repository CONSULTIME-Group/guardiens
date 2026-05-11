import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, ListChecks, Clock } from "lucide-react";
import type { ActionCard } from "./types";

interface Props {
  actionCards: ActionCard[];
  lateCards: ActionCard[];
}

export const TodoSection = ({ actionCards, lateCards }: Props) => {
  const nothingToDo = actionCards.length === 0 && lateCards.length === 0;

  return (
    <section aria-labelledby="todo-heading" className="space-y-3">
      <h2 id="todo-heading" className="flex items-center gap-2 text-lg font-semibold font-heading">
        <ListChecks className="h-5 w-5 text-primary" aria-hidden />
        À traiter
      </h2>

      {nothingToDo ? (
        <Card className="border-success-border bg-success-soft/40">
          <CardContent className="flex items-center gap-3 py-6">
            <div className="rounded-full bg-success/15 p-2">
              <CheckCircle2 className="h-5 w-5 text-success" aria-hidden />
            </div>
            <div>
              <p className="font-semibold text-foreground">Tout est calme.</p>
              <p className="text-sm text-muted-foreground">
                Aucune file en attente, aucun retard à signaler.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {actionCards.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {actionCards.map((card) => (
                <Link
                  key={`todo-${card.link}-${card.label}`}
                  to={card.link}
                  className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 hover:border-primary/40 hover:shadow-md transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="rounded-lg bg-primary/10 p-2">
                    <card.icon className="h-5 w-5 text-primary" aria-hidden />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-primary">{card.count}</p>
                    <p className="text-sm text-muted-foreground">{card.label}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {lateCards.length > 0 && (
            <div className="space-y-2 pt-2">
              <h3 className="flex items-center gap-2 text-sm font-medium text-warning-foreground">
                <Clock className="h-4 w-4 text-warning" aria-hidden />
                En retard
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {lateCards.map((card) => (
                  <Link
                    key={`late-${card.link}-${card.label}`}
                    to={card.link}
                    className="flex items-center gap-4 rounded-xl border border-warning-border bg-warning-soft p-4 hover:bg-warning-soft/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <div className="rounded-lg bg-warning/15 p-2">
                      <card.icon className="h-5 w-5 text-warning" aria-hidden />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-warning-foreground">{card.count}</p>
                      <p className="text-sm text-warning-foreground/80">{card.label}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
};
