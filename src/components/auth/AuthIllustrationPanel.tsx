import authIllustration from "@/assets/auth-illustration-gouache-v3.png";

interface AuthIllustrationPanelProps {
  title: string;
  description: string;
  /** Optionnel : preuve sociale (membres inscrits, etc.) affichée sous la description. */
  footerSlot?: React.ReactNode;
}

/**
 * Panneau d'illustration partagé entre /login et /inscription.
 * Affichage net, sans voile ni masque : la gouache parle d'elle-même.
 */
export const AuthIllustrationPanel = ({ title, description, footerSlot }: AuthIllustrationPanelProps) => {
  return (
    <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-background">
      <img
        src={authIllustration}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-cover"
        style={{ objectPosition: "center 35%" }}
      />
      {/* Voile inférieur uniquement pour garantir la lisibilité du titre */}
      <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-background via-background/80 to-transparent pointer-events-none" />

      <div className="relative z-10 mt-auto p-12 max-w-lg">
        <h2 className="font-heading text-3xl font-semibold text-foreground mb-3">{title}</h2>
        <p className="text-foreground/80 leading-relaxed">{description}</p>
        {footerSlot}
      </div>
    </div>
  );
};
