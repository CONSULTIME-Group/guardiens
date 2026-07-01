import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Crown } from "lucide-react";
import { isBeforeLaunch, isInGracePeriod } from "@/lib/constants";
import { trackCtaClick } from "@/lib/analytics";

interface PremiumGateDialogProps {
  open: boolean;
  onClose: () => void;
  featureName: string;
}

const PremiumGateDialog = ({ open, onClose, featureName }: PremiumGateDialogProps) => {
  const navigate = useNavigate();
  const freeNow = isBeforeLaunch() || isInGracePeriod();

  const description = freeNow
    ? `Activez votre espace gardien pour accéder à ${featureName}. À 0 € pour tous en ce moment, jusqu'au 30 septembre 2026 inclus.`
    : `Abonnez-vous pour accéder à ${featureName}. 6,99 €/mois, sans engagement, résiliable en un clic.`;

  const ctaLabel = freeNow
    ? "Activer mon espace gardien, à 0 €"
    : "Activer mon espace gardien, 6,99 €/mois";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center items-center gap-2">
          <Crown className="h-10 w-10 text-amber-500" />
          <DialogTitle className="text-lg">Fonctionnalité réservée à l'espace gardien</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground text-center">
            {description}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2 pt-2">
          <Button
            onClick={() => {
              trackCtaClick("premium_gate_activate", "premium_gate_dialog", {
                feature: featureName,
                free_now: freeNow,
              });
              onClose();
              navigate("/mon-abonnement");
            }}
          >
            {ctaLabel}
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Pas maintenant
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PremiumGateDialog;
