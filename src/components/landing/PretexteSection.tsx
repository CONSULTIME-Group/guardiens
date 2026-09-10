import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { RevealSection } from "@/components/ui/RevealSection";
import { GrainOverlay } from "@/components/ui/GrainOverlay";
import rooftops1600 from "@/assets/landing/village-rooftops-1600.webp";
import rooftops800 from "@/assets/landing/village-rooftops-800.webp";
import { trackEvent } from "@/lib/analytics";
import { AssociationsTeaser } from "@/components/associations/AssociationsTeaser";

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
      <div className="relative lp-read pt-[52px] pb-0 md:pt-24">
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

          <div className="mx-auto mt-[52px] max-w-2xl">
            <AssociationsTeaser
              tone="dark"
              title="Soutenir une association près de chez vous"
              text="Refuges, sanctuaires, familles d'accueil : découvrez ce dont elles ont besoin aujourd'hui."
            />
          </div>
        </RevealSection>
      </div>

      {/* Illustration peinte des toits du quartier : accent fondu dans le
          fond, posé à ras du bord bas. */}
      <div className="relative mx-auto mt-7 md:mt-9 w-full max-w-[820px]">
        <img
          src={rooftops1600}
          srcSet={`${rooftops800} 800w, ${rooftops1600} 1600w`}
          sizes="(max-width: 819px) 100vw, 820px"
          alt="Illustration à la gouache d'une rangée de maisons de village aux toits de tuiles, quelques fenêtres allumées et un arbre."
          width={1600}
          height={415}
          loading="lazy"
          decoding="async"
          className="block w-full h-auto opacity-55 [mask-image:linear-gradient(to_right,transparent_0%,black_14%,black_86%,transparent_100%)] [-webkit-mask-image:linear-gradient(to_right,transparent_0%,black_14%,black_86%,transparent_100%)]"
        />
      </div>
    </section>
  );
}
