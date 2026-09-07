import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { trackEvent } from "@/lib/analytics";
import { RevealSection } from "@/components/ui/RevealSection";
import maison900 from "@/assets/landing/maison-seule-900.webp";
import maison450 from "@/assets/landing/maison-seule-450.webp";

export function FinalCtaSection() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <section id="commencer" className="py-[52px] md:py-20 bg-primary scroll-mt-24">
      <RevealSection className="lp-read text-center">
        {/* Chips "Programme Fondateur" retirés (signal de deadline implicite). */}
        {/* Maison peinte au-dessus du titre : le foyer confié. */}
        <img
          src={maison900}
          srcSet={`${maison450} 450w, ${maison900} 900w`}
          sizes="(max-width: 767px) 110px, 140px"
          alt="Illustration à la gouache d'une maison de village aux volets clairs, une fenêtre allumée et un buisson près de la porte."
          width={900}
          height={773}
          loading="lazy"
          decoding="async"
          className="mx-auto mb-5 md:mb-6 block w-[110px] md:w-[140px] h-auto opacity-85 [mask-image:linear-gradient(to_bottom,black_78%,transparent_100%)] [-webkit-mask-image:linear-gradient(to_bottom,black_78%,transparent_100%)]"
        />
        <h2 className="font-heading text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-[1.1] mb-6">
          {t("landing.final.title")}
        </h2>
        <p className="font-body text-lg text-white/85 leading-relaxed max-w-lg mx-auto mb-10">
          {t("landing.final.lede")}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
          <button
            onClick={() => {
              trackEvent("cta_proprio_clicked", { metadata: { location: "final_cta" } });
              navigate("/inscription?role=owner");
            }}
            className="font-body text-sm font-bold tracking-wide rounded-full px-10 py-4 bg-white text-primary hover:bg-background hover:scale-[1.02] transition-all duration-200"
          >
            {t("landing.final.cta_owner")}
          </button>
          <button
            onClick={() => {
              trackEvent("cta_sitter_clicked", { metadata: { location: "final_cta" } });
              navigate("/inscription?role=sitter");
            }}
            className="inline-flex items-center justify-center min-h-[44px] font-body text-xs font-medium tracking-wide rounded-full px-6 py-2.5 bg-transparent text-white/85 border border-white/30 hover:bg-white/10 hover:text-white transition-all duration-200"
          >
            {t("landing.final.cta_sitter")}
          </button>
        </div>
        <p className="text-xs text-white/85 font-body">
          {t("landing.final.footnote")}
        </p>
      </RevealSection>
    </section>
  );
}
