import { useTranslation } from "react-i18next";
import { RevealSection } from "@/components/ui/RevealSection";

export function FaqSection() {
  const { t } = useTranslation();

  return (
    <section id="faq" className="py-10 md:py-20 bg-background scroll-mt-24" aria-labelledby="faq-heading">
      <div className="max-w-3xl mx-auto px-[5%] md:px-[8%]">
        <RevealSection>
          <h2 id="faq-heading" className="font-heading text-3xl md:text-4xl font-semibold text-foreground text-center mb-10 scroll-mt-24">
            {t("landing.faq.title")}
          </h2>
          <div className="space-y-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
              <article key={n} className="bg-card border border-border rounded-2xl p-6">
                <h3 className="font-heading text-lg font-semibold text-foreground mb-2">
                  {t(`landing.faq.q${n}`)}
                </h3>
                <p className="text-sm text-foreground/70 leading-relaxed">
                  {t(`landing.faq.a${n}`)}
                </p>
              </article>
            ))}
          </div>
        </RevealSection>
      </div>
    </section>
  );
}
