import { Link } from "react-router-dom";
import { RevealSection } from "@/components/ui/RevealSection";
import { useAuth } from "@/contexts/AuthContext";
import { QUICK_HELP_EXAMPLES, quickHelpTarget } from "@/components/landing/QuickHelpSection";
import { HOME_BTN_PRIMARY, homeCtaTarget } from "@/components/landing/homeCta";
import { trackEvent } from "@/lib/analytics";
import howtoStep1Webp448 from "@/assets/illustrations/howto-step-1-annonce-448.webp";
import howtoStep2Webp448 from "@/assets/illustrations/howto-step-2-rencontre-448.webp";

const COLUMNS = [
  { title: "Garde de maison", image: howtoStep1Webp448, alt: "Maison confiée à un gardien", steps: ["Vous publiez vos dates et vos animaux.", "Des gardiens postulent. Vous échangez, et vous pouvez les rencontrer avant de choisir.", "Vous partez l'esprit léger."], cta: "Publier mon annonce de garde", path: "/sits/create", event: "cta_proprio_clicked" as const },
  { title: "Coup de main", image: howtoStep2Webp448, alt: "Deux personnes se rencontrent autour d'un service", steps: ["Vous décrivez votre besoin en une phrase.", "Les dix personnes disponibles les plus proches le reçoivent.", "Quelqu'un vous répond «\u00a0Je peux\u00a0», vous vous retrouvez."], cta: "Demander un coup de main", path: "/petites-missions/creer", event: "cta_aid_clicked" as const },
];

export function HowItWorksSection() {
  const { isAuthenticated } = useAuth();
  return (
    <section id="comment-ca-marche" className="py-[52px] md:py-20 bg-muted/30 scroll-mt-24">
      <div className="lp-wide">
        <RevealSection>
          <span className="text-xs tracking-widest uppercase text-primary font-body mb-4 block text-center">Deux façons de commencer</span>
          <h2 id="how-it-works" className="mb-10 scroll-mt-24 text-center font-heading text-3xl font-semibold leading-snug text-foreground md:text-5xl">Comment ça marche</h2>
        </RevealSection>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          {COLUMNS.map((column, columnIndex) => (
            <RevealSection key={column.title} delay={0.1 + columnIndex * 0.1}>
              <article className="flex h-full flex-col rounded-lg border border-border bg-card p-6 md:p-8">
                <img src={column.image} alt={column.alt} width={224} height={224} loading="lazy" className="mx-auto h-36 w-36 object-contain" />
                <h3 className="mt-4 font-heading text-2xl font-semibold text-foreground">{column.title}</h3>
                <ol className="mt-5 flex-1 space-y-4">
                  {column.steps.map((step, index) => <li key={step} className="flex gap-3 text-foreground/75"><span className="font-semibold text-primary">{index + 1}.</span><span>{step}</span></li>)}
                </ol>
                <Link
                  to={homeCtaTarget(column.path, isAuthenticated)}
                  onClick={() => void trackEvent(column.event, { metadata: { location: "how_it_works" } })}
                  className={`${HOME_BTN_PRIMARY} mt-6 self-start`}
                >
                  {column.cta}
                </Link>
              </article>
            </RevealSection>
          ))}
        </div>
        <RevealSection delay={0.3}>
          <p className="mt-10 text-center font-body text-base font-semibold text-foreground">Un coup de main en un clic, par exemple :</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {QUICK_HELP_EXAMPLES.map((example, index) => (
              <Link
                key={example}
                to={quickHelpTarget(example, isAuthenticated)}
                onClick={() => void trackEvent("home_quick_help_clicked", { metadata: { title: example, position: index + 1 } })}
                className="inline-flex min-h-11 items-center rounded-full border border-border bg-background px-4 py-2 text-sm text-foreground transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {example}
              </Link>
            ))}
          </div>
        </RevealSection>
      </div>
    </section>
  );
}
