import { useTranslation } from "react-i18next";
import { RevealSection } from "@/components/ui/RevealSection";
import AffinityDemoCard from "@/components/landing/AffinityDemoCard";

export function ConfianceSection() {
  const { t } = useTranslation();

  return (
    <section id="confiance" className="bg-background py-[52px] md:py-20 scroll-mt-24" aria-labelledby="trust-heading">
      <div className="lp-wide">
        <RevealSection className="text-center max-w-3xl mx-auto mb-8 md:mb-16">
          <p className="text-xs md:text-[13px] tracking-[0.2em] uppercase text-primary font-body font-medium">
            {t("landing.trust.eyebrow")}
          </p>
          <h2 id="trust-heading" className="font-heading text-4xl md:text-5xl font-semibold text-foreground mt-4 leading-tight">
            {t("landing.trust.title")}
          </h2>
          <p className="text-base md:text-lg text-muted-foreground mt-5 leading-relaxed">
            {t("landing.trust.lede")}
          </p>
        </RevealSection>

        <RevealSection delay={0.1}>
          <article className="rounded-2xl border border-primary/25 bg-primary/5 p-[22px] md:p-[34px]">
            <div>
              <div className="flex items-center gap-3">
                <span aria-hidden="true" className="block h-6 w-[3px] rounded-full bg-terra" />
                <p className="text-[10px] md:text-xs tracking-[0.2em] uppercase text-terra font-body font-medium">{t("landing.trust.main_label")}</p>
              </div>
              <h3 className="mt-[14px] font-heading text-2xl md:text-3xl font-semibold text-foreground">{t("landing.trust.p1_title")}</h3>
              <p className="mt-[14px] text-foreground/75 leading-relaxed">{t("landing.trust.p1_text")}</p>
              <div className="mt-[22px] grid grid-cols-2 md:grid-cols-3 gap-2" aria-label={t("landing.trust.examples_label")}>
                {["couple", "retiree", "family", "active", "home", "vehicle"].map((example) => (
                  <span key={example} className="flex min-h-[44px] items-center justify-center rounded-full border border-primary/20 bg-background px-3 py-2 text-center text-sm text-foreground/80">
                    {t(`landing.trust.examples.${example}`)}
                  </span>
                ))}
              </div>
            </div>
            <AffinityDemoCard />
          </article>
        </RevealSection>

        <div className="mt-[22px] grid grid-cols-1 md:grid-cols-2 gap-[22px]">
          {[2, 3].map((pillar, index) => (
            <RevealSection key={pillar} delay={0.2 + index * 0.1}>
              <article className="h-full border-t border-border px-1 pt-[22px]">
                <h3 className="font-heading font-semibold text-xl text-foreground">{t(`landing.trust.p${pillar}_title`)}</h3>
                <p className="mt-[14px] text-muted-foreground text-sm leading-relaxed">{t(`landing.trust.p${pillar}_text`)}</p>
              </article>
            </RevealSection>
          ))}
        </div>
      </div>
    </section>
  );
}
