import { useEffect } from "react";
import Head from "@/components/seo/Head";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import PageMeta from "@/components/PageMeta";
import PageBreadcrumb from "@/components/seo/PageBreadcrumb";
import PublicHeader from "@/components/layout/PublicHeader";
import PublicFooter from "@/components/layout/PublicFooter";
import { getPricingBaseline, getPricingBaselineShort } from "@/lib/pricing";
import { trackEvent } from "@/lib/analytics";

const bullets = [
  "Annonces de garde, candidatures et messagerie pour tous les membres",
  "Guide de la maison, accord de garde et entraide inclus",
  "Une adresse email suffit pour commencer",
];

const faqItems: Array<{ id: string; q: string; a: string }> = [
  {
    id: "cout",
    q: "Combien coûte Guardiens ?",
    a: "Guardiens est gratuit, pour tous les membres.",
  },
  {
    id: "inclus",
    q: "Que comprend Guardiens ?",
    a: "Les annonces de garde, les candidatures, la messagerie, le guide de la maison, l'accord de garde et l'entraide entre membres.",
  },
  {
    id: "commission",
    q: "Prenez-vous une commission ?",
    a: "Aucune commission n'est prélevée sur les gardes.",
  },
];

const Pricing = () => {
  useEffect(() => {
    trackEvent("pricing_baseline_seen", { metadata: { surface: "tarifs" } });
  }, []);

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };

  return (
    <>
      <PageMeta
        title="Guardiens est gratuit : nos engagements | Guardiens"
        description="Guardiens est gratuit pour tous les membres : annonces, candidatures, messagerie et entraide. Aucune commission sur les gardes."
        path="/tarifs"
      />
      <Head>
        <script type="application/ld+json">{JSON.stringify(faqJsonLd)}</script>
      </Head>

      <div className="min-h-screen bg-background">
        <PublicHeader />
        <PageBreadcrumb items={[{ label: "Nos engagements" }]} />

        <main id="main-content" className="max-w-3xl mx-auto px-4 min-w-0">
          <section className="py-10 md:py-14 text-center">
            <h1 className="font-heading text-3xl md:text-5xl font-bold text-foreground leading-tight mb-4">
              Guardiens est gratuit
            </h1>
            <p className="text-base md:text-lg font-body text-foreground/70 leading-relaxed">
              {getPricingBaselineShort()}
            </p>
          </section>

          <Card className="border-2 border-primary/40">
            <CardContent className="p-6 md:p-10">
              <h2 className="font-heading text-2xl md:text-3xl font-semibold mb-4">
                Nos engagements
              </h2>
              <p className="font-body text-base md:text-lg text-foreground/80 leading-relaxed mb-6">
                {getPricingBaseline()}
              </p>
              <ul className="font-body space-y-2 mb-6">
                {bullets.map((b) => (
                  <li key={b} className="flex items-start gap-2">
                    <span aria-hidden className="text-primary mt-0.5 shrink-0">·</span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
              <p className="font-body text-sm text-foreground/60 border-t pt-4">
                Aucune commission n'est prélevée sur les gardes : l'échange se fait entre membres, en temps et en services.
              </p>
            </CardContent>
          </Card>

          <section className="py-10 md:py-14">
            <h2 className="font-heading text-2xl md:text-3xl font-semibold mb-6">
              Questions fréquentes
            </h2>
            <Accordion type="single" collapsible className="w-full">
              {faqItems.map((item) => (
                <AccordionItem key={item.id} value={item.id}>
                  <AccordionTrigger
                    onClick={() =>
                      trackEvent("pricing_faq_expanded", { metadata: { question_id: item.id } })
                    }
                    className="font-body text-left"
                  >
                    {item.q}
                  </AccordionTrigger>
                  <AccordionContent className="font-body text-foreground/75">
                    {item.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </section>

          <section className="pb-14 text-center">
            <p className="font-body text-sm text-foreground/60">
              Une question sur nos engagements ?{" "}
              <Link to="/contact" className="text-primary hover:underline">
                Écrivez-nous
              </Link>
              .
            </p>
          </section>
        </main>

        <PublicFooter />
      </div>
    </>
  );
};

export default Pricing;
