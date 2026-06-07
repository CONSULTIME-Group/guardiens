/**
 * Carte « Votre activation » : progression gamifiée 0/6 vers le 1er sit réussi.
 *
 * Affichée uniquement tant que le propriétaire n'a pas tout complété
 * (`allDone`). Une fois plein, la carte se retire pour ne pas saturer
 * le dashboard.
 *
 * Visuel : barre de progression segmentée + liste des étapes (icône
 * coche/cercle vide). Pas de Lucide décoratif dans le contenu (règle Core),
 * on utilise des pastilles SVG inline neutres.
 */

import { Link } from "react-router-dom";
import type { ActivationScore } from "@/lib/nextActions/owner";

interface Props {
  score: ActivationScore;
}

const StepDot = ({ done }: { done: boolean }) => (
  <span
    aria-hidden="true"
    className={`inline-flex items-center justify-center h-5 w-5 rounded-full shrink-0 transition-colors ${
      done
        ? "bg-success text-success-foreground"
        : "bg-muted text-muted-foreground border border-border"
    }`}
  >
    {done ? (
      <svg viewBox="0 0 12 12" className="h-3 w-3 fill-none stroke-current" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 6.5l2.5 2.5L10 3.5" />
      </svg>
    ) : (
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-50" />
    )}
  </span>
);

const ActivationScoreCard = ({ score }: Props) => {
  if (score.allDone) return null;

  return (
    <section
      aria-label="Progression de votre activation"
      className="rounded-2xl border border-border bg-card p-5 md:p-6 shadow-sm"
    >
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[2px] text-muted-foreground font-sans mb-1.5">
            Votre activation
          </p>
          <h2 className="text-lg md:text-xl font-heading font-semibold text-foreground leading-snug">
            Vous êtes à {score.completed}/{score.total} étapes
            <span className="text-muted-foreground font-normal"> pour réussir votre première garde.</span>
          </h2>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-2xl md:text-3xl font-heading font-bold text-primary leading-none">
            {score.percent}%
          </p>
        </div>
      </div>

      {/* Barre segmentée : 1 segment par étape, visuel de jalons */}
      <div className="flex gap-1 mb-5" role="progressbar" aria-valuenow={score.completed} aria-valuemin={0} aria-valuemax={score.total}>
        {score.steps.map((s) => (
          <span
            key={s.key}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              s.done ? "bg-primary" : "bg-muted"
            }`}
          />
        ))}
      </div>

      <ul className="space-y-2.5">
        {score.steps.map((step) => {
          const content = (
            <span className="flex items-center gap-2.5 min-w-0">
              <StepDot done={step.done} />
              <span
                className={`text-sm ${
                  step.done
                    ? "text-muted-foreground line-through decoration-muted-foreground/40"
                    : "text-foreground"
                }`}
              >
                {step.label}
              </span>
            </span>
          );

          if (step.done || !step.ctaTo) {
            return <li key={step.key}>{content}</li>;
          }
          return (
            <li key={step.key}>
              <Link
                to={step.ctaTo}
                className="flex items-center justify-between gap-3 -mx-2 px-2 py-1 rounded-lg hover:bg-muted/50 transition-colors group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                {content}
                <span className="text-xs text-primary font-medium opacity-80 group-hover:opacity-100 shrink-0">
                  Commencer
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
};

export default ActivationScoreCard;
