import { getBadgeDef, SPECIAL_BADGE } from "./badgeDefinitions";

interface BadgeCount {
  badge_key: string;
  count: number;
}

interface Props {
  badges: BadgeCount[];
  max?: number;
  size?: "sm" | "md";
  showAll?: boolean;
}

const BadgePills = ({ badges, max = 3, size = "md", showAll = false }: Props) => {
  const sorted = [...badges].sort((a, b) => b.count - a.count);
  const visible = showAll ? sorted : sorted.slice(0, max);

  if (visible.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {visible.map(({ badge_key, count }) => {
        const def = getBadgeDef(badge_key);
        if (!def) return null;
        const Icon = def.icon;
        const isSpecial = badge_key === SPECIAL_BADGE.key;
        const sizeClasses = size === "sm" ? "text-[10px] px-2 py-0.5" : "text-xs px-2.5 py-1";

        return (
          <span
            key={badge_key}
            className={`inline-flex items-center gap-1 rounded-full font-medium ${sizeClasses} ${
              isSpecial
                ? "bg-amber-50 border border-amber-300 text-amber-700 dark:bg-amber-950 dark:border-amber-700 dark:text-amber-300"
                : "bg-accent border border-border text-foreground"
            }`}
            title={def.description}
          >
            <Icon className={`${size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"} ${def.colorClass}`} />
            {def.label}
            {count > 1 && <span className="text-muted-foreground">×{count}</span>}
          </span>
        );
      })}
      {!showAll && sorted.length > max && (
        <span className="text-[10px] text-muted-foreground self-center">+{sorted.length - max}</span>
      )}
    </div>
  );
};

export default BadgePills;
