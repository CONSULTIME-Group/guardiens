import authIllustration from "@/assets/auth-illustration-carnet-v20.png";

interface AuthIllustrationPanelProps {
  title: string;
  description: string;
  /** Optionnel : preuve sociale (membres inscrits, etc.) affichée sous la description. */
  footerSlot?: React.ReactNode;
}

/**
 * Panneau d'illustration partagé entre /login et /inscription.
 * L'image est une peinture gouache aux bords organiques peints à la main :
 * elle se dilue naturellement dans le fond crème (pas de masque CSS, pas de
 * voile, pas de gradient). L'image reste strictement dans la moitié gauche
 * pour ne jamais empiéter sur le formulaire.
 */
export const AuthIllustrationPanel = ({ title, description, footerSlot }: AuthIllustrationPanelProps) => {
  return (
    <div className="hidden lg:block lg:w-1/2 relative bg-background">
      <div className="absolute inset-0 overflow-hidden">
        <img
          src={authIllustration}
          alt="Scène aquarellée : entraide locale et garde d'animaux entre voisins dans un village du Sud"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ objectPosition: "center center" }}
        />
      </div>

      <div className="relative z-10 h-full flex flex-col justify-start p-12 max-w-lg">
        <h2 className="font-heading text-3xl font-semibold text-foreground mb-3">{title}</h2>
        <p className="text-foreground/80 leading-relaxed">{description}</p>
        {footerSlot}
      </div>
    </div>
  );
};
