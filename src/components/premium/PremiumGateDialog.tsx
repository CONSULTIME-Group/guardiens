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
import { trackCtaClick } from "@/lib/analytics";

interface PremiumGateDialogProps {
  open: boolean;
  onClose: () => void;
  featureName: string;
}

const PremiumGateDialog = ({ open, onClose, featureName }: PremiumGateDialogProps) => {
  const navigate = useNavigate();

  const description = `Activez votre espace gardien pour accéder à ${featureName}. C'est gratuit aujourd'hui, sans engagement.`;
  const ctaLabel = "Activer mon espace gardien";

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
