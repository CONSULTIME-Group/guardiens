/**
 * Lot L4 : frise de la garde (Annonce, Candidats, Rencontre, Garde, Avis).
 * Étapes inertes, libellés 14 px ; la rencontre est toujours dite facultative.
 * Le récit dit la rencontre facultative dans sa phrase (chapitre confirmé).
 * Mode compact : une ligne « Étape n sur 5 » et cinq points.
 */
import { FRIEZE_MEETING_STEP, type StoryFrieze } from "@/lib/dashboardStory";
import { cn } from "@/lib/utils";

interface Props {
  frieze: StoryFrieze;
  compact?: boolean;
}

const stateOf = (i: number, current: number) => (i < current ? "done" : i === current ? "current" : "next");

const Dot = ({ state, meeting }: { state: "done" | "current" | "next"; meeting: boolean }) => (
  <span
    aria-hidden="true"
    className={cn(
      "block h-[10px] w-[10px] shrink-0 rounded-full",
      state === "done" && "bg-primary",
      state === "current" && "bg-primary ring-[3px] ring-primary/25",
      state === "next" && (meeting ? "border-[1.5px] border-dashed border-foreground/55" : "border-[1.5px] border-foreground/55"),
    )}
  />
);

export default function GardeFrise({ frieze, compact = false }: Props) {
  const { labels, current } = frieze;
  const currentLabel = labels[current] ?? "";

  if (compact) {
    return (
      <div className="mt-[14px]" data-testid="garde-frise" data-mode="compact">
        <ol className="flex items-center gap-[8px]" aria-hidden="true">
          {labels.map((l, i) => (
            <li key={l}><Dot state={stateOf(i, current)} meeting={i === FRIEZE_MEETING_STEP} /></li>
          ))}
        </ol>
        <p className="mt-[6px] text-[14px] text-foreground/80">
          Étape {current + 1} sur {labels.length} : <span className="font-semibold text-foreground">{currentLabel}</span>
          {current === FRIEZE_MEETING_STEP && <span className="sr-only"> (facultative)</span>}
        </p>
      </div>
    );
  }

  return (
    <div className="mt-[16px]" data-testid="garde-frise" data-mode="full">
      <ol className="flex items-start justify-between gap-[4px]" aria-label={`Étape ${current + 1} sur ${labels.length} : ${currentLabel}`}>
        {labels.map((l, i) => {
          const state = stateOf(i, current);
          const meeting = i === FRIEZE_MEETING_STEP;
          return (
            <li
              key={l}
              className="flex min-w-0 flex-col items-center gap-[6px]"
              aria-current={state === "current" ? "step" : undefined}
            >
              <Dot state={state} meeting={meeting} />
              <span
                className={cn(
                  "whitespace-nowrap text-[14px] leading-none",
                  state === "current" ? "font-semibold text-foreground" : "text-foreground/70",
                )}
              >
                {l}
                {meeting && <span className="sr-only"> (facultative)</span>}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
