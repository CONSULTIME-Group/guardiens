import { useId, type ComponentType } from "react";
import { cn } from "@/lib/utils";

export interface OptionCard {
  value: string;
  label: string;
  /** Précision sous le libellé, hors nom accessible (aria-describedby). */
  description?: string;
  icon?: ComponentType<{ className?: string }>;
}

interface Props {
  options: readonly OptionCard[];
  /** Valeur sélectionnée ("" si aucune). */
  value: string;
  onChange: (value: string) => void;
  ariaLabelledBy?: string;
  ariaLabel?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * Choix unique en cartes pleine largeur (lot SC1, design pastel du 10/11/2026).
 * Pour les questions courtes à fort enjeu (trajets, voiture nécessaire) :
 * une carte par réponse, icône, cible de 56 px, sémantique radiogroup.
 * Même comportement clavier que RadioChipGroup.
 */
const OptionCards = ({ options, value, onChange, ariaLabelledBy, ariaLabel, disabled = false, className }: Props) => {
  const baseId = useId();
  const selectedIndex = Math.max(0, options.findIndex((o) => o.value === value));

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (disabled) return;
    let next = -1;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (index + 1) % options.length;
    if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = (index - 1 + options.length) % options.length;
    if (next === -1) return;
    e.preventDefault();
    onChange(options[next].value);
    const group = (e.currentTarget as HTMLElement).closest('[role="radiogroup"]');
    group?.querySelectorAll<HTMLElement>('[role="radio"]')[next]?.focus();
  };

  return (
    <div
      role="radiogroup"
      aria-labelledby={ariaLabelledBy}
      aria-label={ariaLabelledBy ? undefined : ariaLabel}
      className={cn("flex flex-col gap-2", className)}
    >
      {options.map((o, index) => {
        const selected = o.value === value;
        const Icon = o.icon;
        const labelId = `${baseId}-l${index}`;
        const descId = `${baseId}-d${index}`;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-labelledby={labelId}
            aria-describedby={o.description ? descId : undefined}
            tabIndex={index === selectedIndex ? 0 : -1}
            onClick={() => onChange(selected ? "" : o.value)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            disabled={disabled}
            className={cn(
              "flex w-full min-h-14 items-center gap-3 rounded-2xl border-[1.5px] px-3.5 py-2.5 text-left transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              disabled && "opacity-50 cursor-not-allowed",
              selected
                ? "border-primary bg-pastel-sage"
                : "border-border bg-card hover:border-primary/40"
            )}
          >
            {Icon && (
              <span
                aria-hidden
                className={cn(
                  "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                  selected ? "bg-card text-pastel-sage-ink" : "bg-pastel-sage text-pastel-sage-ink"
                )}
              >
                <Icon className="h-[18px] w-[18px]" />
              </span>
            )}
            <span className="flex min-w-0 flex-1 flex-col">
              <span id={labelId} className={cn("text-base leading-snug text-foreground", selected && "font-semibold")}>
                {o.label}
              </span>
              {o.description && (
                <span id={descId} className="text-sm text-muted-foreground">
                  {o.description}
                </span>
              )}
            </span>
            <span
              aria-hidden
              className={cn(
                "inline-flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border-2",
                selected ? "border-primary" : "border-muted-foreground/40"
              )}
            >
              {selected && <span className="h-2.5 w-2.5 rounded-full bg-primary" />}
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default OptionCards;
