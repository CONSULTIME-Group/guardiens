/**
 * Lot L4 : double rôle sur l'accueil téléphone. Deux choix, l'espace actif
 * coché ; le choix est gardé (guardiens_active_role) et sert de « dernier
 * choix » au récit suivant (pickFirstStory).
 */
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

const OPTIONS = [
  { role: "owner" as const, label: "Je fais garder" },
  { role: "sitter" as const, label: "Je garde" },
];

export function RoleSwitchView({ active, onPick }: { active: "owner" | "sitter"; onPick: (r: "owner" | "sitter") => void }) {
  return (
    <div
      role="group"
      aria-label="Mon espace"
      data-testid="story-role-switch"
      className="grid grid-cols-2 gap-[4px] rounded-full border border-border bg-card p-[4px]"
    >
      {OPTIONS.map((o) => {
        const on = active === o.role;
        return (
          <button
            key={o.role}
            type="button"
            aria-pressed={on}
            onClick={() => { if (!on) onPick(o.role); }}
            className={cn(
              "min-h-[40px] rounded-full px-[12px] text-[14px] font-semibold transition-colors",
              on ? "bg-foreground text-background" : "text-foreground/80 hover:text-foreground",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export default function RoleSwitch() {
  const { user, activeRole, switchRole } = useAuth();
  if (user?.role !== "both") return null;
  return <RoleSwitchView active={activeRole === "sitter" ? "sitter" : "owner"} onPick={(r) => switchRole(r, "accueil")} />;
}
