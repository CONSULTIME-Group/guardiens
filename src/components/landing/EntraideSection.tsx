import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { RevealSection } from "@/components/ui/RevealSection";

export function EntraideSection() {
  const { t } = useTranslation();

  return (
    <section id="entraide" className="py-10 md:py-20 bg-accent scroll-mt-24">
      <div className="max-w-5xl mx-auto px-6">
        <RevealSection>
          <span className="text-xs tracking-widest uppercase text-primary font-body mb-4 block text-center">
            {t("landing.aid.eyebrow")}
          </span>
          <h2 id="osez-l-entraide" className="text-2xl md:text-5xl font-heading font-semibold leading-snug text-foreground text-center mb-6 scroll-mt-24">
            {t("landing.aid.title")}
          </h2>
          <p className="text-center text-foreground/70 font-body max-w-2xl mx-auto mb-4 text-lg leading-relaxed">
            {t("landing.aid.p1")}
          </p>
          <p className="text-center text-foreground/70 font-body max-w-2xl mx-auto mb-8 md:mb-16 text-lg leading-relaxed">
            {t("landing.aid.p2")}
          </p>
        </RevealSection>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <RevealSection delay={0.1}>
            <div className="bg-card rounded-2xl p-5 md:p-8 shadow-sm h-full">
              <h3 className="text-xl font-heading font-semibold text-foreground mb-3">
                {t("landing.aid.need_title")}
              </h3>
              <p className="text-base font-body leading-relaxed text-foreground/70 mb-4">
                {t("landing.aid.need_text")}
              </p>
              <p className="text-sm font-body font-medium text-primary">
                {t("landing.aid.need_footer")}
              </p>
            </div>
          </RevealSection>

          <RevealSection delay={0.2}>
            <div className="bg-card rounded-2xl p-5 md:p-8 shadow-sm h-full">
              <h3 className="text-xl font-heading font-semibold text-foreground mb-3">
                {t("landing.aid.offer_title")}
              </h3>
              <p className="text-base font-body leading-relaxed text-foreground/70 mb-4">
                {t("landing.aid.offer_text")}
              </p>
              <p className="text-sm font-body font-medium text-primary">
                {t("landing.aid.offer_footer")}
              </p>
            </div>
          </RevealSection>
        </div>

        <RevealSection delay={0.25} className="mt-16">
          <p className="text-center text-xs tracking-widest uppercase text-primary font-body mb-6">
            {t("landing.aid.seen_this_week")}
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 max-w-5xl mx-auto">
            {[
              "water_plants",
              "small_diy",
              "garden_pruning",
              "bread_class",
              "reiki",
              "parcel",
              "carpool",
              "seedlings",
              "coffee_listen",
              "groceries",
              "moving_help",
              "sewing",
            ].map((key) => (
              <div
                key={key}
                className="flex items-center justify-center text-center bg-card rounded-xl px-3 py-4 border border-border/60 hover:border-primary/40 hover:shadow-sm transition-all min-h-[64px]"
              >
                <span className="text-xs font-body text-foreground/80 leading-tight">{t(`landing.aid.examples.${key}`)}</span>
              </div>
            ))}
          </div>
        </RevealSection>

        <RevealSection delay={0.3} className="text-center mt-12">
          <div className="border-l-4 border-primary pl-6 max-w-xl mx-auto text-left mb-10">
            <p className="text-xl md:text-2xl font-heading font-semibold italic text-foreground leading-snug">
              {t("landing.aid.quote")}
            </p>
          </div>
          <Link
            to="/petites-missions"
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-8 py-4 rounded-full font-body font-medium text-sm hover:bg-primary/90 transition-colors"
          >
            {t("landing.aid.cta")} <ArrowRight className="h-4 w-4" />
          </Link>
        </RevealSection>
      </div>
    </section>
  );
}
