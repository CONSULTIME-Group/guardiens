import { useState } from "react";
import BadgeShield from "./BadgeShield";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";

interface BadgeCount {
  badge_key: string;
  count: number;
}

interface Props {
  badges: BadgeCount[];
  title?: string;
  maxVisible?: number;
}

const BadgeShieldGrid = ({ badges, title = "Ses badges", maxVisible = 6 }: Props) => {
  const [showAll, setShowAll] = useState(false);
  const sorted = [...badges].sort((a, b) => b.count - a.count);
  const visible = showAll ? sorted : sorted.slice(0, maxVisible);

  if (sorted.length === 0) return null;

  return (
    <div className="space-y-3">
      {title && <h3 className="font-heading font-semibold text-sm">{title}</h3>}
      <div className="flex flex-wrap gap-3 justify-start">
        {visible.map(({ badge_key, count }, i) => (
          <BadgeShield
            key={badge_key}
            badgeKey={badge_key}
            count={count}
            size={i < 3 ? "md" : "sm"}
            isTopBadge={i < 3}
          />
        ))}
      </div>
      {sorted.length > maxVisible && (
        <Button
          variant="ghost"
          size="sm"
          className="text-xs text-muted-foreground gap-1"
          onClick={() => setShowAll(!showAll)}
        >
          {showAll ? <><ChevronUp className="h-3 w-3" /> Voir moins</> : <><ChevronDown className="h-3 w-3" /> Voir tous les badges ({sorted.length})</>}
        </Button>
      )}
    </div>
  );
};

export default BadgeShieldGrid;
