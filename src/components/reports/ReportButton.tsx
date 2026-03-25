import { useState } from "react";
import { Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const reasonOptions: Record<string, { label: string; reasons: { value: string; label: string }[] }> = {
  profile: {
    label: "ce profil",
    reasons: [
      { value: "fake", label: "Faux profil" },
      { value: "inappropriate", label: "Contenu inapproprié" },
      { value: "harassment", label: "Harcèlement" },
      { value: "other", label: "Autre" },
    ],
  },
  sit: {
    label: "cette annonce",
    reasons: [
      { value: "misleading", label: "Annonce trompeuse" },
      { value: "scam", label: "Arnaque suspectée" },
      { value: "inappropriate", label: "Contenu inapproprié" },
      { value: "other", label: "Autre" },
    ],
  },
  review: {
    label: "cet avis",
    reasons: [
      { value: "fake", label: "Avis frauduleux" },
      { value: "inappropriate", label: "Contenu inapproprié" },
      { value: "defamation", label: "Diffamation" },
      { value: "other", label: "Autre" },
    ],
  },
};

interface ReportButtonProps {
  targetId: string;
  targetType: "profile" | "sit" | "review";
  className?: string;
}

const ReportButton = ({ targetId, targetType, className }: ReportButtonProps) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const config = reasonOptions[targetType];

  const handleSubmit = async () => {
    if (!user || !reason) return;
    setSubmitting(true);
    const { error } = await supabase.from("reports").insert({
      reporter_id: user.id,
      target_id: targetId,
      target_type: targetType,
      report_type: targetType,
      reason,
      details: details.trim().slice(0, 1000),
    });
    setSubmitting(false);
    if (error) {
      toast.error("Erreur lors de l'envoi du signalement.");
    } else {
      toast.success("Signalement envoyé. Merci pour votre vigilance.");
      setOpen(false);
      setReason("");
      setDetails("");
    }
  };

  if (!user) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors ${className || ""}`}
        title={`Signaler ${config.label}`}
      >
        <Flag className="h-3 w-3" />
        <span className="hidden sm:inline">Signaler</span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Signaler {config.label}</DialogTitle>
            <DialogDescription>
              Aidez-nous à garder la communauté sûre. Votre signalement est confidentiel.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Motif</label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir un motif..." />
                </SelectTrigger>
                <SelectContent>
                  {config.reasons.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Détails (optionnel)</label>
              <Textarea
                placeholder="Décrivez la situation..."
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                maxLength={1000}
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleSubmit} disabled={!reason || submitting}>
              {submitting ? "Envoi..." : "Envoyer le signalement"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ReportButton;
