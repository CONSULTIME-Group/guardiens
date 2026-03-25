import { cn } from "@/lib/utils";

interface ChipSelectProps {
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  className?: string;
}

const ChipSelect = ({ options, selected, onChange, className }: ChipSelectProps) => {
  const toggle = (option: string) => {
    onChange(
      selected.includes(option)
        ? selected.filter(s => s !== option)
        : [...selected, option]
    );
  };

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {options.map(option => (
        <button
          key={option}
          type="button"
          onClick={() => toggle(option)}
          className={cn(
            "px-4 py-2 rounded-full text-sm font-medium transition-all border",
            selected.includes(option)
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-background text-foreground border-border hover:border-primary/50"
          )}
        >
          {option}
        </button>
      ))}
    </div>
  );
};

export default ChipSelect;
