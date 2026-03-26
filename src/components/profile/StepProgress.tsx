import { Check, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const DEFAULT_STEPS = [
  { num: 1, label: "Identité" },
  { num: 2, label: "Profil gardien" },
  { num: 3, label: "Expérience" },
  { num: 4, label: "Mobilité" },
  { num: 5, label: "Préférences" },
];

interface StepProgressProps {
  currentStep: number;
  completion: number;
  completedSteps: Set<number>;
  onStepClick: (step: number) => void;
  steps?: { num: number; label: string }[];
  missingFields?: { step: number; label: string }[];
}

const StepProgress = ({ currentStep, completion, completedSteps, onStepClick, steps = DEFAULT_STEPS, missingFields = [] }: StepProgressProps) => (
  <div className="bg-card rounded-lg border border-border p-6 mb-8">
    <div className="flex items-center justify-between mb-4">
      <span className="font-medium">Taux de complétion</span>
      <span className="text-2xl font-bold text-primary font-heading">{completion}%</span>
    </div>
    <div className="h-3 bg-muted rounded-full overflow-hidden mb-6">
      <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${completion}%` }} />
    </div>

    {completion >= 60 && completion < 100 && (
      <div className="bg-primary/10 text-primary rounded-lg p-3 text-sm font-medium mb-4">
        Votre profil est maintenant visible !
      </div>
    )}
    {completion === 100 && (
      <div className="bg-primary/10 text-primary rounded-lg p-3 text-sm font-medium mb-4 flex items-center gap-2">
        <Check className="w-4 h-4" /> Profil complet
      </div>
    )}

    {completion < 100 && missingFields.length > 0 && (
      <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-4 mb-6">
        <p className="text-sm font-medium text-destructive flex items-center gap-2 mb-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          Il vous manque :
        </p>
        <div className="flex flex-wrap gap-2">
          {missingFields.map(({ step, label }) => (
            <button
              key={label}
              type="button"
              onClick={() => onStepClick(step)}
              className="text-xs bg-destructive/10 text-destructive hover:bg-destructive/20 rounded-full px-3 py-1 transition-colors cursor-pointer"
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    )}

    <div className="flex items-center justify-between gap-1">
      {steps.map(({ num, label }) => {
        const isActive = currentStep === num;
        const isCompleted = completedSteps.has(num);
        return (
          <button key={num} type="button" onClick={() => onStepClick(num)} className="flex flex-col items-center gap-1.5 flex-1 group cursor-pointer">
            <div className={cn(
              "w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold transition-all",
              isActive ? "bg-primary text-primary-foreground ring-2 ring-primary/30"
                : isCompleted ? "bg-primary/20 text-primary"
                : "bg-muted text-muted-foreground group-hover:bg-muted/80"
            )}>
              {isCompleted && !isActive ? <Check className="w-4 h-4" /> : num}
            </div>
            <span className={cn("text-xs font-medium hidden sm:block", isActive ? "text-primary" : "text-muted-foreground")}>
              {label}
            </span>
          </button>
        );
      })}
    </div>
  </div>
);

export default StepProgress;
