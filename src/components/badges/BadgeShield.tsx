import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { getBadgeDef, getBadgeCategory, SPECIAL_BADGE } from "./badgeDefinitions";

// Shield fill/stroke by category
const CATEGORY_STYLES: Record<string, { fill: string; stroke: string }> = {
  sitter:  { fill: "#EAF3DE", stroke: "#3B6D11" },
  owner:   { fill: "#E6F1FB", stroke: "#185FA5" },
  special: { fill: "#FAEEDA", stroke: "#854F0B" },
  status:  { fill: "#FAEEDA", stroke: "#854F0B" },
};

// Override for specific keys
const KEY_OVERRIDES: Record<string, { fill: string; stroke: string }> = {
  identity_verified:  { fill: "#EAF3DE", stroke: "#2D6A4F" },
  founder:            { fill: "#FAEEDA", stroke: "#854F0B" },
  emergency_sitter:   { fill: "#FAEEDA", stroke: "#854F0B" },
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

  const category = getBadgeCategory(badgeKey) || "sitter";
  const style = KEY_OVERRIDES[badgeKey] || CATEGORY_STYLES[category] || CATEGORY_STYLES.sitter;
  const Icon = def.icon;

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
        <svg
          viewBox="0 0 40 48"
          width={dimensions.w}
          height={dimensions.h}
          className="absolute inset-0"
        >
          <path
            d="M20 2 L38 10 L38 30 C38 40 20 46 20 46 C20 46 2 40 2 30 L2 10 Z"
            fill={style.fill}
            stroke={style.stroke}
            strokeWidth={1.5}
          />
          {isTopBadge && (
            <path
              d="M20 2 L38 10 L38 30 C38 40 20 46 20 46 C20 46 2 40 2 30 L2 10 Z"
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
        <Icon
          className="relative z-10"
          style={{
            width: dimensions.icon,
            height: dimensions.icon,
            color: style.stroke,
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
