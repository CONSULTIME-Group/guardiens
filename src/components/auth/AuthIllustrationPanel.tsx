import authIllustration from "@/assets/auth-illustration-carnet-v11.png";

interface AuthIllustrationPanelProps {
  title: string;
  description: string;
  /** Optionnel : preuve sociale (membres inscrits, etc.) affichée sous la description. */
  footerSlot?: React.ReactNode;
}

/**
 * Panneau d'illustration partagé entre /login et /inscription.
 * L'illustration carnet de voyage déborde volontairement vers la droite, sans bord
 * franc : le fondu intégré au visuel + un masque CSS supplémentaire dissolvent
 * la frontière avec le formulaire.
 */
export const AuthIllustrationPanel = ({ title, description, footerSlot }: AuthIllustrationPanelProps) => {
  return (
    <div className="hidden lg:block lg:w-1/2 relative">
      {/* L'image dépasse de 12% à droite pour mordre sur le formulaire */}
      <div className="absolute inset-y-0 left-0 right-[-12%] overflow-hidden">
        <img
          src={authIllustration}
          alt="Carnet de voyage aquarellé : un après-midi de garde et d'entraide dans un village du Sud"
          className="absolute inset-0 w-full h-full object-cover"
          style={{
            objectPosition: "left center",
            // Double fondu : à droite vers la transparence (intégration formulaire),
            // léger fondu en bas pour la lisibilité du texte superposé.
            WebkitMaskImage:
              "linear-gradient(to right, black 0%, black 60%, transparent 100%)",
            maskImage:
              "linear-gradient(to right, black 0%, black 60%, transparent 100%)",
          }}
        />
      </div>

      {/* Voile inférieur très léger pour garantir la lisibilité du texte superposé */}
      <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-background via-background/70 to-transparent pointer-events-none" />

      <div className="relative z-10 h-full flex flex-col justify-end p-12 max-w-lg">
        <h2 className="font-heading text-3xl font-semibold text-foreground mb-3">{title}</h2>
        <p className="text-foreground/80 leading-relaxed">{description}</p>
        {footerSlot}
      </div>
    </div>
  );
};
