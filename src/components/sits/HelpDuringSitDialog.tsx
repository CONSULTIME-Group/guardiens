/**
 * Bouton + dialog « Besoin d'aide » affiché sur le bandeau « garde en cours »
 * côté propriétaire et côté gardien.
 *
 * Trois catégories :
 *   - animal   : question sur l'animal
 *   - logement : question sur le logement
 *   - urgence  : message urgent (préfixé [URGENCE]) + email transactionnel
 *                immédiat via `help-during-sit`.
 *
 * L'implémentation ne crée aucune infra dédiée : elle réutilise la
 * conversation existante pour ce sit (owner ↔ sitter) et le pipeline
 * transactionnel standard. La notification "nouveau message" est déjà
 * gérée par le trigger existant sur `messages`.
 */
import { useState } from "react";
import { LifeBuoy, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { sendTransactionalEmail } from "@/lib/sendTransactionalEmail";
import { logger } from "@/lib/logger";

type HelpCategory = "animal" | "logement" | "urgence";

interface HelpDuringSitDialogProps {
  sitId: string;
  sitTitle?: string | null;
  /** id du destinataire (l'autre partie de la conversation) */
  recipientUserId: string;
  senderFirstName?: string | null;
  triggerLabel?: string;
  size?: "sm" | "default";
  variant?: "outline" | "secondary" | "default";
  className?: string;
}

const CATEGORY_LABEL: Record<HelpCategory, string> = {
  animal: "Question sur l'animal",
  logement: "Question sur le logement",
  urgence: "Urgence",
};

const CATEGORY_TAG: Record<HelpCategory, string> = {
  animal: "[Aide, animal]",
  logement: "[Aide, logement]",
  urgence: "[URGENCE]",
};

const HelpDuringSitDialog = ({
  sitId,
  sitTitle,
  recipientUserId,
  senderFirstName,
  triggerLabel = "Besoin d'aide",
  size = "sm",
  variant = "outline",
  className,
}: HelpDuringSitDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<HelpCategory>("animal");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setCategory("animal");
    setMessage("");
  };

  const submit = async () => {
    if (!user || !message.trim()) return;
    setSubmitting(true);
    try {
      // 1) récupère/crée la conversation liée à ce sit
      const { data: convData, error: convErr } = await supabase.rpc(
        "get_or_create_conversation" as any,
        {
          p_other_user_id: recipientUserId,
          p_context: "sit_application",
          p_sit_id: sitId,
        } as any,
      );
      if (convErr) throw convErr;
      const conversationId =
        typeof convData === "string" ? convData : (convData as any)?.conversation_id || (convData as any)?.id;
      if (!conversationId) throw new Error("conversation_missing");

      const prefixed = `${CATEGORY_TAG[category]} ${message.trim()}`;

      const { error: insErr } = await supabase.from("messages").insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content: prefixed,
        is_system: false,
      } as any);
      if (insErr) throw insErr;

      // 2) URGENCE : email transactionnel immédiat au destinataire
      if (category === "urgence") {
        void sendTransactionalEmail({
          templateName: "help-during-sit",
          recipientUserId,
          idempotencyKey: `help-urgence-${sitId}-${Date.now()}`,
          templateData: {
            sitTitle: sitTitle || "votre garde",
            senderName: senderFirstName || "L'autre partie",
            category: "urgence",
            messageExcerpt: message.trim().slice(0, 240),
            conversationHref: `https://guardiens.fr/messages?c=${conversationId}`,
          },
        }).catch((e) => logger.warn("help-during-sit email failed", { error: String(e) }));
      }

      toast({
        title: category === "urgence" ? "Message d'urgence envoyé" : "Message envoyé",
        description:
          category === "urgence"
            ? "Un email prioritaire a également été envoyé."
            : "Votre message a bien été transmis dans la conversation.",
      });
      reset();
      setOpen(false);
    } catch (e: any) {
      logger.error("HelpDuringSitDialog.submit", { error: String(e) });
      toast({
        title: "Envoi impossible",
        description: e?.message || "Une erreur est survenue, réessayez.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        className={className}
        onClick={() => setOpen(true)}
      >
        <LifeBuoy className="h-4 w-4 mr-1.5" aria-hidden="true" />
        {triggerLabel}
      </Button>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Besoin d'aide pendant la garde</DialogTitle>
            <DialogDescription>
              Envoyez un message rapide à votre interlocuteur. En cas d'urgence, un email
              prioritaire est également envoyé.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <RadioGroup
              value={category}
              onValueChange={(v) => setCategory(v as HelpCategory)}
              className="space-y-2"
            >
              {(["animal", "logement", "urgence"] as HelpCategory[]).map((c) => (
                <div key={c} className="flex items-start gap-2">
                  <RadioGroupItem value={c} id={`help-${c}`} className="mt-1" />
                  <Label htmlFor={`help-${c}`} className="cursor-pointer">
                    <span className={c === "urgence" ? "font-semibold text-destructive-text" : ""}>
                      {CATEGORY_LABEL[c]}
                    </span>
                    {c === "urgence" && (
                      <span className="block text-xs text-muted-foreground mt-0.5">
                        Notification et email prioritaires envoyés immédiatement.
                      </span>
                    )}
                  </Label>
                </div>
              ))}
            </RadioGroup>

            <div>
              <Label htmlFor="help-message" className="text-sm">
                Votre message
              </Label>
              <Textarea
                id="help-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={
                  category === "urgence"
                    ? "Décrivez brièvement la situation d'urgence."
                    : "Précisez votre question pour une réponse rapide."
                }
                rows={4}
                className="mt-1.5"
              />
            </div>

            {category === "urgence" && (
              <div className="flex items-start gap-2 rounded-lg bg-destructive/5 border border-destructive/20 p-3">
                <AlertTriangle className="h-4 w-4 text-destructive-text mt-0.5 shrink-0" aria-hidden="true" />
                <p className="text-xs text-destructive-text">
                  Un email prioritaire sera envoyé en plus de la notification. À utiliser uniquement
                  en cas de réelle urgence.
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button
              type="button"
              onClick={submit}
              disabled={submitting || !message.trim()}
            >
              {submitting ? "Envoi..." : "Envoyer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default HelpDuringSitDialog;
