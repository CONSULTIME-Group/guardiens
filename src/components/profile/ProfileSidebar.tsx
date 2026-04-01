import { CheckCircle2, Circle, Camera, Eye } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import BadgeShield from "@/components/badges/BadgeShield";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export interface SidebarSection {
  id: string;
  num: number;
  label: string;
  subtitle: string;
  missingCount: number;
  complete: boolean;
  missingHint?: string;
}

interface ProfileSidebarProps {
  avatarUrl?: string;
  firstName?: string;
  city?: string;
  completion: number;
  sections: SidebarSection[];
  activeSection: string;
  onSectionClick: (id: string) => void;
  onAvatarChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  publicProfileUrl: string;
  role: "sitter" | "owner";
  identityVerified?: boolean;
  isFounder?: boolean;
}

const ProfileSidebar = ({
  avatarUrl, firstName, city, completion, sections,
  activeSection, onSectionClick, onAvatarChange, publicProfileUrl, role,
  identityVerified, isFounder,
}: ProfileSidebarProps) => {
  return (
    <div className="space-y-5">
      {/* BLOC 1 — Photo + identité */}
      <div className="flex flex-col items-center gap-3">
        <div className="relative group">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="w-24 h-24 rounded-full object-cover border-2 border-border" />
          ) : (
            <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center text-primary text-3xl font-medium border-2 border-border">
              {firstName?.charAt(0) || "?"}
            </div>
          )}
          <label className="absolute inset-0 rounded-full bg-black/40 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white text-xs gap-0.5">
            <Camera className="h-4 w-4" />
            <span>Modifier</span>
            <input type="file" accept="image/*" className="hidden" onChange={onAvatarChange} />
          </label>
        </div>
        <div className="text-center">
          <p className="text-base font-semibold text-foreground capitalize">{firstName || "Votre profil"}</p>
          {city && <p className="text-sm text-muted-foreground">{city}</p>}
        </div>
      </div>

      {/* BLOC 2 — Badges statut */}
      {(identityVerified || isFounder) && (
        <div className="flex flex-wrap gap-2 justify-center">
          <TooltipProvider>
            {identityVerified && (
              <Tooltip>
                <TooltipTrigger>
                  <BadgeShield badgeKey="id_verified" count={1} size="sm" showLabel={false} />
                </TooltipTrigger>
                <TooltipContent>ID vérifiée</TooltipContent>
              </Tooltip>
            )}
            {isFounder && (
              <Tooltip>
                <TooltipTrigger>
                  <BadgeShield badgeKey="founder" count={1} size="sm" showLabel={false} />
                </TooltipTrigger>
                <TooltipContent>Membre fondateur</TooltipContent>
              </Tooltip>
            )}
          </TooltipProvider>
        </div>
      )}

      {/* BLOC 3 — Complétion unifiée */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Complétion du profil</p>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${completion}%` }} />
        </div>
        <p className="text-sm font-semibold text-foreground">{completion}% complété</p>
        {completion >= 60 ? (
          <span className="inline-block text-xs text-primary bg-primary/10 rounded-full px-2 py-0.5">
            ✓ Profil visible par les {role === "sitter" ? "proprios" : "gardiens"}
          </span>
        ) : (
          <span className="inline-block text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 rounded-full px-2 py-0.5">
            ⚠ Profil non visible — 60% requis
          </span>
        )}
      </div>

      {/* BLOC 4 — Navigation sections */}
      <nav className="flex lg:flex-col gap-1.5 overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0 -mx-1 px-1">
        {sections.map((s) => {
          const isActive = activeSection === s.id;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onSectionClick(s.id)}
              className={cn(
                "flex items-center gap-3 text-left rounded-xl px-3 py-2 transition-colors whitespace-nowrap lg:whitespace-normal lg:w-full shrink-0 cursor-pointer",
                isActive && "bg-primary/10 border-l-2 border-primary pl-2",
                !isActive && "hover:bg-muted transition-colors"
              )}
            >
              {s.complete ? (
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
              ) : (
                <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
              )}
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{s.label}</p>
                <p className={cn("text-xs hidden lg:block", s.complete ? "text-primary" : "text-amber-600 dark:text-amber-400")}>
                  {s.complete ? "Complété ✓" : s.missingHint || s.subtitle}
                </p>
              </div>
            </button>
          );
        })}
      </nav>

      {/* BLOC 5 — Lien profil public */}
      <Link
        to={publicProfileUrl}
        target="_blank"
        className="flex items-center justify-center gap-1 border border-border rounded-full px-3 py-1.5 text-xs text-foreground hover:border-primary transition-colors w-full mt-4"
      >
        <Eye className="h-3 w-3" /> Voir mon profil public →
      </Link>
    </div>
  );
};

export default ProfileSidebar;
