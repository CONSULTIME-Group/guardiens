import authIllustration from "@/assets/auth-illustration-carnet-v22.png";

interface AuthIllustrationPanelProps {
  title: string;
  description: string;
  /** Optionnel : preuve sociale (membres inscrits, etc.) affichée sous la description. */
  footerSlot?: React.ReactNode;
}

/**
 * Panneau d'illustration partagé entre /login et /inscription.
 *
 * L'image v20 est une gouache aux bords réellement peints (taches, drips,
 * papier nu autour) : elle se confond naturellement avec le fond crème par sa
 * propre matière, sans masque CSS ni voile dégradé. L'illustration reste
 * strictement contenue dans la moitié gauche (overflow-hidden + w-1/2).
 *
 * Lisibilité du texte : un petit cartouche papier translucide (bg-background)
 * avec flou léger est posé derrière le titre/description, dans la zone haute
 * où l'image laisse déjà respirer le crème. C'est sobre, ça n'écrase pas
 * l'illustration et ça garantit le contraste WCAG.
 */
export const AuthIllustrationPanel = ({ title, description, footerSlot }: AuthIllustrationPanelProps) => {
  return (
    <div className="hidden lg:block lg:w-1/2 relative bg-background">
      <div className="absolute inset-0 overflow-hidden">
        <img
          src={authIllustration}
          alt="Scène aquarellée : entraide locale, remise de clés entre voisins et garde d'animaux dans un village du Sud"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ objectPosition: "center center" }}
        />
      </div>

      <div className="relative z-10 h-full flex flex-col justify-start p-12">
        <div className="max-w-md rounded-2xl bg-background/80 backdrop-blur-sm border border-border/50 shadow-sm px-6 py-5">
          <h2 className="font-heading text-3xl font-semibold text-foreground mb-3 leading-tight">{title}</h2>
          <p className="text-foreground leading-relaxed">{description}</p>
        </div>
        {footerSlot && <div className="mt-4 max-w-md">{footerSlot}</div>}
      </div>
    </div>
  );
};
