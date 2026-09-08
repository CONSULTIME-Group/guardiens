import { useState } from "react";
import { Flag } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

type ReasonOption = { value: string; label: string };

const reasonOptions: Record<string, { label: string; reasons: ReasonOption[] }> = {
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
  small_mission: {
    label: "cette petite mission",
    reasons: [
      { value: "misleading", label: "Annonce trompeuse" },
      { value: "scam", label: "Arnaque suspectée" },
      { value: "inappropriate", label: "Contenu inapproprié" },
      { value: "other", label: "Autre" },
    ],
  },
};

/** Fenêtre pendant laquelle un même membre ne signale qu'une fois la même cible. */
const DUPLICATE_WINDOW_HOURS = 24;

interface ReportButtonProps {
  targetId: string;
  targetType: "profile" | "sit" | "review" | "small_mission";
  className?: string;
  /**
   * Variante fiche publique : déclencheur en lien discret pleine largeur,
   * motifs en boutons radio, détails obligatoires pour « Autre »,
   * protection 24 h contre les doublons, et visiteur déconnecté envoyé vers
   * la connexion puis ramené sur la page courante.
   */
  variant?: "inline" | "profile-link";
  /** Prénom de la personne, pour le titre de la modale (variante profile-link). */
  targetFirstName?: string;
  /** Motifs spécifiques à cette surface ; les valeurs restent celles de la table reports. */
  reasons?: ReasonOption[];
}

const ReportButton = ({
  targetId,
  targetType,
  className,
  variant = "inline",
  targetFirstName,
  reasons,
}: ReportButtonProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const config = reasonOptions[targetType];
  const reasonList = reasons ?? config.reasons;
  const isProfileLink = variant === "profile-link";
  const detailsRequired = isProfileLink && reason === "other";
  const canSubmit = !!reason && !submitting && (!detailsRequired || details.trim().length > 0);

  /** Le brouillon survit à une fermeture : la remise à zéro suit un envoi abouti. */
  const closeKeepingDraft = () => setOpen(false);

  const resetAndClose = () => {
    setOpen(false);
    setReason("");
    setDetails("");
  };

  const handleSubmit = async () => {
    if (!user || !reason) return;
    setSubmitting(true);

    if (isProfileLink) {
      // Un signalement par membre, par cible et par tranche de 24 h.
      const since = new Date(Date.now() - DUPLICATE_WINDOW_HOURS * 3600 * 1000).toISOString();
      const { data: recent } = await supabase
        .from("reports")
        .select("id")
        .eq("reporter_id", user.id)
        .eq("target_type", targetType)
        .eq("target_id", targetId)
        .gte("created_at", since)
        .limit(1);
      if (recent && recent.length > 0) {
        setSubmitting(false);
        toast.info("Votre signalement des dernières 24 heures est déjà entre les mains de l'équipe.");
        resetAndClose();
        return;
      }
    }

    const { error } = await supabase.from("reports").insert({
      reporter_id: user.id,
      target_id: targetId,
      target_type: targetType,
      report_type: targetType,
      reason,
      details: details.trim().slice(0, 300),
    });
    setSubmitting(false);
    if (error) {
      toast.error("Erreur lors de l'envoi du signalement.");
    } else {
      toast.success("Signalement envoyé. Merci pour votre vigilance.");
      resetAndClose();
    }
  };

  const openOrLogin = () => {
    if (user) {
      setOpen(true);
      return;
    }
    const redirect = `${location.pathname}${location.search}`;
    navigate(`/login?redirect=${encodeURIComponent(redirect)}`);
  };

  if (!user && !isProfileLink) return null;

  const dialogTitle = isProfileLink && targetFirstName
    ? `Signaler le profil de ${targetFirstName}`
    : `Signaler ${config.label}`;
  const dialogDescription = isProfileLink
    ? "Votre signalement est lu par l'équipe Guardiens, en toute confidentialité. Il reste strictement entre vous et nous."
    : "Aidez-nous à garder la communauté sûre. Votre signalement est confidentiel.";

  return (
    <>
      {isProfileLink ? (
        <button
          type="button"
          onClick={openOrLogin}
          className={`inline-flex items-center gap-2 min-h-[44px] w-full px-1 text-[13px] text-slate-500 underline underline-offset-4 hover:text-slate-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md ${className || ""}`}
        >
          <Flag className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          Signaler ce profil
        </button>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className={`inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors ${className || ""}`}
          title={`Signaler ${config.label}`}
        >
          <Flag className="h-3 w-3" />
          <span className="hidden sm:inline">Signaler</span>
        </button>
      )}

      <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : resetAndClose())}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
            <DialogDescription>{dialogDescription}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <p className="text-sm font-medium mb-1.5">Motif</p>
              {isProfileLink ? (
                <RadioGroup value={reason} onValueChange={setReason} className="gap-2.5">
                  {reasonList.map((r) => (
                    <div key={r.value} className="flex items-start gap-2.5">
                      <RadioGroupItem value={r.value} id={`report-reason-${r.value}`} className="mt-0.5" />
                      <Label htmlFor={`report-reason-${r.value}`} className="text-sm font-normal leading-snug cursor-pointer">
                        {r.label}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              ) : (
                <Select value={reason} onValueChange={setReason}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir un motif..." />
                  </SelectTrigger>
                  <SelectContent>
                    {reasonList.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="rounded-lg border border-border bg-accent/40 p-3">
              <label htmlFor="report-details" className="text-sm font-medium mb-1.5 block">
                {isProfileLink
                  ? detailsRequired ? "Précisions (obligatoires pour ce motif)" : "Précisions"
                  : "Expliquez ce qui se passe (recommandé)"}
              </label>
              <Textarea
                id="report-details"
                placeholder={isProfileLink
                  ? "Décrivez ce que vous avez constaté, en quelques lignes."
                  : "Décrivez ce qui vous a semblé suspect ou inapproprié"}
                value={details}
                onChange={(e) => setDetails(e.target.value.slice(0, 300))}
                maxLength={300}
                rows={4}
                required={detailsRequired}
              />
              <p className="text-xs text-muted-foreground text-right mt-1" aria-live="polite">
                {details.length}/300
              </p>
            </div>
          </div>

          <DialogFooter className={isProfileLink ? "sm:justify-between sm:items-center" : undefined}>
            {isProfileLink ? (
              <>
                <button
                  type="button"
                  onClick={resetAndClose}
                  className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground min-h-[44px] px-2"
                >
                  Annuler
                </button>
                <Button onClick={handleSubmit} disabled={!canSubmit} className="rounded-full px-5">
                  {submitting ? "Envoi..." : "Envoyer le signalement"}
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={resetAndClose}>
                  Annuler
                </Button>
                <Button onClick={handleSubmit} disabled={!canSubmit}>
                  {submitting ? "Envoi..." : "Envoyer le signalement"}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ReportButton;
