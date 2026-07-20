/**
 * TrustStory — bloc « Confiance » narratif du profil public gardien (vague 37).
 *
 * Lot 1b : shell d'API minimal, la composition narrative est branchée au Lot 3.
 * On expose deux ancres id compatibles avec le hero (ID vérifiée → scroll) :
 * `confiance` (desktop) et `confiance-mobile` (mobile), déjà utilisées ailleurs
 * dans le code.
 */
import type { ReactNode } from "react";

interface TrustStoryProps {
  /** Contenu déjà composé (BadgeRow, TrustTimeline, PublicExperiences, etc.) */
  children?: ReactNode;
  /** "desktop" pose id="confiance" ; "mobile" pose id="confiance-mobile". */
  variant?: "desktop" | "mobile";
  title?: string;
  eyebrow?: string;
}

const TrustStory = ({
  children,
  variant = "desktop",
  title = "Ce qui installe la confiance.",
  eyebrow = "Confiance",
}: TrustStoryProps) => {
  const anchorId = variant === "mobile" ? "confiance-mobile" : "confiance";

  return (
    <section
      id={anchorId}
      aria-label="Signaux de confiance"
      className="scroll-mt-20"
    >
      <div className="mb-4">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-secondary">
          {eyebrow}
        </p>
        <h2 className="font-heading text-[22px] sm:text-[26px] font-semibold text-foreground mt-1 leading-tight">
          {title}
        </h2>
      </div>
      {children ?? null}
    </section>
  );
};

export default TrustStory;
