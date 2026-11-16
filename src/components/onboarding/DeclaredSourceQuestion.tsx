/**
 * Lot SRC4 : question facultative « Comment avez-vous connu Guardiens ? ».
 * Une seule réponse, un clic pour choisir, un second clic pour retirer.
 */
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { DECLARED_SOURCE_LABELS, DECLARED_SOURCE_VALUES, type DeclaredSource } from "@/lib/declaredSource";

type Props = {
  value: DeclaredSource | null;
  onChange: (value: DeclaredSource | null) => void;
  disabled?: boolean;
};

export function DeclaredSourceQuestion({ value, onChange, disabled = false }: Props) {
  return (
    <section className="space-y-3" aria-labelledby="declared-source-heading" data-testid="declared-source-question">
      <div className="space-y-1">
        <h2 id="declared-source-heading" className="font-heading text-lg font-semibold">
          Comment avez-vous connu Guardiens ?
        </h2>
        <p className="text-sm text-muted-foreground">Facultatif, une seule réponse. Elle nous aide à savoir où parler de Guardiens.</p>
      </div>
      <div role="radiogroup" aria-labelledby="declared-source-heading" className="flex flex-wrap gap-2">
        {DECLARED_SOURCE_VALUES.map((option) => {
          const selected = value === option;
          return (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={disabled}
              onClick={() => onChange(selected ? null : option)}
              className={cn(
                "inline-flex min-h-[44px] items-center gap-1.5 rounded-full border px-4 py-2 text-sm transition-colors",
                selected
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-foreground hover:bg-muted",
                disabled && "opacity-60",
              )}
            >
              {selected && <Check className="h-4 w-4" aria-hidden="true" />}
              {DECLARED_SOURCE_LABELS[option]}
            </button>
          );
        })}
      </div>
    </section>
  );
}

export default DeclaredSourceQuestion;
