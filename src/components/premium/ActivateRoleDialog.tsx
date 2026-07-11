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
import { isBeforeLaunch, isInGracePeriod } from "@/lib/constants";
import {
  startConversation,
  buildFirstMessageDraft,
  type ConversationContext,
} from "@/lib/conversation";

export interface ContactIntentContext {
  recipientId: string;
  recipientFirstName?: string | null;
  conversationContext: ConversationContext;
  sitId?: string | null;
  smallMissionId?: string | null;
  initialDraft?: string;
  city?: string | null;
}

interface ActivateRoleDialogProps {
  open: boolean;
  onClose: () => void;
  targetRole: "gardien" | "proprio";
  /**
   * Si fourni + targetRole === "proprio", le dialog devient contextualisé :
   * après activation, on ouvre la conversation ciblée avec un brouillon pré-rempli.
   */
  contactContext?: ContactIntentContext;
}

const ActivateRoleDialog = ({
  open,
  onClose,
  targetRole,
  contactContext,
}: ActivateRoleDialogProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const recipient = contactContext?.recipientFirstName?.trim() || "cette personne";
  const hasContactIntent = Boolean(contactContext) && targetRole === "proprio";

  const openContactConversation = async () => {
    if (!contactContext) return false;
    const { conversationId, error } = await startConversation({
      otherUserId: contactContext.recipientId,
      context: contactContext.conversationContext,
      sitId: contactContext.sitId ?? null,
      smallMissionId: contactContext.smallMissionId ?? null,
    });
    if (!conversationId) {
      toast.error(error || "Impossible d'ouvrir la conversation. Réessayez.");
      return false;
    }
    const draft =
      contactContext.initialDraft?.trim() ||
      buildFirstMessageDraft({
        context: contactContext.conversationContext,
        recipientFirstName: contactContext.recipientFirstName,
        city: contactContext.city,
      });
    const url = `/messages?c=${conversationId}&draft=${encodeURIComponent(draft)}`;
    // Full reload pour que le contexte auth reflète immédiatement le rôle "both"
    window.location.href = url;
    return true;
  };

  const handleActivateProprio = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const alreadyBoth = user.role === "both";
      if (!alreadyBoth) {
        const { error } = await supabase.rpc("change_user_role", {
          p_user_id: user.id,
          p_new_role: "both" as any,
        });
        if (error) throw error;
      }

      if (hasContactIntent) {
        toast.success(`Votre espace propriétaire est activé. Voici votre brouillon pour ${recipient}.`);
        const ok = await openContactConversation();
        if (!ok) {
          // fallback : recharger pour appliquer le rôle
          setTimeout(() => window.location.reload(), 400);
        }
        return;
      }

      onClose();
      toast.success("Votre espace propriétaire est activé !");
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
    const title = hasContactIntent
      ? `Activez votre profil propriétaire pour écrire à ${recipient}`
      : "Vous avez aussi des animaux à faire garder ?";
    const description = hasContactIntent
      ? "Guardiens sépare les espaces gardien et propriétaire. Pour envoyer un message côté propriétaire, activez votre profil propriétaire en un clic."
      : "L'espace propriétaire est gratuit. Activez-le en un clic pour publier des annonces et trouver un gardien près de chez vous.";
    const primaryLabel = hasContactIntent
      ? loading
        ? "Activation..."
        : `Activer et écrire à ${recipient}`
      : loading
        ? "Activation..."
        : "Activer mon espace propriétaire";

    return (
      <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="text-center items-center gap-2">
            <PawPrint className="h-10 w-10 text-primary" />
            <DialogTitle className="text-lg">{title}</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground text-center">
              {description}
            </DialogDescription>
          </DialogHeader>
          {hasContactIntent && (
            <p className="text-sm text-muted-foreground text-center px-2">
              Après activation, vous arrivez directement sur la conversation avec {recipient}, votre message est déjà préparé.
            </p>
          )}
          <div className="flex flex-col gap-2 pt-2">
            <Button onClick={handleActivateProprio} disabled={loading}>
              {primaryLabel}
            </Button>
            <Button variant="ghost" onClick={onClose} disabled={loading}>
              {hasContactIntent ? "Plus tard" : "Pas maintenant"}
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
            L'espace gardien est <strong>gratuit aujourd'hui, sans engagement</strong>. Vous serez prévenu à l'avance en cas d'évolution tarifaire.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2 pt-2">
          <Button onClick={handleActivateGardien} disabled={loading}>
            {loading ? "Redirection..." : "Activer mon espace gardien"}
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
