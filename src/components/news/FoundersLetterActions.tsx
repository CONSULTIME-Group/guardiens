import { useState } from "react";
import { Copy, Check, Facebook, Loader2, Send, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

/**
 * Lot LET1 (08/11/2026, demande de Jérémie) : la lettre des fondateurs
 * (notification « Guardiens est gratuit, pour tous ») porte deux actions et
 * seulement deux, à la place des blocs d'inscription génériques des articles :
 *  1. faire connaître Guardiens sur ses propres réseaux ;
 *  2. laisser un avis rapide, reçu dans la messagerie de contact.
 *
 * Facebook n'accepte plus de texte prérempli dans sa fenêtre de partage
 * (règle de la plateforme) : le lien partagé affiche l'aperçu du site, et le
 * message proposé se copie en un clic pour être collé dans la publication.
 */
export { FOUNDERS_LETTER_SLUG } from "@/data/foundersLetter";

export const SHARE_URL =
  "https://guardiens.fr/?utm_source=partage-membre&utm_medium=social&utm_campaign=lettre-fondateurs";

export const SHARE_MESSAGE =
  "Je vous fais découvrir Guardiens, un site gratuit pour se rendre service entre gens du coin : " +
  "faire garder sa maison ou ses animaux, donner ou trouver un coup de main près de chez soi. " +
  "Plus nous sommes nombreux autour de chez nous, plus chacun trouve vite quelqu'un le jour où il en a besoin. " +
  "C'est par ici : https://guardiens.fr";

export const FEEDBACK_SUBJECT = "Mon avis (lettre des fondateurs)";
const MAX_LENGTH = 1000;

export function facebookShareUrl(url: string = SHARE_URL): string {
  return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
}

export default function FoundersLetterActions() {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const canNativeShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  const copyMessage = async () => {
    try {
      await navigator.clipboard.writeText(SHARE_MESSAGE);
      setCopied(true);
      toast.success("Message copié : collez-le dans votre publication.", { duration: 3000 });
      window.setTimeout(() => setCopied(false), 3000);
    } catch {
      toast.error("Sélectionnez le texte à la main pour le copier.");
    }
  };

  const shareOnFacebook = () => {
    void navigator.clipboard?.writeText(SHARE_MESSAGE).catch(() => undefined);
    window.open(facebookShareUrl(), "_blank", "noopener,noreferrer,width=640,height=560");
  };

  const shareNative = async () => {
    try {
      await navigator.share({ title: "Guardiens", text: SHARE_MESSAGE, url: SHARE_URL });
    } catch {
      /* partage annulé par la personne */
    }
  };

  const senderEmail = (user?.email || email).trim();
  const canSend = message.trim().length > 0 && /@/.test(senderEmail) && !sending;

  const sendFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSend) return;
    setSending(true);
    const { error } = await supabase.from("contact_messages").insert({
      email: senderEmail,
      name: user?.firstName || "Membre",
      subject: FEEDBACK_SUBJECT,
      message: message.trim().slice(0, MAX_LENGTH),
      source: "lettre-fondateurs",
    });
    setSending(false);
    if (error) {
      toast.error("Une erreur est survenue, veuillez réessayer.", { duration: 5000 });
      return;
    }
    setSent(true);
    setMessage("");
  };

  return (
    <div className="mt-10 space-y-6" data-founders-letter-actions>
      <section className="rounded-xl bg-card border border-border p-6" aria-labelledby="faire-connaitre">
        <h2 id="faire-connaitre" className="font-heading text-xl font-semibold text-foreground mb-2">
          Faites connaître Guardiens
        </h2>
        <p className="text-muted-foreground mb-4">
          Guardiens est gratuit, et chaque inscription près de chez vous vous sert aussi : plus de gardiens et de
          voisins prêts à aider autour de vous. Partagez-le sur votre mur.
        </p>
        <blockquote className="rounded-lg bg-muted/60 p-4 text-sm text-foreground mb-4 whitespace-pre-line">
          {SHARE_MESSAGE}
        </blockquote>
        <div className="flex flex-wrap gap-3">
          <Button onClick={shareOnFacebook} className="gap-2">
            <Facebook className="h-4 w-4" aria-hidden="true" />
            Publier sur Facebook
          </Button>
          <Button variant="outline" onClick={copyMessage} className="gap-2">
            {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
            {copied ? "Message copié" : "Copier le message"}
          </Button>
          {canNativeShare && (
            <Button variant="outline" onClick={shareNative} className="gap-2">
              <Share2 className="h-4 w-4" aria-hidden="true" />
              Partager ailleurs
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          Le message est copié en même temps : collez-le dans la fenêtre Facebook qui s'ouvre.
        </p>
      </section>

      <section className="rounded-xl bg-card border border-border p-6" aria-labelledby="votre-avis">
        <h2 id="votre-avis" className="font-heading text-xl font-semibold text-foreground mb-2">
          Votre avis, en quelques mots
        </h2>
        {sent ? (
          <p className="text-foreground" role="status">
            Merci, votre message nous est bien arrivé. Nous le lisons nous-mêmes.
          </p>
        ) : (
          <form onSubmit={sendFeedback} className="space-y-3">
            <p className="text-muted-foreground">
              Ce qui vous plaît, ce qui vous paraît flou, ce qui vous serait utile : écrivez-nous ici, le message arrive
              directement à Jérémie et Elisa.
            </p>
            <div className="relative">
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value.slice(0, MAX_LENGTH))}
                placeholder="Votre message"
                rows={4}
                maxLength={MAX_LENGTH}
                className="resize-none"
                aria-label="Votre avis"
              />
              <span className="absolute bottom-2 right-3 text-xs text-muted-foreground">
                {message.length}/{MAX_LENGTH}
              </span>
            </div>
            {!user?.email && (
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Votre email, pour vous répondre"
                aria-label="Votre email"
                autoComplete="email"
              />
            )}
            <Button type="submit" disabled={!canSend} className="gap-2">
              {sending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Send className="h-4 w-4" aria-hidden="true" />}
              Envoyer mon avis
            </Button>
          </form>
        )}
      </section>
    </div>
  );
}
