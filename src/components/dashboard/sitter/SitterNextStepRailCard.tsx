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
}

const SitterNextStepRailCard = ({
  hasAvatar,
  hasBioMin,
  hasPostalCode,
}: SitterNextStepRailCardProps) => {
  const steps = [
    { done: hasAvatar, to: "/profile?section=identite" },
    { done: hasBioMin, to: "/profile?section=profil" },
    { done: hasPostalCode, to: "/profile?focus=postal_code" },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  if (doneCount === steps.length) return null;
  const firstUndone = steps.find((s) => !s.done)!;

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
          Votre prochain pas
        </p>
      </div>

      <h3
        className="font-heading text-foreground mt-[14px]"
        style={{ fontSize: "17px", fontWeight: 600, lineHeight: 1.3 }}
      >
        Les annonces s'ouvrent avec votre profil.
      </h3>

      <p
        className="font-sans text-muted-foreground mt-[8px]"
        style={{ fontSize: "13.5px", lineHeight: 1.45 }}
      >
        Dès vos trois touches terminées, vous pouvez postuler à toutes les gardes autour de vous.
      </p>

      <div className="mt-[14px]">
        <Link
          to={firstUndone.to}
          className="text-primary hover:underline underline-offset-4"
          style={{ fontSize: "13px", fontWeight: 700 }}
        >
          Reprendre là où vous en étiez
        </Link>
      </div>
    </article>
  );
};

export default SitterNextStepRailCard;
