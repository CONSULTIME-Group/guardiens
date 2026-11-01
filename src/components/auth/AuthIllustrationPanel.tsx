import { forwardRef } from "react";
import authIllustration from "@/assets/aquarelles/inscription-tablee-1024.webp";

interface AuthIllustrationPanelProps {
  title: string;
  /** Micro-slogan court (5–7 mots) affiché entre le titre et la description, en italique discret. */
  tagline?: string;
  description: string;
  /** Optionnel : preuve sociale (membres inscrits, etc.) affichée sous la description. */
  footerSlot?: React.ReactNode;
}

/**
 * Panneau d'illustration partagé entre /login, /inscription et /mot-de-passe-oublie.
 *
 * 01/11/2026 : aquarelle légère « tablée » (src/assets/aquarelles), fond papier
 * détouré, peinte sur la page. Le cinemagraph MP4 (1,9 Mo) et son manifeste de
 * synchronisation sont retirés : une image fixe de 80 Ko suffit, sans vidéo à
 * décoder ni à précharger.
 *
 * Exposé via forwardRef pour compatibilité Helmet/HOC.
 */
export const AuthIllustrationPanel = forwardRef<HTMLDivElement, AuthIllustrationPanelProps>(
  ({ title, tagline, description, footerSlot }, ref) => (
    <div ref={ref} className="hidden lg:block lg:w-1/2 relative bg-background">
      {/* Calque image : strictement décoratif, en arrière-plan, non interactif. */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <img
          src={authIllustration}
          alt=""
          className="absolute inset-0 w-full h-full object-contain object-bottom select-none"
          style={{
            objectPosition: "50% 100%",
            WebkitMaskImage:
              "linear-gradient(to right, hsl(0 0% 0%) 0%, hsl(0 0% 0%) 88%, transparent 100%)",
            maskImage:
              "linear-gradient(to right, hsl(0 0% 0%) 0%, hsl(0 0% 0%) 88%, transparent 100%)",
          }}
          draggable={false}
          loading="eager"
          decoding="async"
          width={1024}
          height={1344}
        />
      </div>

      {/* Contenu (titre + cartouche), au-dessus du calque image. */}
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
  )
);

AuthIllustrationPanel.displayName = "AuthIllustrationPanel";
