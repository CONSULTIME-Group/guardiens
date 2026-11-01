import { useTranslation } from "@/i18n/react";
import { useNavigate } from "react-router-dom";
import { trackEvent } from "@/lib/analytics";
import { RevealSection } from "@/components/ui/RevealSection";
import { useAuth } from "@/contexts/AuthContext";
import { HOME_BTN_PRIMARY, HOME_BTN_SECONDARY, homeCtaTarget } from "@/components/landing/homeCta";
import maison900 from "@/assets/aquarelles/final-arrivee-900.webp";
import maison450 from "@/assets/aquarelles/final-arrivee-450.webp";

export function FinalCtaSection() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  return (
    <div id="commencer" className="bg-background py-[52px] scroll-mt-24 md:py-20">
      <RevealSection className="lp-read text-center">
        {/* Chips "Programme Fondateur" retirés (signal de deadline implicite). */}
        {/* Aquarelle au-dessus du titre : une arrivée, un chien sur le seuil. */}
        <img
          src={maison900}
          srcSet={`${maison450} 450w, ${maison900} 900w`}
          sizes="(max-width: 767px) 180px, 220px"
          alt="Aquarelle d'une personne qui arrive devant une maison de village, un chien vient l'accueillir sur le seuil."
          width={900}
          height={890}
          loading="lazy"
          decoding="async"
          className="mx-auto mb-5 md:mb-6 block w-[180px] md:w-[220px] h-auto"
        />
        <p className="mb-4 text-xs font-medium uppercase tracking-[0.2em] text-primary">À vous de commencer</p>
        <h2 className="mb-6 font-heading text-3xl font-semibold leading-tight text-foreground md:text-5xl">
          {t("landing.final.title")}
        </h2>
        <p className="mx-auto mb-10 max-w-lg font-body text-lg leading-relaxed text-muted-foreground">
          {t("landing.final.lede")}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
          <button
            onClick={() => {
              trackEvent("cta_proprio_clicked", { metadata: { location: "final_cta" } });
              navigate(homeCtaTarget("/sits/create", isAuthenticated));
            }}
            className={HOME_BTN_PRIMARY}
          >
            {t("landing.final.cta_owner")}
          </button>
          <button
            onClick={() => {
              trackEvent("cta_aid_clicked", { metadata: { location: "final_cta" } });
              navigate(homeCtaTarget("/petites-missions/creer", isAuthenticated));
            }}
            className={HOME_BTN_SECONDARY}
          >
            {t("landing.final.cta_sitter")}
          </button>
        </div>
        {!isAuthenticated && (
          <p className="font-body text-xs text-muted-foreground">
            {t("landing.final.footnote")}
          </p>
        )}
      </RevealSection>
    </div>
  );
}
