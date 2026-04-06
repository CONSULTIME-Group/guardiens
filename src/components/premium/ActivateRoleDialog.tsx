import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PawPrint, Home } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface ActivateRoleDialogProps {
  open: boolean;
  onClose: () => void;
  targetRole: "gardien" | "proprio";
}

const ActivateRoleDialog = ({ open, onClose, targetRole }: ActivateRoleDialogProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleActivateProprio = async () => {
    if (!user) return;
    setLoading(true);
    try {
      await supabase
        .from("owner_profiles")
        .upsert({ user_id: user.id } as any, { onConflict: "user_id" });

      await supabase
        .from("profiles")
        .update({ role: "both" } as any)
        .eq("id", user.id);

      onClose();
      toast.success("Votre espace propriétaire est activé !");
      // Reload to refresh auth context
      setTimeout(() => window.location.reload(), 500);
    } catch {
      toast.error("Une erreur est survenue. Réessayez.");
    } finally {
      setLoading(false);
    }
  };

  const handleActivateGardien = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout-session", {
        body: {
          success_url: `${window.location.origin}/dashboard?activated=true`,
          cancel_url: `${window.location.origin}/dashboard?cancelled=true`,
        },
      });
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch {
      toast.error("Une erreur est survenue. Réessayez.");
      setLoading(false);
    }
  };

  if (targetRole === "proprio") {
    return (
      <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="text-center items-center gap-2">
            <PawPrint className="h-10 w-10 text-primary" />
            <DialogTitle className="text-lg">
              Vous avez aussi des animaux à faire garder ?
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground text-center">
              L'espace propriétaire est gratuit. Activez-le en un clic pour publier des annonces et trouver un gardien près de chez vous.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 pt-2">
            <Button onClick={handleActivateProprio} disabled={loading}>
              {loading ? "Activation..." : "Activer mon espace propriétaire"}
            </Button>
            <Button variant="ghost" onClick={onClose} disabled={loading}>
              Pas maintenant
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center items-center gap-2">
          <Home className="h-10 w-10 text-primary" />
          <DialogTitle className="text-lg">
            Envie de garder des maisons aussi ?
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground text-center">
            L'abonnement gardien est à 9&nbsp;€/mois. Vous avez 30 jours gratuits pour tester — sans engagement. Vous pouvez vous désabonner à tout moment depuis vos paramètres.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2 pt-2">
          <Button onClick={handleActivateGardien} disabled={loading}>
            {loading ? "Redirection..." : "Essayer gratuitement 30 jours →"}
          </Button>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Pas maintenant
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ActivateRoleDialog;
