/**
 * NextStepRailCard — bloc « prochain pas » du rail droit (refonte rail,
 * août 2026). Charte : fond terracotta doux, titre Playfair, barre de
 * progression quand le contenu porte un score de complétion, une phrase
 * douce, un bouton secondaire. Jamais de rouge, jamais de reproche.
 *
 * Présentation pure : le contenu est calculé par `dashboardNextStep.ts`.
 * Un seul composant pour les deux rôles, pour que gardien et propriétaire
 * partagent exactement la même grammaire de rail.
 */
import { Link } from "react-router-dom";
import { Progress } from "@/components/ui/progress";
import type { RailNextStep } from "@/lib/dashboardNextStep";

interface NextStepRailCardProps {
  step: RailNextStep;
}

const NextStepRailCard = ({ step }: NextStepRailCardProps) => (
  <article
    className="bg-terra-soft border border-terra-border"
    style={{
      borderRadius: "20px",
      padding: "22px",
      boxShadow: "0 1px 2px rgba(29,27,22,0.04), 0 8px 24px rgba(29,27,22,0.05)",
    }}
  >
    <p
      style={{
        color: "hsl(var(--secondary))",
        fontSize: "11px",
        fontWeight: 700,
        letterSpacing: "0.16em",
        textTransform: "uppercase",
      }}
    >
      {step.eyebrow}
    </p>

    <h3
      className="font-heading text-foreground mt-[10px]"
      style={{ fontSize: "17px", fontWeight: 600, lineHeight: 1.3 }}
    >
      {step.title}
    </h3>

    {typeof step.progressPct === "number" && (
      <div className="mt-[12px]">
        <Progress
          value={step.progressPct}
          className="h-1.5 bg-card/70 [&>div]:bg-secondary"
          aria-label={`Profil complété à ${step.progressPct} %`}
        />
        <p className="mt-[6px] text-muted-foreground" style={{ fontSize: "12px" }}>
          {step.progressPct} % complété
        </p>
      </div>
    )}

    {step.phrase && (
      <p
        className="font-sans text-muted-foreground mt-[8px]"
        style={{ fontSize: "13.5px", lineHeight: 1.45 }}
      >
        {step.phrase}
      </p>
    )}

    <div className="mt-[14px]">
      <Link
        to={step.ctaTo}
        className="inline-flex items-center justify-center rounded-full border border-border bg-card px-4 text-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        style={{ fontSize: "13px", fontWeight: 600, minHeight: "36px" }}
      >
        {step.ctaLabel}
      </Link>
    </div>
  </article>
);

export default NextStepRailCard;
