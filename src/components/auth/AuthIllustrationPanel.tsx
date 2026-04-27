import authIllustration from "@/assets/auth-illustration-gouache.png";

interface AuthIllustrationPanelProps {
  title: string;
  description: string;
  /** Optionnel : preuve sociale (membres inscrits, etc.) affichée sous la description. */
  footerSlot?: React.ReactNode;
}

/**
 * Panneau d'illustration partagé entre /login et /inscription.
 * Garantit la cohérence visuelle et évite la duplication de ~35 lignes de styles.
 */
export const AuthIllustrationPanel = ({ title, description, footerSlot }: AuthIllustrationPanelProps) => {
  return (
    <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-background">
      <img
        src={authIllustration}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-cover mix-blend-multiply opacity-100"
        style={{
          WebkitMaskImage:
            "radial-gradient(ellipse 95% 100% at 40% 50%, black 0%, rgba(0,0,0,0.85) 25%, transparent 95%)",
          maskImage:
            "radial-gradient(ellipse 95% 100% at 40% 50%, black 0%, rgba(0,0,0,0.85) 25%, transparent 95%)",
          filter: "saturate(0.75) hue-rotate(-8deg) blur(1.2px)",
        }}
      />
      {/* Filtre de teinte aligné sur la palette (vert sapin primaire) */}
      <div
        className="absolute inset-0 pointer-events-none mix-blend-color opacity-25"
        style={{
          backgroundColor: "hsl(var(--primary))",
          WebkitMaskImage:
            "radial-gradient(ellipse 95% 100% at 40% 50%, black 0%, rgba(0,0,0,0.85) 25%, transparent 95%)",
          maskImage:
            "radial-gradient(ellipse 95% 100% at 40% 50%, black 0%, rgba(0,0,0,0.85) 25%, transparent 95%)",
        }}
      />
      {/* Fondu latéral vers le formulaire (droite) */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-background/40 to-background pointer-events-none" />
      {/* Voile derrière le texte pour garantir la lisibilité */}
      <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-background via-background/70 to-transparent pointer-events-none" />

      <div className="relative z-10 mt-auto p-12 max-w-lg">
        <h2 className="font-heading text-3xl font-semibold text-foreground mb-3">{title}</h2>
        <p className="text-foreground/80 leading-relaxed">{description}</p>
        {footerSlot}
      </div>
    </div>
  );
};
