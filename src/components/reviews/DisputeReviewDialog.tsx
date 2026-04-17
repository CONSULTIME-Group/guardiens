import { useState } from "react";
import { Loader2, AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface DisputeReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reviewId: string;
  onSubmitted?: () => void;
}

const CATEGORIES = [
  { value: "faux", label: "Avis manifestement faux" },
  { value: "diffamation", label: "Propos diffamatoires ou injurieux" },
  { value: "inapproprie", label: "Contenu inapproprié" },
  { value: "erreur_identite", label: "Erreur d'identité (ce n'est pas moi)" },
  { value: "autre", label: "Autre motif" },
];

const MIN_LENGTH = 30;
const MAX_LENGTH = 1000;

const DisputeReviewDialog = ({ open, onOpenChange, reviewId, onSubmitted }: DisputeReviewDialogProps) => {
  const [category, setCategory] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!category || reason.trim().length < MIN_LENGTH) return;
    setSubmitting(true);
    const { error } = await supabase.rpc("create_review_dispute", {
      p_review_id: reviewId,
      p_category: category,
      p_reason: reason.trim(),
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message || "Une erreur est survenue.");
      return;
    }
    toast.success("Contestation envoyée. Un administrateur l'examinera sous 7 jours.");
    setCategory("");
    setReason("");
    onOpenChange(false);
    onSubmitted?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            Contester cet avis
          </DialogTitle>
          <DialogDescription>
            Votre demande sera examinée par un administrateur. Si elle est acceptée, l'avis sera retiré.
            Délai : 30 jours après publication.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Motif</label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Choisir un motif…" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">
              Explication détaillée <span className="text-muted-foreground font-normal">({MIN_LENGTH} caractères min.)</span>
            </label>
            <div className="relative">
              <Textarea
                placeholder="Expliquez précisément pourquoi cet avis devrait être retiré (faits, contexte, preuves disponibles)…"
                value={reason}
                onChange={(e) => setReason(e.target.value.slice(0, MAX_LENGTH))}
                rows={5}
                className="resize-none"
              />
              <span className={`absolute bottom-2 right-3 text-xs ${reason.length < MIN_LENGTH ? "text-destructive" : "text-muted-foreground"}`}>
                {reason.length}/{MAX_LENGTH}
              </span>
            </div>
          </div>

          <p className="text-xs text-muted-foreground bg-muted/50 rounded-md p-3">
            ℹ️ Une contestation abusive ou répétée peut entraîner des sanctions sur votre compte.
          </p>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
            Annuler
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!category || reason.trim().length < MIN_LENGTH || submitting}
          >
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Envoyer la contestation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DisputeReviewDialog;
