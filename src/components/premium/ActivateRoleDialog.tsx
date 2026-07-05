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
import { isBeforeLaunch, isInGracePeriod, GRACE_END } from "@/lib/constants";

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
      const { error } = await supabase.rpc("change_user_role", {
        p_user_id: user.id,
        p_new_role: "both" as any,
      });
      if (error) throw error;

      onClose();
      toast.success("Votre espace propriétaire est activé !");
      // Reload to refresh auth context
      setTimeout(() => window.location.reload(), 500);
    } catch (e: any) {
      toast.error(e?.message || "Une erreur est survenue. Réessayez.");
    } finally {
      setLoading(false);
    }
  };

  const handleActivateGardien = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Pendant la phase gratuite (PRICING_IS_ACTIVE = false),
      // on active directement le rôle gardien sans passer par Stripe.
      if (isBeforeLaunch() || isInGracePeriod()) {
        const { error } = await supabase.rpc("change_user_role", {
          p_user_id: user.id,
          p_new_role: "both" as any,
        });
        if (error) throw error;
        onClose();
        toast.success("Votre espace gardien est activé !");
        setTimeout(() => (window.location.href = "/dashboard?activated=true"), 400);
        return;
      }

      const { data, error } = await supabase.functions.invoke("create-checkout-session", {
        body: {
          formula_type: "monthly",
          success_url: `${window.location.origin}/dashboard?activated=true`,
          cancel_url: `${window.location.origin}/dashboard?cancelled=true`,
        },
      });
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (e: any) {
      toast.error(e?.message || "Une erreur est survenue. Réessayez.");
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

  const freeNow = isBeforeLaunch() || isInGracePeriod();
  const lastFreeDay = new Date(GRACE_END.getTime() - 24 * 60 * 60 * 1000).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center items-center gap-2">
          <Home className="h-10 w-10 text-primary" />
          <DialogTitle className="text-lg">
            Envie de garder des maisons aussi ?
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground text-center">
            L'espace gardien est <strong>gratuit aujourd'hui, sans engagement</strong>. Vous serez prévenu à l'avance en cas d'évolution tarifaire.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2 pt-2">
          <Button onClick={handleActivateGardien} disabled={loading}>
            {loading ? "Redirection..." : freeNow ? "Activer mon espace gardien →" : "Activer mon abonnement →"}
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
