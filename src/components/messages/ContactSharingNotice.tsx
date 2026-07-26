import { useEffect, useState } from "react";

const STORAGE_KEY = "guardiens.contact-sharing-notice.dismissed";

function readDismissed(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

/**
 * Encart d'information affiché une seule fois par conversation :
 * l'échange de coordonnées est autorisé dans la messagerie privée.
 */
const ContactSharingNotice = ({ conversationId }: { conversationId: string }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!conversationId) return;
    const dismissed = readDismissed();
    if (dismissed.includes(conversationId)) {
      setVisible(false);
      return;
    }
    setVisible(true);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...dismissed, conversationId].slice(-200)));
    } catch {
      // stockage indisponible : l'encart réapparaîtra, sans conséquence
    }
  }, [conversationId]);

  if (!visible) return null;

  return (
    <div className="mx-4 mt-4 rounded-xl border border-border bg-muted/40 px-4 py-3">
      <p className="text-xs leading-relaxed text-muted-foreground">
        Vous pouvez échanger vos numéros et vos emails ici, c'est prévu pour ça. Prenez juste le
        temps de vous parler avant de donner vos clés.
      </p>
    </div>
  );
};

export default ContactSharingNotice;
