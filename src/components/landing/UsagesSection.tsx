import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { RevealSection } from "@/components/ui/RevealSection";

export function UsagesSection() {
  const { t } = useTranslation();

  return (
    <section id="usages" className="py-10 md:py-20 bg-background scroll-mt-24">
      <div className="max-w-5xl mx-auto px-6">
        <div id="definition" className="max-w-3xl mb-10 md:mb-14 scroll-mt-24">
          <h2 className="font-heading text-xl md:text-2xl font-semibold text-foreground mb-3">
            {t("landing.what_is.title")}
          </h2>
          <p className="font-body text-base md:text-lg text-foreground/80 leading-relaxed">
            {t("landing.what_is.body")}
          </p>
        </div>
        <RevealSection>
          <span className="text-xs tracking-widest uppercase text-primary font-body mb-4 block text-center">
            {t("landing.usages.eyebrow")}
          </span>
          <h2 id="garde-et-entraide" className="text-2xl md:text-5xl font-heading font-semibold leading-snug text-foreground text-center mb-3 scroll-mt-24">
            {t("landing.usages.title")}
          </h2>
          <p className="text-center text-foreground/60 font-body max-w-2xl mx-auto mb-8 md:mb-16 italic">
            {t("landing.usages.lede")}
          </p>
        </RevealSection>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <RevealSection delay={0.1}>
            <div className="bg-card rounded-2xl p-5 md:p-8 shadow-sm text-left h-full">
              <p className="text-xs tracking-widest uppercase text-primary font-body mb-3">{t("landing.usages.owner.tag")}</p>
              <h3 className="text-xl font-heading font-semibold text-foreground mb-3">{t("landing.usages.owner.title")}</h3>
              <p className="text-base font-body leading-relaxed text-foreground/70 mb-4">
                {t("landing.usages.owner.text")}
              </p>
              <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-body font-medium mb-4">
                {t("landing.usages.owner.badge")}
              </span>
              <Link to="/inscription?role=owner" className="block text-sm font-body text-primary font-medium hover:underline">
                {t("landing.usages.owner.cta")}
              </Link>
            </div>
          </RevealSection>

          <RevealSection delay={0.2}>
            <div className="bg-card rounded-2xl p-5 md:p-8 shadow-sm text-left h-full">
              <p className="text-xs tracking-widest uppercase text-primary font-body mb-3">{t("landing.usages.sitter.tag")}</p>
              <h3 className="text-xl font-heading font-semibold text-foreground mb-3">{t("landing.usages.sitter.title")}</h3>
              <p className="text-base font-body leading-relaxed text-foreground/70 mb-4">
                {t("landing.usages.sitter.text")}
              </p>
              <Link to="/inscription?role=sitter" className="text-sm font-body text-muted-foreground font-medium hover:text-primary hover:underline">
                {t("landing.usages.sitter.cta")}
              </Link>
            </div>
          </RevealSection>

          <RevealSection delay={0.3}>
            <div className="bg-card rounded-2xl p-5 md:p-8 shadow-sm text-left h-full border-2 border-primary/20 relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-[10px] font-body font-bold uppercase tracking-wider px-3 py-1 rounded-bl-lg">
                {t("landing.usages.mutual.badge")}
              </div>
              <p className="text-xs tracking-widest uppercase text-primary font-body mb-3">{t("landing.usages.mutual.tag")}</p>
              <h3 className="text-xl font-heading font-semibold text-foreground mb-3">{t("landing.usages.mutual.title")}</h3>
              <p className="text-base font-body leading-relaxed text-foreground/70 mb-4">
                {t("landing.usages.mutual.text")}
              </p>
              <a href="#entraide" className="text-sm font-body text-primary font-medium hover:underline">
                {t("landing.usages.mutual.cta")}
              </a>
            </div>
          </RevealSection>
        </div>

        <RevealSection delay={0.4}>
          <div className="mt-10 bg-accent/40 border border-accent rounded-2xl p-6 md:p-7 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p className="text-xs tracking-widest uppercase text-foreground/75 font-body mb-1">{t("landing.usages.urgency.eyebrow")}</p>
              <h3 className="text-lg font-heading font-semibold text-foreground">{t("landing.usages.urgency.title")}</h3>
              <p className="text-sm font-body text-foreground/70 mt-1">
                {t("landing.usages.urgency.text")}
              </p>
            </div>
            <Link
              to="/gardien-urgence"
              className="shrink-0 inline-flex items-center justify-center px-5 py-2.5 rounded-full bg-foreground text-background font-body font-medium text-sm hover:bg-foreground/90 transition-colors"
            >
              {t("landing.usages.urgency.cta")}
            </Link>
          </div>
        </RevealSection>
      </div>
    </section>
  );
}
