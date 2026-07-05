import { useEffect } from "react";
import { Helmet } from "react-helmet-async";
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
  "Accès à toutes les fonctionnalités",
  "Aucune limite d'usage",
  "Aucun engagement, aucune carte bancaire requise",
];

const faqItems: Array<{ id: string; q: string; a: string }> = [
  {
    id: "cout",
    q: "Combien coûte Guardiens ?",
    a: "Gratuit aujourd'hui. Nous facturerons quand le service aura atteint le niveau que nous voulons vous offrir. Vous serez informé à l'avance.",
  },
  {
    id: "pourquoi",
    q: "Pourquoi c'est gratuit maintenant ?",
    a: "Parce que nous ne facturons pas un produit dont nous ne sommes pas encore pleinement satisfaits. Nous vous laissons découvrir Guardiens et grandir avec nous.",
  },
  {
    id: "quand",
    q: "Quand la facturation commencera-t-elle ?",
    a: "Nous ne fixons pas de date. Nous préviendrons chaque membre 30 jours à l'avance quand ce sera le cas.",
  },
  {
    id: "commission",
    q: "Prendrez-vous une commission ?",
    a: "Non. Aucune commission n'est prélevée sur les gardes. Aucune transaction n'est facilitée directement entre membres.",
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
        title="Nos engagements de service | Guardiens"
        description="Guardiens reste gratuit tant que nous ne sommes pas satisfaits du service. Accès complet, sans engagement, sans carte bancaire."
        path="/tarifs"
      />
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(faqJsonLd)}</script>
      </Helmet>

      <div className="min-h-screen bg-background">
        <PublicHeader />
        <PageBreadcrumb items={[{ label: "Nos engagements" }]} />

        <main className="max-w-3xl mx-auto px-4 min-w-0">
          <section className="py-10 md:py-14 text-center">
            <h1 className="font-heading text-3xl md:text-5xl font-bold text-foreground leading-tight mb-4">
              Nos engagements de service
            </h1>
            <p className="text-base md:text-lg font-body text-foreground/70 leading-relaxed">
              {getPricingBaselineShort()}
            </p>
          </section>

          <Card className="border-2 border-primary/40">
            <CardContent className="p-6 md:p-10">
              <h2 className="font-heading text-2xl md:text-3xl font-semibold mb-4">
                Guardiens reste gratuit aujourd'hui
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
                Nous facturerons quand nous serons prêts à proposer un service qui vaut d'être payé.
                Vous serez informé par email 30 jours à l'avance.
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
                      trackEvent("pricing_faq_expanded", { question_id: item.id })
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
