import { useTranslation } from "react-i18next";
import { RevealSection } from "@/components/ui/RevealSection";
import { useInternationalSitsCount } from "@/hooks/useInternationalSitsCount";
import { showInternationalFaq } from "@/components/landing/internationalPlacement";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

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

  const featuredKeys = new Set(["q1", "q2", "q3", "q5", "q8", "q9"]);
  const featured = items.filter((item) => featuredKeys.has(item.key));
  const additional = items.filter((item) => !featuredKeys.has(item.key));

  const renderItem = (item: (typeof items)[number]) => (
    <article key={item.key} className="rounded-lg border border-border bg-card p-6">
      <h3 className="mb-2 font-heading text-lg font-semibold text-foreground">{item.question}</h3>
      <p className="text-sm leading-relaxed text-foreground/70">{item.answer}</p>
    </article>
  );

  return (
    <section id="faq" className="py-[52px] md:py-20 bg-background scroll-mt-24" aria-labelledby="faq-heading">
      <div className="lp-read">
        <RevealSection>
          <p className="mb-4 text-center text-xs font-medium uppercase tracking-[0.2em] text-primary">Pour aller plus loin</p>
          <h2 id="faq-heading" className="font-heading text-3xl md:text-4xl font-semibold text-foreground text-center mb-10 scroll-mt-24">
            {t("landing.faq.title")}
          </h2>
          <div className="space-y-4">{featured.map(renderItem)}</div>
          {additional.length > 0 && (
            <Accordion type="single" collapsible className="mt-4">
              <AccordionItem value="all-questions" className="rounded-lg border border-border bg-card px-5">
                <AccordionTrigger className="text-base font-semibold text-foreground hover:no-underline">Voir toutes les questions</AccordionTrigger>
                <AccordionContent forceMount className="space-y-4 data-[state=closed]:hidden">
                  {additional.map(renderItem)}
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          )}
        </RevealSection>
      </div>
    </section>
  );
}
