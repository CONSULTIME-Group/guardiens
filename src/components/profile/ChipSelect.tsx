import { cn } from "@/lib/utils";

interface ChipSelectProps {
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  className?: string;
  /** ID d'un Label externe qui décrit le groupe (a11y). */
  ariaLabelledBy?: string;
  ariaLabel?: string;
}

const ChipSelect = ({ options, selected, onChange, className, ariaLabelledBy, ariaLabel }: ChipSelectProps) => {
  const toggle = (option: string) => {
    onChange(
      selected.includes(option)
        ? selected.filter(s => s !== option)
        : [...selected, option]
    );
  };

  return (
    <div
      role="group"
      aria-labelledby={ariaLabelledBy}
      aria-label={ariaLabelledBy ? undefined : ariaLabel}
      className={cn("flex flex-wrap gap-2", className)}
    >
      {options.map(option => {
        const isSelected = selected.includes(option);
        return (
          <button
            key={option}
            type="button"
            onClick={() => toggle(option)}
            aria-pressed={isSelected}
            className={cn(
              "px-4 py-2 rounded-full text-sm font-medium transition-all border",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              isSelected
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background text-foreground border-border hover:border-primary/50"
            )}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
};

export default ChipSelect;

