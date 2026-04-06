import { useState } from "react";
import { X } from "lucide-react";
import ActivateRoleDialog from "@/components/premium/ActivateRoleDialog";

interface RoleActivationBannerProps {
  userRole: string;
}

const STORAGE_KEY = "role_banner_dismissed";

const RoleActivationBanner = ({ userRole }: RoleActivationBannerProps) => {
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(STORAGE_KEY) === "1");
  const [dialogOpen, setDialogOpen] = useState(false);

  if (dismissed || userRole === "both") return null;

  const targetRole = userRole === "sitter" ? "proprio" : "gardien";
  const text =
    userRole === "sitter"
      ? "Vous avez aussi des animaux à faire garder ? Activez votre espace propriétaire — c'est gratuit →"
      : "Envie de garder des maisons ? Essayez gratuitement pendant 30 jours →";

  return (
    <>
      <ActivateRoleDialog open={dialogOpen} onClose={() => setDialogOpen(false)} targetRole={targetRole} />
      <div className="bg-primary/5 border border-primary/20 rounded-lg px-4 py-3 text-sm text-foreground/80 flex items-center justify-between gap-4">
        <button
          onClick={() => setDialogOpen(true)}
          className="text-left hover:text-foreground transition-colors"
        >
          {text}
        </button>
        <button
          onClick={() => {
            localStorage.setItem(STORAGE_KEY, "1");
            setDismissed(true);
          }}
          className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Fermer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </>
  );
};

export default RoleActivationBanner;
