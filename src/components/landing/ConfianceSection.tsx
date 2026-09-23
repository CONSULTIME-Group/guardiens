import { useTranslation } from "react-i18next";
import { RevealSection } from "@/components/ui/RevealSection";
import AffinityDemoCard from "@/components/landing/AffinityDemoCard";

export function ConfianceSection() {
  const { t } = useTranslation();
  const pillars = [
    ["La proximité réelle", "Les dix personnes les plus proches reçoivent votre besoin, et la carte montre qui vit autour de vous."],
    ["La rencontre en personne", "Vous vous voyez avant toute garde. Après un coup de main, chacun confirme que la rencontre a eu lieu."],
  ["La confiance vérifiée", "Écusson « Identité vérifiée », avis laissés après chaque échange. Guardiens est gratuit pour les propriétaires."],
  ];

  return (
    <section id="confiance" className="bg-background py-[52px] md:py-20 scroll-mt-24" aria-labelledby="trust-heading">
      <div className="lp-wide">
        <RevealSection className="text-center max-w-3xl mx-auto mb-8 md:mb-16">
          <p className="text-xs md:text-[13px] tracking-[0.2em] uppercase text-primary font-body font-medium">
            Les repères essentiels
          </p>
          <h2 id="trust-heading" className="font-heading text-4xl md:text-5xl font-semibold text-foreground mt-4 leading-tight">
            Trois conditions pour se faire confiance
          </h2>
        </RevealSection>

        <div className="grid gap-6 md:grid-cols-3">
          {pillars.map(([title, text], index) => <RevealSection key={title} delay={0.1 + index * 0.1}><article className="h-full border-t border-border pt-5"><h3 className="font-heading text-xl font-semibold text-foreground">{title}</h3><p className="mt-3 text-sm leading-relaxed text-muted-foreground">{text}</p></article></RevealSection>)}
        </div>

        <RevealSection delay={0.4} className="mt-10">
          <article className="rounded-2xl border border-primary/25 bg-primary/5 p-[22px] md:p-[34px]">
            <div>
              <div className="flex items-center gap-3">
                <span aria-hidden="true" className="block h-6 w-[3px] rounded-full bg-terra" />
                <p className="text-[10px] md:text-xs tracking-[0.2em] uppercase text-terra font-body font-medium">L'affinité</p>
              </div>
              <h3 className="mt-[14px] font-heading text-2xl md:text-3xl font-semibold text-foreground">Votre gardien idéal, décrit par vous</h3>
              <p className="mt-[14px] text-foreground/75 leading-relaxed">Vous décrivez le gardien recherché : rythme de vie, présence, expérience avec vos animaux et mobilité. Le score d'affinité classe chaque candidature critère par critère. Vous voyez le détail du calcul et vous choisissez.</p>
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

      </div>
    </section>
  );
}
