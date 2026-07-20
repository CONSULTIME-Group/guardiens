import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { ProfileRole } from "@/lib/profileCompletion";

/**
 * Écran pédagogique remplaçant les erreurs brutes serveur au moment de publier
 * une mission ou d'y répondre.
 *
 * Depuis la vague 31, l'entraide est ouverte à tous les membres actifs sans
 * condition de complétion de profil. Seul le motif « compte non actif » subsiste
 * et relève de la modération : on invite alors le membre à contacter le support.
 */
export type MissionEligibilityReason = "account_not_active";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  reason: MissionEligibilityReason | null;
  userId: string | null;
  role: ProfileRole;
  context: "publish" | "respond";
}

const MissionEligibilityDialog = ({ open, onOpenChange, reason }: Props) => {
  const navigate = useNavigate();

  if (!reason) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Votre compte n'est pas actif</DialogTitle>
          <DialogDescription>
            Contactez le support pour rétablir l'accès à l'entraide.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Plus tard
          </Button>
          <Button onClick={() => navigate("/contact")}>Contacter le support</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MissionEligibilityDialog;
