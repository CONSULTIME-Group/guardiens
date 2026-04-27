import authIllustration from "@/assets/auth-illustration-carnet-v10.png";

interface AuthIllustrationPanelProps {
  title: string;
  description: string;
  /** Optionnel : preuve sociale (membres inscrits, etc.) affichée sous la description. */
  footerSlot?: React.ReactNode;
}

/**
 * Panneau d'illustration partagé entre /login et /inscription.
 * Illustration gouache d'ambiance village + texte HTML superposé (titre, description, KPI dynamique).
 */
export const AuthIllustrationPanel = ({ title, description, footerSlot }: AuthIllustrationPanelProps) => {
  return (
    <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-background">
      <img
        src={authIllustration}
        alt="Illustration d'un village paisible où voisins, chiens et chats partagent le quotidien"
        className="absolute inset-0 w-full h-full object-cover"
        style={{ objectPosition: "center 30%" }}
      />
      {/* Voile inférieur pour garantir la lisibilité du texte superposé */}
      <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-background via-background/85 to-transparent pointer-events-none" />

      <div className="relative z-10 mt-auto p-12 max-w-lg">
        <h2 className="font-heading text-3xl font-semibold text-foreground mb-3">{title}</h2>
        <p className="text-foreground/80 leading-relaxed">{description}</p>
        {footerSlot}
      </div>
    </div>
  );
};
