import { useToast } from "@/hooks/use-toast";

const ENV_OPTIONS = [
  { key: "ville", label: "🏙️ Ville" },
  { key: "campagne", label: "🌿 Campagne" },
  { key: "montagne", label: "⛰️ Montagne" },
  { key: "lac", label: "🏞️ Lac" },
  { key: "vignes", label: "🍇 Vignes" },
  { key: "foret", label: "🌲 Forêt" },
] as const;

export const ENV_LABEL_MAP: Record<string, string> = {
  ville: "🏙️ Ville",
  campagne: "🌿 Campagne",
  montagne: "⛰️ Montagne",
  lac: "🏞️ Lac",
  vignes: "🍇 Vignes",
  foret: "🌲 Forêt",
};

interface EnvironmentPillsProps {
  selected: string[];
  onChange: (values: string[]) => void;
  readOnly?: boolean;
  maxVisible?: number;
}

const EnvironmentPills = ({ selected, onChange, readOnly = false, maxVisible }: EnvironmentPillsProps) => {
  const { toast } = useToast();
  const atMax = selected.length >= 3;

  if (readOnly) {
    const visible = maxVisible ? selected.slice(0, maxVisible) : selected;
    const extra = maxVisible && selected.length > maxVisible ? selected.length - maxVisible : 0;
    if (selected.length === 0) return null;
    return (
      <div className="flex gap-2 flex-wrap">
        {visible.map(env => (
          <span key={env} className="bg-muted text-muted-foreground rounded-full px-3 py-1 text-xs">
            {ENV_LABEL_MAP[env] || env}
          </span>
        ))}
        {extra > 0 && (
          <span className="text-muted-foreground text-xs self-center">+{extra}</span>
        )}
      </div>
    );
  }

  const toggle = (key: string) => {
    if (selected.includes(key)) {
      onChange(selected.filter(k => k !== key));
    } else if (atMax) {
      toast({ title: "Maximum 3 environnements", variant: "destructive" });
    } else {
      onChange([...selected, key]);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {ENV_OPTIONS.map(({ key, label }) => {
        const isSelected = selected.includes(key);
        const isDisabled = atMax && !isSelected;
        return (
          <button
            key={key}
            type="button"
            onClick={() => toggle(key)}
            className={`rounded-full px-4 py-2 text-sm transition-colors ${
              isSelected
                ? "bg-primary text-primary-foreground font-medium cursor-pointer"
                : isDisabled
                  ? "border border-border bg-card text-muted-foreground opacity-40 cursor-not-allowed"
                  : "border border-border bg-card text-muted-foreground cursor-pointer hover:border-primary"
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
};

export default EnvironmentPills;
