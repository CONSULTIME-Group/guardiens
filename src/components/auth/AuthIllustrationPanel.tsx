import authIllustration from "@/assets/auth-illustration-village-v5.png";

interface AuthIllustrationPanelProps {
  /** Conservé pour compat API mais non rendu : titre/description/KPI sont peints dans l'illustration. */
  title?: string;
  description?: string;
  footerSlot?: React.ReactNode;
}

/**
 * Panneau d'illustration partagé entre /login et /inscription.
 * Le contenu textuel (titre, baseline, KPI) est peint à la main dans l'illustration
 * pour une cohérence éditoriale maximale. Aucune superposition HTML.
 */
export const AuthIllustrationPanel = (_props: AuthIllustrationPanelProps) => {
  return (
    <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-background">
      <img
        src={authIllustration}
        alt="Illustration d'un village paisible où voisins, chiens et chats partagent le quotidien"
        className="absolute inset-0 w-full h-full object-cover"
        style={{ objectPosition: "center center" }}
      />
    </div>
  );
};
