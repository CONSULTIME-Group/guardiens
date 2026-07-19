/**
 * SitterOpeningCard — vague 8, la STAR de la branche nouveau gardien.
 *
 * Grand nudge d'ouverture, seul bouton primaire de l'écran. Remplace
 * ChecklistBlock et le bandeau "Code postal manquant" dans cette branche.
 * Se démonte dès que les 3 étapes primaires sont faites.
 */
import { Link } from "react-router-dom";
import { useRef } from "react";
import { trackEvent } from "@/lib/analytics";
import { useImpressionOnce } from "@/hooks/useImpressionOnce";

interface OpeningStep {
  key: string;
  done: boolean;
  label: string;
  hint: string;
  to: string;
  /** Verbe court affiché à droite quand l'étape n'est pas faite. */
  verb: string;
}

interface SitterOpeningCardProps {
  hasAvatar: boolean;
  hasBioMin: boolean;
  hasPostalCode: boolean;
}

const SitterOpeningCard = ({
  hasAvatar,
  hasBioMin,
  hasPostalCode,
}: SitterOpeningCardProps) => {
  const steps: OpeningStep[] = [
    {
      key: "avatar",
      done: hasAvatar,
      label: "Ajouter une photo de profil",
      hint: "Rassure les propriétaires en un coup d'œil.",
      to: "/profile?section=identite",
      verb: "Ajouter",
    },
    {
      key: "bio",
      done: hasBioMin,
      label: "Écrire votre bio (50 caractères min)",
      hint: "Votre motivation, en quelques mots sincères.",
      to: "/profile?section=profil",
      verb: "Écrire",
    },
    {
      key: "postal",
      done: hasPostalCode,
      label: "Renseigner votre code postal",
      hint: "Pour voir les annonces près de chez vous.",
      to: "/profile?focus=postal_code",
      verb: "Ajouter",
    },
  ];

  const doneCount = steps.filter((s) => s.done).length;
  if (doneCount === steps.length) return null;

  const progressPct = Math.round((doneCount / steps.length) * 100);
  const firstUndone = steps.find((s) => !s.done)!;

  const undoneKeys = steps.filter((s) => !s.done).map((s) => s.key).join(",");
  const sectionRef = useRef<HTMLElement | null>(null);
  useImpressionOnce(sectionRef, `sitter_opening:${undoneKeys}`, () => {
    void trackEvent("dashboard_star_seen", {
      source: "sitter_dashboard",
      metadata: { surface: "sitter_dashboard", variant: "opening", undone: undoneKeys },
    });
  });

  const trackStep = (stepKey: string) =>
    void trackEvent("dashboard_star_cta_clicked", {
      source: "sitter_dashboard",
      metadata: { surface: "sitter_dashboard", variant: "opening", step: stepKey },
    });

  return (
    <section
      ref={sectionRef}
      data-dashboard-star="sitter"
      aria-labelledby="sitter-opening-heading"
      className="px-4 sm:px-5 md:px-8 lg:px-0"
    >
      {/* Eyebrow au-dessus de la carte : trait + libellé */}
      <div className="flex items-center gap-[8px] mb-[14px]">
        <span
          aria-hidden="true"
          className="inline-block bg-secondary"
          style={{ width: "20px", height: "2px" }}
        />
        <p
          className="text-secondary uppercase"
          style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.16em" }}
        >
          Votre profil s'ouvre
        </p>
      </div>

      <article
        style={{
          backgroundColor: "hsl(var(--secondary) / 0.12)",
          border: "1px solid hsl(var(--secondary) / 0.28)",
          borderRadius: "20px",
          padding: "22px",
          boxShadow:
            "0 1px 2px rgba(29,27,22,0.04), 0 8px 24px rgba(29,27,22,0.05)",
        }}
      >
        <h2
          id="sitter-opening-heading"
          className="font-heading text-foreground"
          style={{ fontSize: "22px", fontWeight: 600, lineHeight: 1.25 }}
        >
          Trois touches, et les maisons d'ici vous ouvrent leurs portes.
        </h2>
        <p
          className="font-sans text-muted-foreground mt-[8px]"
          style={{ fontSize: "13.5px", lineHeight: 1.5 }}
        >
          Une photo qui rassure, quelques mots sincères, votre coin. C'est tout
          ce qui manque pour que les propriétaires vous voient.
        </p>

        {/* Barre de progression */}
        <div
          className="mt-[22px]"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progressPct}
          aria-label={`Progression du profil : ${progressPct} pour cent`}
          style={{
            height: "7px",
            borderRadius: "999px",
            backgroundColor: "hsl(var(--secondary) / 0.22)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${progressPct}%`,
              height: "100%",
              backgroundColor: "hsl(var(--secondary))",
              transition: "width 360ms cubic-bezier(0,0,.2,1)",
            }}
          />
        </div>

        {/* 3 rangées d'étapes */}
        <ul className="mt-[22px] space-y-[8px]" role="list">
          {steps.map((step) => {
            const rowContent = (
              <div
                className="flex items-center"
                style={{
                  minHeight: "44px",
                  padding: "10px 14px",
                  borderRadius: "12px",
                  gap: "14px",
                  backgroundColor: "rgba(255,255,255,0.72)",
                  border: "1px solid hsl(var(--border))",
                }}
              >
                {/* Pastille d'état */}
                <span
                  aria-hidden="true"
                  className="shrink-0 inline-flex items-center justify-center rounded-full"
                  style={{
                    width: "22px",
                    height: "22px",
                    border: step.done
                      ? "none"
                      : "1.5px solid hsl(var(--secondary))",
                    backgroundColor: step.done
                      ? "hsl(var(--primary))"
                      : "transparent",
                  }}
                >
                  {step.done && (
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 12 12"
                      fill="none"
                      aria-hidden="true"
                    >
                      <path
                        d="M2.5 6.2 L5 8.5 L9.5 3.8"
                        stroke="hsl(var(--primary-foreground))"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        fill="none"
                      />
                    </svg>
                  )}
                </span>

                {/* Libellé + hint */}
                <div className="min-w-0 flex-1">
                  <p
                    className={
                      step.done
                        ? "text-muted-foreground line-through"
                        : "text-foreground"
                    }
                    style={{ fontSize: "14px", fontWeight: 600, lineHeight: 1.3 }}
                  >
                    {step.label}
                  </p>
                  {!step.done && (
                    <p
                      className="text-muted-foreground mt-[4px]"
                      style={{ fontSize: "12px", lineHeight: 1.4 }}
                    >
                      {step.hint}
                    </p>
                  )}
                </div>

                {/* Verbe court à droite */}
                {!step.done && (
                  <span
                    className="text-primary shrink-0"
                    style={{ fontSize: "12px", fontWeight: 700 }}
                  >
                    {step.verb}
                  </span>
                )}
              </div>
            );

            return (
              <li key={step.key} role="listitem">
                {step.done ? (
                  rowContent
                ) : (
                  <Link
                    to={step.to}
                    onClick={() => trackStep(step.key)}
                    aria-label={`${step.label}. ${step.hint}`}
                    className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-[12px]"
                  >
                    {rowContent}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>

        {/* Bouton primaire unique */}
        <div className="mt-[22px]">
          <Link
            to={firstUndone.to}
            className="inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground font-bold transition-colors hover:bg-primary/90"
            style={{
              padding: "10px 22px",
              minHeight: "44px",
              fontSize: "14px",
              fontWeight: 700,
              boxShadow: "0 6px 14px rgba(44,109,80,0.24)",
            }}
          >
            Continuer mon profil
          </Link>
        </div>

        {/* Lien discret vers les 2 items secondaires */}
        <div className="mt-[14px]">
          <Link
            to="/profile"
            className="text-muted-foreground hover:text-primary underline-offset-4 hover:underline"
            style={{ fontSize: "12.5px", fontWeight: 600 }}
          >
            Aller plus loin
          </Link>
        </div>
      </article>
    </section>
  );
};

export default SitterOpeningCard;
