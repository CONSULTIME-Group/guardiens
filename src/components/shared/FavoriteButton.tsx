import { Heart } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useIsFavorite, useToggleFavorite } from "@/hooks/useFavorites";
import { toast } from "sonner";

interface FavoriteButtonProps {
  targetType: "sitter" | "sit";
  targetId: string;
  size?: "sm" | "md";
  className?: string;
}

const FavoriteButton = ({ targetType, targetId, size = "sm", className = "" }: FavoriteButtonProps) => {
  const { user } = useAuth();
  const isFavorite = useIsFavorite(targetType, targetId);
  const { mutate, isPending } = useToggleFavorite();

  if (!user) return null;

  const iconSize = size === "sm" ? "h-4 w-4" : "h-5 w-5";
  const btnSize = size === "sm" ? "p-1.5" : "p-2";

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        mutate(
          { targetType, targetId, isFavorite },
          {
            onSuccess: () => {
              toast.success(isFavorite ? "Retiré des favoris" : "Ajouté aux favoris");
            },
          }
        );
      }}
      className={`${btnSize} rounded-full transition-all hover:scale-110 ${
        isFavorite
          ? "text-red-500 bg-red-50 hover:bg-red-100"
          : "text-muted-foreground bg-background/80 hover:bg-muted"
      } ${className}`}
      aria-label={isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
    >
      <Heart className={`${iconSize} ${isFavorite ? "fill-current" : ""}`} />
    </button>
  );
};

export default FavoriteButton;
