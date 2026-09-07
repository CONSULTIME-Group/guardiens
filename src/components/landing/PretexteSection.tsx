import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { RevealSection } from "@/components/ui/RevealSection";
import { GrainOverlay } from "@/components/ui/GrainOverlay";
import { PaintedRooftops } from "@/components/landing/painted/PaintedRooftops";
import { trackEvent } from "@/lib/analytics";

/**
 * PretexteSection, fusion des anciennes sections Rencontre et Entraide
 * (06/09/2026). Seul bloc sombre du corps de page : dégradé vert pin,
 * texte clair. Elle porte le message de marque : la garde et le coup de
 * main sont le prétexte d'une expérience qu'on n'était pas allé chercher,
 * des deux côtés (propriétaire comme gardien).
 *
 * Ancre "#entraide" conservée : le sommaire de page, UsagesSection et
 * HowItWorksSection pointent encore vers elle.
 */
export function PretexteSection() {
  const { t } = useTranslation();

  return (
    <section
      id="entraide"
      aria-labelledby="pretexte-title"
      className="relative overflow-hidden scroll-mt-24 bg-gradient-to-br from-pine-deep to-pine text-pine-foreground"
    >
      {/* Grain de papier à 4 % sur le grand aplat sombre. */}
      <GrainOverlay />
      <div className="relative lp-read py-[52px] md:py-24">
        <RevealSection>
          <p className="flex items-center justify-center gap-2 font-body text-xs tracking-[0.2em] uppercase text-terra-soft mb-6">
            <span className="inline-block w-5 h-0.5 bg-terra align-middle" aria-hidden="true" />
            {t("landing.pretexte.eyebrow")}
          </p>
          <h2
            id="pretexte-title"
            className="font-heading text-2xl md:text-5xl font-semibold leading-[1.15] text-center mb-[52px] text-balance"
          >
            {t("landing.pretexte.title")}
          </h2>

          <div className="max-w-2xl mx-auto space-y-[52px]">
            <p className="font-body text-lg md:text-xl leading-relaxed text-pine-foreground/90">
              {t("landing.pretexte.p1")}
            </p>
            <p className="font-body text-lg md:text-xl leading-relaxed text-pine-foreground/90">
              {t("landing.pretexte.p2")}
            </p>
            <p className="font-body text-lg md:text-xl leading-relaxed text-pine-foreground/90">
              {t("landing.pretexte.p3")}
            </p>
          </div>

          <p className="font-heading text-xl md:text-2xl italic text-center leading-snug mt-[52px] mb-8">
            {t("landing.pretexte.closing")}
          </p>

          <div className="text-center">
            <Link
              to="/petites-missions"
              onClick={() => {
                trackEvent("cta_aid_clicked", { metadata: { location: "pretexte_section" } });
              }}
              className="inline-flex items-center gap-2 rounded-full border border-pine-foreground/60 px-8 py-4 font-body font-medium text-sm text-pine-foreground hover:bg-pine-foreground/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pine-foreground/70"
            >
              {t("landing.pretexte.cta")} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {/* Illustration peinte des toits du quartier : frise large et
              discrète posée en bas du bloc, jamais devant le texte. */}
          <PaintedRooftops className="mt-[52px] md:mt-16" />
        </RevealSection>
      </div>
    </section>
  );
}
