import { Link } from "react-router-dom";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import FavoriteButton from "@/components/shared/FavoriteButton";

interface Sitter {
  id: string;
  first_name?: string | null;
  avatar_url?: string | null;
  city?: string | null;
}

interface SitterCardProps {
  sitter: Sitter;
  fallbackLabel: string;
}

const SitterCard = ({ sitter, fallbackLabel }: SitterCardProps) => {
  const initials = (sitter.first_name ?? fallbackLabel)[0]?.toUpperCase() ?? "?";

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

      <FavoriteButton targetType="sitter" targetId={sitter.id} size="md" className="shrink-0" />
    </article>
  );
};

export default SitterCard;
