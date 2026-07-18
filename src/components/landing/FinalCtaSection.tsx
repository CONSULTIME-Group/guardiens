import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { trackEvent } from "@/lib/analytics";
import { RevealSection } from "@/components/ui/RevealSection";

export function FinalCtaSection() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <section id="commencer" className="py-10 md:py-20 bg-primary scroll-mt-24">
      <RevealSection className="max-w-2xl mx-auto px-6 text-center">
        {/* Chips "Programme Fondateur" retirés (signal de deadline implicite). */}
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
            className="font-body text-xs font-medium tracking-wide rounded-full px-6 py-2.5 bg-transparent text-white/85 border border-white/30 hover:bg-white/10 hover:text-white transition-all duration-200"
          >
            {t("landing.final.cta_sitter")}
          </button>
        </div>
        <p className="text-xs text-white/70 font-body">
          {t("landing.final.footnote")}
        </p>
      </RevealSection>
    </section>
  );
}
