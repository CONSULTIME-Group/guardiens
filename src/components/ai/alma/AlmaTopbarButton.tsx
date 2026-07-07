/**
 * <AlmaTopbarButton /> — point d'accès persistant à Alma dans la topbar.
 *
 * Alma est ainsi toujours joignable : au tap, elle tire un conseil pour la
 * surface courante (bypass quota + cooldowns, respect dedup 24h serveur).
 *
 * Zone de tap : 44×44 (WCAG). Avatar visuel plus petit à l'intérieur.
 * Aucun badge dynamique : la cible produit est la présence, pas la notif.
 */
import { useLocation } from "react-router-dom";
import { useAlma } from "@/contexts/AlmaContext";
import { useAuth } from "@/contexts/AuthContext";
import { AlmaAvatar } from "@/components/ai/alma/AlmaAvatar";
import { trackEvent } from "@/lib/analytics";
import { cn } from "@/lib/utils";

function surfaceFromPath(pathname: string): string {
  if (pathname.startsWith("/dashboard")) return "owner_dashboard";
  if (pathname === "/sits" || pathname === "/sits/") return "sits_list";
  if (pathname.startsWith("/sits/")) return "sit_detail";
  if (pathname === "/favoris") return "favorites";
  if (pathname.startsWith("/recherche-gardiens")) return "search_page";
  if (pathname.startsWith("/gardiens/")) return "sitter_profile";
  if (pathname.startsWith("/petites-missions")) return "mutual_aid";
  return "listings";
}

interface AlmaTopbarButtonProps {
  className?: string;
}

export default function AlmaTopbarButton({ className }: AlmaTopbarButtonProps) {
  const { user, activeRole } = useAuth();
  const { requestNextTip, frequency } = useAlma();
  const location = useLocation();

  // Muet uniquement si l'utilisateur a explicitement demandé "silent" ET
  // qu'il n'y a pas de session : sinon le bouton reste, c'est un accès à la
  // demande.
  if (!user?.id) return null;
  if (frequency === "silent") return null;

  const surface = surfaceFromPath(location.pathname);
  const role: "owner" | "sitter" = activeRole === "owner" ? "owner" : "sitter";

  return (
    <button
      type="button"
      aria-label="Demander un conseil à Alma"
      onClick={() => {
        try {
          void trackEvent("alma_topbar_button_clicked", {
            metadata: { surface, role },
          });
        } catch { /* silent */ }
        void requestNextTip({
          surface,
          role,
          state: "any",
          preferNudge: false,
        });
      }}
      className={cn(
        "inline-flex h-11 w-11 items-center justify-center rounded-full",
        "hover:bg-muted transition",
        className,
      )}
    >
      <span className="inline-flex items-center justify-center rounded-full ring-2 ring-primary/30">
        <AlmaAvatar size={32} breathe mood={frequency === "low" ? "sleepy" : "idle"} />
      </span>
    </button>
  );
}
