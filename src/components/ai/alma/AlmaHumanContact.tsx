/**
 * Lot J2-B : « Écrire à Jérémie et Elisa », depuis le fil d'Alma. Le message
 * part avec les derniers échanges et l'écran courant, dans les messages de
 * contact de l'administration, et crée un signal admin.
 */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { normalizeContactMessage } from "@/lib/normalizeContactMessage";
import { closeAlmaHumanContact, sendAlmaHumanContact } from "@/lib/alma/conversation-store";

export const ALMA_HUMAN_CONTACT_LABEL = "Écrire à Jérémie et Elisa";

export function AlmaHumanContactForm({ surface }: { surface: string }) {
  const { user } = useAuth();
  const [name, setName] = useState(user?.firstName ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = normalizeContactMessage(text);
    if (!clean) {
      setError("Écrivez quelques mots pour Jérémie et Elisa.");
      return;
    }
    setSending(true);
    setError(null);
    const ok = await sendAlmaHumanContact({ name, email: email.trim(), text: clean, surface });
    setSending(false);
    if (!ok) setError("Le message reste ici, réessayez dans un instant.");
  };

  return (
    <form
      onSubmit={submit}
      data-testid="alma-human-contact"
      className="notebook-card mt-3 space-y-3 bg-card p-4"
      aria-labelledby="alma-human-contact-title"
    >
      <p id="alma-human-contact-title" className="font-heading text-[15px] text-foreground">
        {ALMA_HUMAN_CONTACT_LABEL}
      </p>
      <p className="text-xs text-muted-foreground">
        Vos derniers échanges avec Alma et l'écran où vous êtes partent avec votre message.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="alma-contact-name">Nom</Label>
          <Input id="alma-contact-name" value={name} maxLength={120} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="alma-contact-email">Email</Label>
          <Input id="alma-contact-email" type="email" required value={email} maxLength={200} onChange={(e) => setEmail(e.target.value)} />
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor="alma-contact-text">Votre message</Label>
        <Textarea id="alma-contact-text" rows={3} maxLength={3000} value={text} onChange={(e) => setText(e.target.value)} />
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" className="h-11" disabled={sending}>
          {sending ? "Envoi en cours" : "Envoyer"}
        </Button>
        <Button type="button" variant="ghost" className="h-11" onClick={closeAlmaHumanContact}>
          Plus tard
        </Button>
      </div>
    </form>
  );
}
