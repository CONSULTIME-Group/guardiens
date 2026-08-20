import { cn } from "@/lib/utils";

export interface RadioChipOption {
  value: string;
  label: string;
}

interface RadioChipGroupProps {
  options: readonly (string | RadioChipOption)[];
  /** Valeur actuellement sélectionnée ("" si aucune). */
  value: string;
  onChange: (value: string) => void;
  className?: string;
  /** ID d'un Label externe qui décrit le groupe (a11y). */
  ariaLabelledBy?: string;
  ariaLabel?: string;
  disabled?: boolean;
}

const normalize = (o: string | RadioChipOption): RadioChipOption =>
  typeof o === "string" ? { value: o, label: o } : o;

/**
 * Choix unique en pastilles, sémantique radiogroup.
 * À utiliser pour toute question à réponse unique : un ChipSelect
 * (multi-sélection) sur une donnée mono-valeur induit l'utilisateur en erreur.
 */
const RadioChipGroup = ({ options, value, onChange, className, ariaLabelledBy, ariaLabel, disabled = false }: RadioChipGroupProps) => {
  const items = options.map(normalize);
  const selectedIndex = Math.max(0, items.findIndex(o => o.value === value));

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (disabled) return;
    let next = -1;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (index + 1) % items.length;
    if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = (index - 1 + items.length) % items.length;
    if (next === -1) return;
    e.preventDefault();
    onChange(items[next].value);
    const group = (e.currentTarget as HTMLElement).closest('[role="radiogroup"]');
    group?.querySelectorAll<HTMLElement>('[role="radio"]')[next]?.focus();
  };

  return (
    <div
      role="radiogroup"
      aria-labelledby={ariaLabelledBy}
      aria-label={ariaLabelledBy ? undefined : ariaLabel}
      className={cn("flex flex-wrap gap-2", className)}
    >
      {items.map((option, index) => {
        const isSelected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            tabIndex={index === selectedIndex ? 0 : -1}
            onClick={() => onChange(isSelected ? "" : option.value)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            disabled={disabled}
            className={cn(
              "inline-flex items-center justify-center min-h-[44px] px-4 py-2 rounded-full text-sm font-medium transition-all border",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              disabled && "opacity-50 cursor-not-allowed",
              isSelected
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background text-foreground border-border hover:border-primary/50"
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
};

export default RadioChipGroup;
