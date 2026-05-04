import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { UserCog, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import ActivateRoleDialog from "@/components/premium/ActivateRoleDialog";

type DeactivateTarget = "sitter" | "owner" | null;

const ActiveRolesSection = () => {
  const { user, refreshProfile, switchRole, activeRole } = useAuth();
  const navigate = useNavigate();
  const [target, setTarget] = useState<DeactivateTarget>(null);
  const [activateDialog, setActivateDialog] = useState<"gardien" | "proprio" | null>(null);
  const [loading, setLoading] = useState(false);
  const [openingPortal, setOpeningPortal] = useState(false);

  if (!user) return null;

  const role = user.role;
  const sitterActive = role === "sitter" || role === "both";
  const ownerActive = role === "owner" || role === "both";
  const hasBothRoles = role === "both";

  const handleSetDefault = (next: "owner" | "sitter") => {
    if (next === activeRole) return;
    switchRole(next);
    toast.success(
      next === "sitter"
        ? "Espace gardien défini par défaut."
        : "Espace propriétaire défini par défaut.",
    );
  };


  // Tentative de désactivation : ouvre le bon dialog selon l'état
  const handleToggle = (which: "sitter" | "owner") => {
    // S'il faut ACTIVER (rôle actuellement absent)
    if (which === "sitter" && !sitterActive) {
      setActivateDialog("gardien");
      return;
    }
    if (which === "owner" && !ownerActive) {
      setActivateDialog("proprio");
      return;
    }
    // Sinon : désactivation
    setTarget(which);
  };

  const openCustomerPortal = async () => {
    setOpeningPortal(true);
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal", {
        body: {},
      });
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank", "noopener,noreferrer");
      }
    } catch {
      toast.error("Impossible d'ouvrir le portail. Réessayez.");
    } finally {
      setOpeningPortal(false);
    }
  };

  const confirmDeactivate = async () => {
    if (!target || !user) return;
    setLoading(true);
    try {
      const newRole = target === "sitter" ? "owner" : "sitter";
      const { error } = await supabase
        .from("profiles")
        .update({ role: newRole } as any)
        .eq("id", user.id);
      if (error) throw error;

      // Bascule l'activeRole sur le rôle restant pour éviter un état UI incohérent
      switchRole(newRole as "owner" | "sitter");
      await refreshProfile();

      toast.success(
        target === "sitter"
          ? "Votre espace gardien a été désactivé."
          : "Votre espace propriétaire a été désactivé.",
      );
      setTarget(null);
      // Recharge pour rafraîchir contexte + sidebar
      setTimeout(() => window.location.reload(), 400);
    } catch {
      toast.error("Une erreur est survenue. Réessayez.");
    } finally {
      setLoading(false);
    }
  };

  const isLastRole = role !== "both";

  return (
    <>
      <section className="my-8">
        <div className="flex items-center gap-2 mb-4">
          <UserCog className="h-5 w-5 text-primary" />
          <h2 className="font-heading text-lg font-semibold">Mes espaces actifs</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Activez ou désactivez vos espaces. Vous gardez votre compte et votre historique.
        </p>

        <div className="space-y-4 rounded-lg border border-border p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Espace propriétaire</Label>
              <p className="text-xs text-muted-foreground">
                Publier des annonces et trouver un gardien. Gratuit.
              </p>
            </div>
            <Switch
              checked={ownerActive}
              onCheckedChange={() => handleToggle("owner")}
              aria-label="Activer ou désactiver l'espace propriétaire"
            />
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Espace gardien</Label>
              <p className="text-xs text-muted-foreground">
                Postuler aux annonces et garder des animaux. Abonnement requis.
              </p>
            </div>
            <Switch
              checked={sitterActive}
              onCheckedChange={() => handleToggle("sitter")}
              aria-label="Activer ou désactiver l'espace gardien"
            />
          </div>
        </div>
      </section>

      {/* Dialog activation (réutilise le dialog existant) */}
      {activateDialog && (
        <ActivateRoleDialog
          open={!!activateDialog}
          onClose={() => setActivateDialog(null)}
          targetRole={activateDialog}
        />
      )}

      {/* Dialog désactivation */}
      <Dialog open={!!target} onOpenChange={(v) => !v && setTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {target === "sitter"
                ? "Désactiver l'espace gardien ?"
                : "Désactiver l'espace propriétaire ?"}
            </DialogTitle>
            <DialogDescription className="text-sm leading-relaxed">
              {isLastRole ? (
                <>
                  Il s'agit de votre seul espace actif. Pour le désactiver, vous devez d'abord
                  activer l'autre espace, ou supprimer votre compte.
                </>
              ) : target === "sitter" ? (
                <>
                  Votre profil de gardien sera masqué et vous ne pourrez plus postuler aux
                  annonces. Votre historique et vos avis sont conservés.
                  <br />
                  <br />
                  <strong>Important :</strong> votre abonnement Stripe reste actif. Pour ne plus
                  être facturé, annulez-le depuis le portail de gestion.
                </>
              ) : (
                <>
                  Vos annonces actives seront masquées et vous ne pourrez plus en publier de
                  nouvelles. Votre historique est conservé.
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="flex-col sm:flex-col gap-2">
            {isLastRole ? (
              <>
                <Button
                  className="w-full"
                  onClick={() => {
                    setTarget(null);
                    setActivateDialog(target === "sitter" ? "proprio" : "gardien");
                  }}
                >
                  Activer l'autre espace
                </Button>
                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={() => {
                    setTarget(null);
                    // remonte vers la section suppression
                    document
                      .querySelector('[data-section="delete-account"]')
                      ?.scrollIntoView({ behavior: "smooth", block: "center" });
                  }}
                >
                  Supprimer mon compte
                </Button>
              </>
            ) : (
              <>
                {target === "sitter" && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={openCustomerPortal}
                    disabled={openingPortal}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    {openingPortal ? "Ouverture..." : "Gérer mon abonnement Stripe"}
                  </Button>
                )}
                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={confirmDeactivate}
                  disabled={loading}
                >
                  {loading ? "Désactivation..." : "Confirmer la désactivation"}
                </Button>
                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={() => setTarget(null)}
                  disabled={loading}
                >
                  Annuler
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ActiveRolesSection;
