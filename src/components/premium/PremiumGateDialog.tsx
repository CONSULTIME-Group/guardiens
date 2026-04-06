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

interface PremiumGateDialogProps {
  open: boolean;
  onClose: () => void;
  featureName: string;
}

const PremiumGateDialog = ({ open, onClose, featureName }: PremiumGateDialogProps) => {
  const navigate = useNavigate();

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center items-center gap-2">
          <Crown className="h-10 w-10 text-amber-500" />
          <DialogTitle className="text-lg">Fonctionnalité réservée aux abonnés</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground text-center">
            Abonnez-vous pour accéder à {featureName}.
            <br />
            30 jours gratuits, sans engagement. 9&nbsp;€/mois ensuite.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2 pt-2">
          <Button
            onClick={() => {
              onClose();
              navigate("/mon-abonnement");
            }}
          >
            Essayer gratuitement →
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
