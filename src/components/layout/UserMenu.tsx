import { useNavigate } from "react-router-dom";
import { UserCircle2, Eye, Settings, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface UserMenuProps {
  /** Variante compacte pour la top bar mobile. */
  compact?: boolean;
  className?: string;
}

/**
 * Avatar de l'utilisateur connecté, point d'entrée vers son profil.
 * Les destinations suivent le rôle actif, sans rechargement.
 */
const UserMenu = ({ compact = false, className }: UserMenuProps) => {
  const { user, activeRole, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  const effectiveRole = user.role === "both" ? activeRole : user.role;
  const isOwnerView = effectiveRole === "owner";
  const initial = (user.firstName?.charAt(0) || "?").toUpperCase();
  const displayName = user.firstName || "Mon compte";

  const profileTo = isOwnerView ? "/owner-profile" : "/profile";
  const publicTo = isOwnerView
    ? `/gardiens/${user.id}?tab=proprio`
    : `/gardiens/${user.id}`;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Mon compte et mon profil"
          className={cn(
            "shrink-0 inline-flex items-center justify-center rounded-full transition-colors hover:bg-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
            compact ? "min-h-11 min-w-11" : "min-h-11 min-w-11",
            className,
          )}
        >
          <Avatar className={cn("border border-border", compact ? "h-8 w-8" : "h-9 w-9")}>
            {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt="" />}
            <AvatarFallback className="text-xs font-semibold bg-muted">
              {initial}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        <div className="px-2 py-1.5 text-xs text-muted-foreground truncate">{displayName}</div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => navigate(profileTo)} className="gap-2 min-h-11">
          <UserCircle2 className="h-4 w-4" aria-hidden="true" />
          Mon profil
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => navigate(publicTo)} className="gap-2 min-h-11">
          <Eye className="h-4 w-4" aria-hidden="true" />
          Mon profil public
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => navigate("/settings")} className="gap-2 min-h-11">
          <Settings className="h-4 w-4" aria-hidden="true" />
          Paramètres
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => logout()} className="gap-2 min-h-11 text-destructive focus:text-destructive">
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Déconnexion
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default UserMenu;
