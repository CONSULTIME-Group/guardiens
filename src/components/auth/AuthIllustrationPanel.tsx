import authIllustration from "@/assets/auth-illustration.png";


interface AuthIllustrationPanelProps {
  title: string;
  /** Micro-slogan court (5–7 mots) affiché entre le titre et la description, en italique discret. */
  tagline?: string;
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
export const AuthIllustrationPanel = ({ title, tagline, description, footerSlot }: AuthIllustrationPanelProps) => {
  return (
    <div className="hidden lg:block lg:w-1/2 relative bg-background">
      {/*
        Calque image + voile : strictement décoratif, en arrière-plan (z-0),
        non-interactif (pointer-events-none sur le wrapper ET le voile).
        Toute la moitié gauche est non-cliquable par design — aucune action
        utilisateur ne vit ici, le contenu interactif est dans la moitié droite.
      */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <img
          src={authIllustration}
          alt=""
          className="absolute inset-0 w-full h-full object-cover select-none"
          // Abaissement de l'image : on cale le centre visuel plus bas pour
          // dégager de l'espace en haut où vient se poser l'encart de texte.
          style={{ objectPosition: "center 75%" }}
          draggable={false}
        />
        {/* Voile sémantique ~25% : s'adapte au thème via bg-background. */}
        <div className="absolute inset-0 bg-background/25" />
      </div>

      {/*
        Contenu (titre + cartouche). z-10 garantit qu'il passe au-dessus du
        voile décoratif quel que soit l'ordre du DOM.
      */}
      <div className="relative z-10 h-full flex flex-col justify-start p-12">
        <div className="max-w-md rounded-2xl bg-background/80 backdrop-blur-sm border border-border/50 shadow-sm px-6 py-5">
          <h2 className="font-heading text-3xl font-semibold text-foreground mb-2 leading-tight">{title}</h2>
          {tagline && (
            <p className="font-heading italic text-primary/90 text-sm tracking-wide mb-3">
              {tagline}
            </p>
          )}
          <p className="text-foreground leading-relaxed">{description}</p>
        </div>
        {footerSlot && <div className="mt-4 max-w-md">{footerSlot}</div>}
      </div>
    </div>
  );
};
