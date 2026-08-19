import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useAdmin } from "@/hooks/useAdmin";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { buildUserMenuEntries } from "@/lib/userMenuModel";

interface UserMenuProps {
  /** Variante compacte pour la top bar mobile. */
  compact?: boolean;
  className?: string;
}

/**
 * Avatar de l'utilisateur connecté, point d'entrée vers tout ce qui le
 * concerne : identité, réglages, abonnement, aide. Ce menu ne porte jamais
 * de pastille de notification (voir userMenuModel.ts). Il est monté tel
 * quel sur desktop (barre latérale) et sur mobile (barre du haut).
 */
const UserMenu = ({ compact = false, className }: UserMenuProps) => {
  const { user, activeRole, logout } = useAuth();
  const { isAdmin } = useAdmin();
  const navigate = useNavigate();

  if (!user) return null;

  const effectiveRole = user.role === "both" ? activeRole : user.role;
  const isOwnerView = effectiveRole === "owner";
  const initial = (user.firstName?.charAt(0) || "?").toUpperCase();
  const displayName = user.firstName || "Mon compte";

  const entries = buildUserMenuEntries({
    profileTo: isOwnerView ? "/owner-profile" : "/profile",
    publicTo: isOwnerView ? `/gardiens/${user.id}?tab=proprio` : `/gardiens/${user.id}`,
    isSitterView: effectiveRole === "sitter",
    isAdmin,
  });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Mon compte et mon profil"
          className={cn(
            "shrink-0 inline-flex items-center justify-center rounded-full transition-colors hover:bg-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 min-h-11 min-w-11",
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
        {entries.map((entry, index) =>
          entry === "separator" ? (
            <DropdownMenuSeparator key={`sep-${index}`} />
          ) : (
            <DropdownMenuItem
              key={entry.key}
              onSelect={() => {
                if (entry.action === "logout") {
                  void Promise.resolve(logout()).catch(() => {});
                } else if (entry.to) {
                  navigate(entry.to);
                }
              }}
              className={cn("gap-2 min-h-11", entry.danger && "text-destructive focus:text-destructive")}
            >
              <entry.icon className="h-4 w-4" aria-hidden="true" />
              {entry.label}
            </DropdownMenuItem>
          ),
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default UserMenu;
