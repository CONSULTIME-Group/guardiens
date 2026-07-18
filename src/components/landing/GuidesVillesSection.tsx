import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { RevealSection } from "@/components/ui/RevealSection";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { guideLinks, cityLinks } from "@/data/homeGuidesCities";

export function GuidesVillesSection() {
  const { t } = useTranslation();

  return (
    <section id="guides-villes" className="py-10 md:py-20 bg-background scroll-mt-24">
      <div className="max-w-6xl mx-auto px-6">
        <RevealSection className="text-center mb-14">
          <span className="text-xs tracking-widest uppercase text-primary/60 font-body mb-4 block">
            {t("landing.cities.eyebrow")}
          </span>
          <h2 id="house-sitting-pres-de-chez-vous" className="font-heading text-4xl md:text-5xl font-semibold text-foreground leading-snug mb-4 scroll-mt-24">
            {t("landing.cities.title")}
          </h2>
          <p className="text-lg font-body text-foreground/70 max-w-2xl mx-auto">
            {t("landing.cities.lede")}
          </p>
        </RevealSection>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          {/* Colonne Guides */}
          <RevealSection delay={0.1}>
            <div className="rounded-2xl bg-card border border-border p-8 h-full">
              <p className="text-xs tracking-widest uppercase text-primary/70 font-body mb-2">{t("landing.cities.guides_tag")}</p>
              <h3 className="font-heading text-2xl font-semibold text-foreground mb-6">
                {t("landing.cities.guides_title")}
              </h3>
              <ul className="space-y-3">
                {guideLinks.map((e) => (
                  <li key={e.to}>
                    <Link
                      to={e.to}
                      className="group flex items-start gap-2 text-foreground hover:text-primary transition-colors"
                    >
                      <ArrowRight className="h-4 w-4 mt-1 shrink-0 text-primary/60 group-hover:translate-x-0.5 transition-transform" />
                      <span className="text-sm leading-relaxed">{t(e.labelKey)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
              <div className="mt-6 pt-6 border-t border-border flex flex-col sm:flex-row gap-3">
                <Button asChild variant="outline" size="sm" className="rounded-full">
                  <Link to="/actualites">{t("landing.cities.all_articles")}</Link>
                </Button>
                <Button asChild variant="outline" size="sm" className="rounded-full">
                  <Link to="/guides">{t("landing.cities.all_guides")}</Link>
                </Button>
              </div>
            </div>
          </RevealSection>

          {/* Colonne Villes */}
          <RevealSection delay={0.2}>
            <div className="rounded-2xl bg-card border border-border p-8 h-full">
              <p className="text-xs tracking-widest uppercase text-primary/70 font-body mb-2">{t("landing.cities.cities_tag")}</p>
              <h3 className="font-heading text-2xl font-semibold text-foreground mb-6">
                {t("landing.cities.cities_title")}
              </h3>
              <ul className="space-y-3">
                {cityLinks.map((e) => (
                  <li key={e.to}>
                    <Link
                      to={e.to}
                      className="group flex items-start gap-2 text-foreground hover:text-primary transition-colors"
                    >
                      <ArrowRight className="h-4 w-4 mt-1 shrink-0 text-primary/60 group-hover:translate-x-0.5 transition-transform" />
                      <span className="text-sm leading-relaxed">
                        <strong>{t(e.labelKey)}</strong>. {t(e.descKey)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
              <div className="mt-6 pt-6 border-t border-border flex flex-col sm:flex-row gap-3 items-start">
                <Button asChild variant="outline" size="sm" className="rounded-full">
                  <Link to="/annonces">{t("landing.guides_cities.all_listings")}</Link>
                </Button>
                <p className="text-xs text-foreground/60 leading-relaxed flex-1">
                  {t("landing.cities.cities_footer")}
                </p>
              </div>
            </div>
          </RevealSection>
        </div>

      </div>
    </section>
  );
}
