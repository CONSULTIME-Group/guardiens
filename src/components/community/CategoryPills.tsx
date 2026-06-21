import { COMMUNITY_CATEGORIES, type CommunityCategory } from "@/lib/communityCategories";
import { cn } from "@/lib/utils";

interface Props {
  value: CommunityCategory | "all";
  onChange: (v: CommunityCategory | "all") => void;
  className?: string;
}

const CategoryPills = ({ value, onChange, className }: Props) => {
  const opts: ({ key: "all" | CommunityCategory; label: string })[] = [
    { key: "all", label: "Tout" },
    ...COMMUNITY_CATEGORIES.map((c) => ({ key: c.key, label: c.label })),
  ];
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {opts.map((o) => (
        <button
          key={o.key}
          type="button"
          onClick={() => onChange(o.key)}
          className={cn(
            "px-3 py-1.5 rounded-full text-xs font-semibold transition-colors border",
            value === o.key
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-card text-foreground/70 border-border hover:bg-accent",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
};

export default CategoryPills;
