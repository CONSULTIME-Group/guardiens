import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ChangeRoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string | null;
  userName: string;
  currentRole: "owner" | "sitter" | "both" | null;
  onSuccess?: () => void;
}

const ChangeRoleDialog = ({
  open,
  onOpenChange,
  userId,
  userName,
  currentRole,
  onSuccess,
}: ChangeRoleDialogProps) => {
  const [newRole, setNewRole] = useState<"owner" | "sitter" | "both">(
    currentRole || "owner",
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (currentRole) setNewRole(currentRole);
  }, [currentRole, open]);

  const handleSave = async () => {
    if (!userId) return;
    if (newRole === currentRole) {
      onOpenChange(false);
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.rpc("change_user_role", {
        p_user_id: userId,
        p_new_role: newRole as any,
      });
      if (error) throw error;
      toast.success(`Rôle de ${userName} mis à jour : ${newRole}`);
      onSuccess?.();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message || "Erreur lors du changement de rôle");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Changer le rôle</DialogTitle>
          <DialogDescription>
            {userName}, rôle actuel : <strong>{currentRole || ","}</strong>
          </DialogDescription>
        </DialogHeader>
        <div className="py-2 space-y-2">
          <Label htmlFor="role">Nouveau rôle</Label>
          <Select value={newRole} onValueChange={(v) => setNewRole(v as any)}>
            <SelectTrigger id="role">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="owner">Propriétaire</SelectItem>
              <SelectItem value="sitter">Gardien</SelectItem>
              <SelectItem value="both">Les deux</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Les sous-profils manquants (gardien / propriétaire) seront créés automatiquement.
          </p>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={loading}>
            Annuler
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? "Mise à jour..." : "Enregistrer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ChangeRoleDialog;
