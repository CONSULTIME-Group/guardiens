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
import { trackEvent } from "@/lib/analytics";
import { useAuth } from "@/contexts/AuthContext";
import { homeCtaTarget, HOME_BTN_PRIMARY } from "@/components/landing/homeCta";

// Lot TAR1 (texte validé par Jérémie le 13 novembre) : la page dit pourquoi
// Guardiens est gratuit aujourd'hui, ce que coûte la plateforme, et qu'une
// contribution sera demandée plus tard aux membres satisfaits. Elle parle de
// tarifs : une seule phrase rappelle l'esprit du site.
const INTRO =
  "Sur Guardiens, la technologie sert à se rencontrer. Entre membres, tout s'échange en temps et en services : une garde de maison, une garde d'animaux, un coup de main, une sortie, une balade.";

const sections: Array<{ id: string; title: string; body: string }> = [
  {
    id: "pourquoi",
    title: "Pourquoi c'est gratuit",
    body: "Faire tourner Guardiens a un coût : serveurs, messagerie, emails, maintenance, développements, intelligence artificielle. Aujourd'hui, nous le prenons entièrement à notre charge, pour que la communauté grandisse librement.",
  },
  {
    id: "demain",
    title: "Et demain",
    body: "Plus la communauté grandit, mieux elle fonctionne pour chacun, et plus elle coûte à faire tourner. Le jour venu, nous demanderons une contribution aux membres satisfaits, pour faire vivre Guardiens et continuer à l'améliorer. Vous serez prévenus bien à l'avance.",
  },
  {
    id: "vrai",
    title: "Ce qui reste vrai",
    body: "Aucune commission sur les gardes. Vous restez libre à tout moment.",
  },
];

const faqItems: Array<{ id: string; q: string; a: string }> = [
  {
    id: "cout",
    q: "Combien coûte Guardiens ?",
    a: "Aujourd'hui, Guardiens est gratuit pour tous les membres.",
  },
  {
    id: "contribution",
    q: "Une contribution sera-t-elle demandée un jour ?",
    a: "Oui. Le jour venu, une contribution sera demandée aux membres satisfaits, pour faire vivre Guardiens et continuer à l'améliorer. Vous serez prévenus bien à l'avance.",
  },
  {
    id: "inclus",
    q: "Que comprend Guardiens ?",
    a: "Les annonces de garde, les candidatures, la messagerie, le guide de la maison, l'accord de garde, l'entraide et les sorties entre membres.",
  },
  {
    id: "commission",
    q: "Prenez-vous une commission ?",
    a: "Aucune commission n'est prélevée sur les gardes : l'échange se fait entre membres, en temps et en services.",
  },
];

const Pricing = () => {
  const { isAuthenticated } = useAuth();

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
        title="Guardiens est gratuit aujourd'hui : pourquoi, et demain | Guardiens"
        description="Guardiens est gratuit aujourd'hui pour tous les membres. Nous prenons ses coûts à notre charge. Une contribution sera demandée plus tard aux membres satisfaits."
        path="/tarifs"
      />
      <Head>
        <script type="application/ld+json">{JSON.stringify(faqJsonLd)}</script>
      </Head>

      <div className="min-h-screen bg-background">
        <PublicHeader />
        <PageBreadcrumb items={[{ label: "Tarifs" }]} />

        <main id="main-content" className="max-w-3xl mx-auto px-4 min-w-0">
          <section className="py-10 md:py-14 text-center">
            <h1 className="font-heading text-3xl md:text-5xl font-bold text-foreground leading-tight mb-4">
              Guardiens est gratuit aujourd'hui
            </h1>
            <p className="text-base md:text-lg font-body text-foreground/80 leading-relaxed">
              {INTRO}
            </p>
          </section>

          <Card className="border-2 border-primary/40">
            <CardContent className="p-6 md:p-10 space-y-8">
              {sections.map((section) => (
                <section key={section.id} aria-labelledby={`tarifs-${section.id}`}>
                  <h2
                    id={`tarifs-${section.id}`}
                    className="font-heading text-2xl md:text-3xl font-semibold mb-3"
                  >
                    {section.title}
                  </h2>
                  <p className="font-body text-base md:text-lg text-foreground/80 leading-relaxed">
                    {section.body}
                  </p>
                </section>
              ))}
              <p className="font-heading text-lg italic text-foreground/80 border-t pt-6">
                Jérémie et Elisa
              </p>
            </CardContent>
          </Card>

          <section className="py-10 text-center" aria-label="Commencer">
            <Link
              to={homeCtaTarget("/sits/create", isAuthenticated)}
              onClick={() =>
                trackEvent("pricing_cta_clicked", { metadata: { cta: "publier_annonce" } })
              }
              className={HOME_BTN_PRIMARY + " min-h-12"}
            >
              Publier mon annonce de garde
            </Link>
            {!isAuthenticated && (
              <p className="mt-4">
                <Link
                  to="/inscription?role=sitter"
                  onClick={() =>
                    trackEvent("pricing_cta_clicked", { metadata: { cta: "profil_gardien" } })
                  }
                  className="inline-flex min-h-11 items-center font-body text-sm font-semibold text-primary underline underline-offset-4"
                >
                  Créer mon profil de gardien
                </Link>
              </p>
            )}
          </section>

          <section className="pb-10 md:pb-14">
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
              Une question sur nos tarifs ?{" "}
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
