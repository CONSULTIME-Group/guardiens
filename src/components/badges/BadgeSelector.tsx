import { BADGE_DEFINITIONS, GARDIEN_BADGE_IDS, PROPRIO_BADGE_IDS } from "./badge-definitions";
import { BadgeSceau } from "./BadgeSceau";

interface BadgeSelectorProps {
  target: "gardien" | "proprio";
  selected: string[];
  onChange: (next: string[]) => void;
  max?: number;
}

export function BadgeSelector({ target, selected, onChange, max = 3 }: BadgeSelectorProps) {
  const ids = target === "gardien" ? GARDIEN_BADGE_IDS : PROPRIO_BADGE_IDS;

  const toggle = (id: string) => {
    if (selected.includes(id)) {
      onChange(selected.filter((x) => x !== id));
    } else {
      if (selected.length >= max) return;
      onChange([...selected, id]);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <p className="text-sm font-medium">
          Attribuer des écussons{" "}
          <span className="text-muted-foreground font-normal">(optionnel, jusqu'à {max})</span>
        </p>
        <span className="text-xs text-muted-foreground">
          {selected.length}/{max}
        </span>
      </div>
      <p className="text-xs text-muted-foreground">
        Mettez en valeur ce qui a particulièrement marqué cette garde.
      </p>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
        {ids.map((id) => {
          const def = BADGE_DEFINITIONS[id];
          if (!def) return null;
          const isSelected = selected.includes(id);
          const disabled = !isSelected && selected.length >= max;
          return (
            <button
              key={id}
              type="button"
              onClick={() => toggle(id)}
              disabled={disabled}
              aria-pressed={isSelected}
              className={`relative flex flex-col items-center gap-1.5 p-2 rounded-xl border-2 transition-all text-center ${
                isSelected
                  ? "border-primary bg-primary/5 shadow-sm"
                  : disabled
                  ? "border-border opacity-40 cursor-not-allowed"
                  : "border-border hover:border-primary/40 hover:bg-accent/30"
              }`}
            >
              <div className="pointer-events-none">
                <BadgeSceau id={id} count={1} active size="compact" showCount={false} />
              </div>
              <span className="text-[10px] leading-tight font-medium line-clamp-2">
                {def.label}
              </span>
              {isSelected && (
                <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                  <svg className="h-2.5 w-2.5 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default BadgeSelector;
