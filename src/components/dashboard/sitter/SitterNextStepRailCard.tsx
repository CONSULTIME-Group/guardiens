/**
 * SitterNextStepRailCard — rail nouveau gardien (vague 8).
 * Même gabarit que NextGuardRailCard. Disparaît quand les 3 étapes
 * primaires (SitterOpeningCard) sont faites.
 */
import { Link } from "react-router-dom";

interface SitterNextStepRailCardProps {
  hasAvatar: boolean;
  hasBioMin: boolean;
  hasPostalCode: boolean;
  /**
   * Prochain pas de rechange quand les trois touches sont faites.
   * Sert à rendre visible une invitation positive (vérification d'identité)
   * au lieu de laisser la carte disparaître du rail.
   */
  action?: {
    eyebrow: string;
    title: string;
    description: string;
    ctaLabel: string;
    ctaTo: string;
  } | null;
}

const SitterNextStepRailCard = ({
  hasAvatar,
  hasBioMin,
  hasPostalCode,
  action = null,
}: SitterNextStepRailCardProps) => {
  const steps = [
    { done: hasAvatar, to: "/profile?section=identite" },
    { done: hasBioMin, to: "/profile?section=profil" },
    { done: hasPostalCode, to: "/profile?focus=postal_code" },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  const stepsDone = doneCount === steps.length;
  if (stepsDone && !action) return null;
  const firstUndone = steps.find((s) => !s.done);

  const content = stepsDone
    ? {
        eyebrow: action!.eyebrow,
        title: action!.title,
        description: action!.description,
        ctaLabel: action!.ctaLabel,
        ctaTo: action!.ctaTo,
      }
    : {
        eyebrow: "Votre prochain pas",
        title: "Les annonces s'ouvrent avec votre profil.",
        description:
          "Dès vos trois touches terminées, vous pouvez postuler à toutes les gardes autour de vous.",
        ctaLabel: "Reprendre là où vous en étiez",
        ctaTo: firstUndone!.to,
      };


  return (
    <article
      className="bg-card border border-border"
      style={{
        borderRadius: "20px",
        padding: "22px",
        boxShadow: "0 1px 2px rgba(29,27,22,0.04), 0 8px 24px rgba(29,27,22,0.05)",
      }}
    >
      <div className="flex items-center gap-2">
        <span
          aria-hidden="true"
          className="inline-block"
          style={{ width: "20px", height: "1px", background: "hsl(var(--secondary))" }}
        />
        <p
          style={{
            color: "hsl(var(--secondary))",
            fontSize: "11px",
            fontWeight: 700,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
          }}
        >
          {content.eyebrow}
        </p>
      </div>

      <h3
        className="font-heading text-foreground mt-[14px]"
        style={{ fontSize: "17px", fontWeight: 600, lineHeight: 1.3 }}
      >
        {content.title}
      </h3>

      <p
        className="font-sans text-muted-foreground mt-[8px]"
        style={{ fontSize: "13.5px", lineHeight: 1.45 }}
      >
        {content.description}
      </p>

      <div className="mt-[14px]">
        <Link
          to={content.ctaTo}
          className="text-primary hover:underline underline-offset-4"
          style={{ fontSize: "13px", fontWeight: 700 }}
        >
          {content.ctaLabel}
        </Link>
      </div>

    </article>
  );
};

export default SitterNextStepRailCard;
