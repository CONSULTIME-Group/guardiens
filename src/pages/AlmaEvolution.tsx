/**
 * Page /alma — « Alma grandit avec vous ».
 * Montre les 4 stades d'évolution dans l'ordre, met en avant le stade
 * actuel et propose le prochain jalon avec le lien vers l'action.
 */
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ALMA_STAGES,
  ALMA_STAGE_LABEL,
  ALMA_STAGE_DESCRIPTION,
  useAlmaEvolution,
  type AlmaStage,
} from "@/hooks/useAlmaEvolution";
import { AlmaAvatarAnimated } from "@/components/ai/alma/AlmaAvatarAnimated";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const STAGE_MOOD: Record<AlmaStage, "gentle" | "attentive" | "happy" | "playful"> = {
  nouvelle: "gentle",
  eveillee: "attentive",
  complice: "happy",
  fidele: "playful",
};

export default function AlmaEvolution() {
  const { data, isLoading } = useAlmaEvolution();
  const currentStage: AlmaStage = data?.stage ?? "nouvelle";
  const currentIndex = ALMA_STAGES.indexOf(currentStage);

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Alma grandit avec vous · Guardiens</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="mx-auto w-full max-w-3xl px-4 py-8 md:py-12">
        <header className="flex items-center gap-4 mb-8">
          <AlmaAvatarAnimated size={72} mood={STAGE_MOOD[currentStage]} />
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Votre parcours avec Alma
            </p>
            <h1 className="text-2xl md:text-3xl font-semibold text-foreground">
              Alma grandit avec vous
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Plus vous prenez soin de votre profil et de la communauté, plus
              Alma vous accompagne finement.
            </p>
          </div>
        </header>

        {data?.nextMilestone && (
          <Card className="p-4 md:p-5 mb-6 border-primary/30 bg-primary/5">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary mb-1">
              Prochain jalon
            </p>
            <p className="text-sm md:text-base text-foreground/90">
              {data.nextMilestone}
            </p>
            {data.nextActionHref && data.nextActionLabel && (
              <Button asChild size="sm" className="mt-3">
                <Link to={data.nextActionHref}>{data.nextActionLabel}</Link>
              </Button>
            )}
          </Card>
        )}

        <ol className="space-y-3">
          {ALMA_STAGES.map((stage, index) => {
            const isCurrent = stage === currentStage;
            const isPast = index < currentIndex;
            return (
              <li key={stage}>
                <Card
                  className={cn(
                    "p-4 md:p-5 flex items-start gap-4 transition",
                    isCurrent && "border-primary/50 bg-primary/5 shadow-sm",
                    isPast && "opacity-80",
                  )}
                  aria-current={isCurrent ? "step" : undefined}
                >
                  <div
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
                      isCurrent && "bg-primary text-primary-foreground",
                      isPast && "bg-primary/20 text-primary",
                      !isCurrent && !isPast && "bg-muted text-muted-foreground",
                    )}
                    aria-hidden
                  >
                    {isPast ? <Check className="h-4 w-4" /> : index + 1}
                  </div>
                  <div className="min-w-0">
                    <p className="text-base font-semibold text-foreground">
                      {ALMA_STAGE_LABEL[stage]}
                      {isCurrent && (
                        <span className="ml-2 inline-flex items-center rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-medium text-primary">
                          Vous êtes ici
                        </span>
                      )}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {ALMA_STAGE_DESCRIPTION[stage]}
                    </p>
                  </div>
                </Card>
              </li>
            );
          })}
        </ol>

        {isLoading && (
          <p className="mt-6 text-xs text-muted-foreground">
            Alma récupère votre progression…
          </p>
        )}
      </div>
    </div>
  );
}
