import { Link } from "react-router-dom";
import { useEffect } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import FavoriteButton from "@/components/shared/FavoriteButton";
import AffinityBadge from "@/components/matching/AffinityBadge";
import type { AffinityResult } from "@/lib/affinityScore";
import { trackEvent } from "@/lib/analytics";

interface Sitter {
  id: string;
  first_name?: string | null;
  avatar_url?: string | null;
  city?: string | null;
}

interface SitterCardProps {
  sitter: Sitter;
  fallbackLabel: string;
  affinity?: AffinityResult | null;
}

const SitterCard = ({ sitter, fallbackLabel, affinity }: SitterCardProps) => {
  const initials = (sitter.first_name ?? fallbackLabel)[0]?.toUpperCase() ?? "?";

  useEffect(() => {
    if (affinity) {
      void trackEvent("affinity_badge_seen", {
        metadata: { context: "favorites", score: affinity.score, total: affinity.total },
      });
    }
  }, [affinity]);


  return (
    <article className="flex items-center gap-3 px-3 py-3 min-h-[60px] rounded-xl border border-border bg-card hover:bg-accent/40 transition-colors">
      <Link
        to={`/gardiens/${sitter.id}`}
        className="shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-full"
        tabIndex={-1}
        aria-hidden="true"
      >
        <Avatar className="h-10 w-10">
          <AvatarImage src={sitter.avatar_url ?? undefined} alt="" />
          <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
            {initials}
          </AvatarFallback>
        </Avatar>
      </Link>

      <div className="flex-1 min-w-0">
        <Link
          to={`/gardiens/${sitter.id}`}
          className="block text-sm font-medium text-foreground hover:text-primary transition-colors truncate leading-snug"
        >
          <span className="capitalize">{sitter.first_name ?? fallbackLabel}</span>
        </Link>
        {sitter.city && (
          <p className="text-xs text-muted-foreground truncate mt-0.5">{sitter.city}</p>
        )}
      </div>

      {affinity && <AffinityBadge result={affinity} size="sm" className="shrink-0" />}
      <FavoriteButton targetType="sitter" targetId={sitter.id} size="md" className="shrink-0" />
    </article>
  );
};

export default SitterCard;

