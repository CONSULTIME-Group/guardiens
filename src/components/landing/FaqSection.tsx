import { useTranslation } from "react-i18next";
import { RevealSection } from "@/components/ui/RevealSection";
import { useInternationalSitsCount } from "@/hooks/useInternationalSitsCount";
import { showInternationalFaq } from "@/components/landing/internationalPlacement";

export function FaqSection() {
  const { t } = useTranslation();
  const { count } = useInternationalSitsCount();

  // Sous le seuil, la vitrine internationale devient une question de FAQ.
  const listings =
    count > 0
      ? t(count === 1 ? "landing.faq.a9_count_one" : "landing.faq.a9_count_other", { count })
      : "";

  const items = [1, 2, 3, 4, 5, 6, 7, 8].map((n) => ({
    key: `q${n}`,
    question: t(`landing.faq.q${n}`),
    answer: t(`landing.faq.a${n}`),
  }));

  if (showInternationalFaq(count)) {
    items.push({
      key: "q9",
      question: t("landing.faq.q9"),
      answer: t("landing.faq.a9", { listings }).trim(),
    });
  }

  return (
    <section id="faq" className="py-10 md:py-20 bg-background scroll-mt-24" aria-labelledby="faq-heading">
      <div className="max-w-3xl mx-auto px-[5%] md:px-[8%]">
        <RevealSection>
          <h2 id="faq-heading" className="font-heading text-3xl md:text-4xl font-semibold text-foreground text-center mb-10 scroll-mt-24">
            {t("landing.faq.title")}
          </h2>
          <div className="space-y-6">
            {items.map((item) => (
              <article key={item.key} className="bg-card border border-border rounded-2xl p-6">
                <h3 className="font-heading text-lg font-semibold text-foreground mb-2">
                  {item.question}
                </h3>
                <p className="text-sm text-foreground/70 leading-relaxed">
                  {item.answer}
                </p>
              </article>
            ))}
          </div>
        </RevealSection>
      </div>
    </section>
  );
}
