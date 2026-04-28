import authIllustration from "@/assets/auth-illustration.png";
import sageOverflow from "@/assets/auth-sage-overflow.png";


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
      <div className="absolute inset-0 overflow-hidden">
        <img
          src={authIllustration}
          alt="Scène aquarellée : entraide locale, remise de clés et garde d'animaux entre gens du coin dans un village du Sud"
          className="absolute inset-0 w-full h-full object-cover"
          // Abaissement de l'image : on cale le centre visuel plus bas pour
          // dégager de l'espace en haut où vient se poser l'encart de texte.
          style={{ objectPosition: "center 75%" }}
        />
      </div>

      {/* Bandeau botanique en débord : une fine branche de sauge qui sort du
          bord droit de l'illustration peinte et se prolonge naturellement sur
          le panneau du formulaire, avec une grappe de glycine qui pend depuis
          le haut de l'écran à droite (gravité respectée). pointer-events-none
          pour ne jamais bloquer les inputs ; positionné suffisamment haut pour
          ne couvrir ni le titre, ni les CTA. */}
      <img
        src={sageOverflow}
        alt=""
        aria-hidden="true"
        loading="lazy"
        width={1920}
        height={640}
        className="hidden lg:block pointer-events-none absolute left-0 top-0 max-w-none h-auto z-20 select-none"
        style={{
          width: "200%",
          opacity: 0.9,
        }}
      />

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
