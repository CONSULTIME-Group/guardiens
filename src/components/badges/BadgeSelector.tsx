import { BadgeDef } from "./badgeDefinitions";

interface Props {
  badges: BadgeDef[];
  selected: string[];
  onChange: (selected: string[]) => void;
  maxSelect?: number;
}

const BadgeSelector = ({ badges, selected, onChange, maxSelect = 3 }: Props) => {
  const atMax = selected.length >= maxSelect;

  const toggle = (key: string) => {
    if (selected.includes(key)) {
      onChange(selected.filter(k => k !== key));
    } else if (!atMax) {
      onChange([...selected, key]);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">
        Attribuez jusqu'à {maxSelect} badges <span className="text-muted-foreground font-normal">({selected.length}/{maxSelect})</span>
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {badges.map(badge => {
          const isSelected = selected.includes(badge.key);
          const disabled = atMax && !isSelected;
          const Icon = badge.icon;

          return (
            <button
              key={badge.key}
              type="button"
              onClick={() => toggle(badge.key)}
              disabled={disabled}
              className={`flex items-center gap-3 p-3 rounded-lg border text-left text-sm transition-all ${
                isSelected
                  ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                  : disabled
                    ? "border-border opacity-40 cursor-not-allowed"
                    : "border-border hover:border-primary/30 hover:bg-accent/50"
              }`}
            >
              <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                isSelected ? "bg-primary/10" : "bg-muted"
              }`}>
                <Icon className={`h-4 w-4 ${isSelected ? badge.colorClass : "text-muted-foreground"}`} />
              </div>
              <div className="min-w-0">
                <p className={`font-medium text-xs leading-tight ${isSelected ? "text-foreground" : "text-muted-foreground"}`}>
                  {badge.label}
                </p>
                <p className="text-[10px] text-muted-foreground leading-tight mt-0.5 truncate">{badge.description}</p>
              </div>
              {isSelected && (
                <div className="ml-auto shrink-0 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                  <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default BadgeSelector;
