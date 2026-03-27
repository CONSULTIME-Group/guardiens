import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { getBadgeDef, SPECIAL_BADGE } from "./badgeDefinitions";

// Shield colors per badge key
const SHIELD_STYLES: Record<string, { bg: string; border: string }> = {
  // Sitter badges
  animals_adopted:      { bg: "#D8F3DC", border: "#2D6A4F" },
  house_clean:          { bg: "#DBEAFE", border: "#1E40AF" },
  garden_great:         { bg: "#E2EFDA", border: "#3B4A3F" },
  daily_news:           { bg: "#FEF3C7", border: "#92400E" },
  resourceful:          { bg: "#FFEDD5", border: "#C2410C" },
  beyond_expectations:  { bg: "#EDE9FE", border: "#6D28D9" },
  neighbors_love:       { bg: "#FCE7F3", border: "#BE185D" },
  invite_christmas:     { bg: "#FEF3C7", border: "#78350F" },
  // Owner badges
  great_guide:          { bg: "#DBEAFE", border: "#1E40AF" },
  fridge_full:          { bg: "#FEF3C7", border: "#92400E" },
  golden_animals:       { bg: "#FEF3C7", border: "#78350F" },
  dream_place:          { bg: "#D8F3DC", border: "#2D6A4F" },
  always_reachable:     { bg: "#DBEAFE", border: "#1E40AF" },
  instant_trust:        { bg: "#D8F3DC", border: "#2D6A4F" },
  learned_something:    { bg: "#EDE9FE", border: "#6D28D9" },
  will_return:          { bg: "#FCE7F3", border: "#BE185D" },
  // Special
  mutual_connection:    { bg: "#FEF3C7", border: "#C4956A" },
};

interface BadgeShieldProps {
  badgeKey: string;
  count?: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  isTopBadge?: boolean;
}

const BadgeShield = ({ badgeKey, count = 1, size = "md", showLabel = true, isTopBadge = false }: BadgeShieldProps) => {
  const def = getBadgeDef(badgeKey);
  if (!def) return null;

  const style = SHIELD_STYLES[badgeKey] || { bg: "#F3F4F6", border: "#9CA3AF" };
  const Icon = def.icon;
  const isSpecial = badgeKey === SPECIAL_BADGE.key;

  const dimensions = {
    sm: { w: 28, h: 34, icon: 12, fontSize: "9px" },
    md: { w: 40, h: 48, icon: 16, fontSize: "11px" },
    lg: { w: 52, h: 62, icon: 20, fontSize: "12px" },
  }[size];

  const shield = (
    <div
      className="flex flex-col items-center gap-0.5 group/shield cursor-default"
      style={{ width: dimensions.w + 16 }}
    >
      <div
        className="relative flex items-center justify-center transition-transform duration-200 group-hover/shield:-translate-y-0.5 group-hover/shield:shadow-md"
        style={{ width: dimensions.w, height: dimensions.h }}
      >
        {/* Shield SVG shape */}
        <svg
          viewBox="0 0 40 48"
          width={dimensions.w}
          height={dimensions.h}
          className="absolute inset-0"
        >
          <path
            d="M20 2 C10 2 3 6 3 6 L3 22 C3 34 20 46 20 46 C20 46 37 34 37 22 L37 6 C37 6 30 2 20 2Z"
            fill={style.bg}
            stroke={isSpecial ? "#C4956A" : style.border}
            strokeWidth={isSpecial ? 2.5 : 1.5}
          />
          {/* Golden sheen for top badges */}
          {isTopBadge && (
            <path
              d="M20 2 C10 2 3 6 3 6 L3 22 C3 34 20 46 20 46 C20 46 37 34 37 22 L37 6 C37 6 30 2 20 2Z"
              fill="url(#goldSheen)"
              opacity="0.15"
            />
          )}
          <defs>
            <linearGradient id="goldSheen" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#FFD700" />
              <stop offset="50%" stopColor="#FFF8DC" />
              <stop offset="100%" stopColor="#FFD700" />
            </linearGradient>
          </defs>
        </svg>
        {/* Icon centered */}
        <Icon
          className="relative z-10"
          style={{
            width: dimensions.icon,
            height: dimensions.icon,
            color: style.border,
          }}
        />
      </div>
      {showLabel && (
        <div className="text-center leading-tight mt-0.5" style={{ maxWidth: dimensions.w + 16 }}>
          <span
            className="font-medium text-foreground block truncate"
            style={{ fontSize: dimensions.fontSize }}
          >
            {def.label}
          </span>
          {count > 1 && (
            <span className="text-muted-foreground" style={{ fontSize: dimensions.fontSize }}>
              ×{count}
            </span>
          )}
        </div>
      )}
    </div>
  );

  return (
    <Tooltip>
      <TooltipTrigger asChild>{shield}</TooltipTrigger>
      <TooltipContent side="top" className="max-w-[200px]">
        <p className="text-xs font-medium">{def.label}</p>
        <p className="text-xs text-muted-foreground">{def.description}</p>
        {count > 1 && <p className="text-xs text-muted-foreground mt-0.5">Reçu {count} fois</p>}
      </TooltipContent>
    </Tooltip>
  );
};

export default BadgeShield;
