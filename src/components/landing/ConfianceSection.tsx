import { useTranslation } from "react-i18next";
import RevealOnScroll from "@/components/ui/RevealOnScroll";
import { RevealSection } from "@/components/ui/RevealSection";
import franceLocalNational from "@/assets/illustrations/france-local-national.webp";

export function ConfianceSection() {
  const { t } = useTranslation();

  return (
    <section id="confiance" className="bg-background py-10 md:py-20 scroll-mt-24" aria-labelledby="trust-heading">
      <div className="max-w-6xl mx-auto px-5 sm:px-6">
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Illustration France */}
          <RevealOnScroll from="left" className="relative order-2 lg:order-1 mx-auto w-full max-w-md lg:max-w-none group/illu">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10 rounded-3xl blur-2xl transition-opacity duration-500 group-hover/illu:opacity-80 opacity-60" aria-hidden="true" />
            <div className="relative bg-card/50 border border-border rounded-3xl p-4 sm:p-5 md:p-7 shadow-sm transition-all duration-500 group-hover/illu:shadow-lg group-hover/illu:-translate-y-0.5">
              <img
                src={franceLocalNational}
                alt="Illustration gouache d'une carte de France parsemée de points reliés, symbolisant le réseau de gardiens partout dans le pays."
                width={960}
                height={960}
                loading="lazy"
                decoding="async"
                sizes="(max-width: 640px) 90vw, (max-width: 1024px) 60vw, 480px"
                className="block w-full h-auto max-w-[420px] sm:max-w-[460px] lg:max-w-none mx-auto rounded-2xl transition-transform duration-700 ease-out group-hover/illu:scale-[1.02] motion-reduce:transition-none motion-reduce:transform-none"
                style={{ imageRendering: 'auto' }}
              />
            </div>
          </RevealOnScroll>

          {/* 4 piliers */}
          <RevealOnScroll from="right" delay={120} className="order-1 lg:order-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <article className="bg-card border border-border rounded-2xl p-6 transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 hover:border-primary/30 motion-reduce:transition-none motion-reduce:transform-none">
              <p className="text-xs tracking-widest uppercase text-primary/70 font-body">01</p>
              <h3 className="mt-3 font-heading font-semibold text-lg text-foreground">{t("landing.trust.p1_title")}</h3>
              <p className="mt-2 text-muted-foreground text-sm leading-relaxed">
                {t("landing.trust.p1_text")}
              </p>
            </article>

            <article className="bg-card border border-border rounded-2xl p-6 transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 hover:border-primary/30 motion-reduce:transition-none motion-reduce:transform-none">
              <p className="text-xs tracking-widest uppercase text-primary/70 font-body">02</p>
              <h3 className="mt-3 font-heading font-semibold text-lg text-foreground">{t("landing.trust.p2_title")}</h3>
              <p className="mt-2 text-muted-foreground text-sm leading-relaxed">
                {t("landing.trust.p2_text")}
              </p>
            </article>

            <article className="bg-card border border-border rounded-2xl p-6 transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 hover:border-primary/30 motion-reduce:transition-none motion-reduce:transform-none">
              <p className="text-xs tracking-widest uppercase text-primary/70 font-body">03</p>
              <h3 className="mt-3 font-heading font-semibold text-lg text-foreground">{t("landing.trust.p3_title")}</h3>
              <p className="mt-2 text-muted-foreground text-sm leading-relaxed">
                {t("landing.trust.p3_text")}
              </p>
            </article>

            <article className="bg-card border border-border rounded-2xl p-6 transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 hover:border-primary/30 motion-reduce:transition-none motion-reduce:transform-none">
              <p className="text-xs tracking-widest uppercase text-primary/70 font-body">04</p>
              <h3 className="mt-3 font-heading font-semibold text-lg text-foreground">{t("landing.trust.p4_title")}</h3>
              <p className="mt-2 text-muted-foreground text-sm leading-relaxed">
                {t("landing.trust.p4_text")}
              </p>
            </article>
          </RevealOnScroll>
        </div>
      </div>
    </section>
  );
}
