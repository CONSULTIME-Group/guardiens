import authIllustration from "@/assets/auth-illustration-carnet-v17.png";

interface AuthIllustrationPanelProps {
  title: string;
  description: string;
  /** Optionnel : preuve sociale (membres inscrits, etc.) affichée sous la description. */
  footerSlot?: React.ReactNode;
}

/**
 * Panneau d'illustration partagé entre /login et /inscription.
 * Le visuel déborde légèrement vers le formulaire, mais c'est désormais
 * l'illustration elle-même qui gère le fondu pour éviter toute cassure artificielle.
 */
export const AuthIllustrationPanel = ({ title, description, footerSlot }: AuthIllustrationPanelProps) => {
  return (
    <div className="hidden lg:block lg:w-1/2 relative">
      <div className="absolute inset-y-0 left-0 right-[-10%] overflow-hidden">
        <img
          src={authIllustration}
          alt="Scène aquarellée : entraide locale et garde d'animaux entre voisins dans un village du Sud"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ objectPosition: "left bottom" }}
        />
      </div>

      {/* Voile supérieur : garantit la lisibilité du titre, laisse la scène vivante du bas intacte */}
      <div className="absolute top-0 left-0 right-0 h-2/5 bg-gradient-to-b from-background via-background/85 to-transparent pointer-events-none" />

      <div className="relative z-10 h-full flex flex-col justify-start p-12 max-w-lg">
        <h2 className="font-heading text-3xl font-semibold text-foreground mb-3">{title}</h2>
        <p className="text-foreground/80 leading-relaxed">{description}</p>
        {footerSlot}
      </div>
    </div>
  );
};
