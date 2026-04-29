import { useQuery } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";
import PageMeta from "@/components/PageMeta";
import PageBreadcrumb from "@/components/seo/PageBreadcrumb";
import PublicHeader from "@/components/layout/PublicHeader";
import PublicFooter from "@/components/layout/PublicFooter";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Link } from "react-router-dom";
import { HelpCircle } from "lucide-react";

interface FaqEntry {
  id: string;
  question: string;
  answer: string;
  category: string;
  sort_order: number;
  published: boolean;
}

const FAQ = () => {
  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["faq-entries"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("faq_entries" as any)
        .select("*")
        .eq("published", true)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as FaqEntry[];
    },
  });

  const categories = [...new Set(entries.map((e) => e.category))];

  const categoryLabels: Record<string, string> = {
    general: "Questions générales",
    owner: "Pour les propriétaires",
    sitter: "Pour les gardiens",
    security: "Sécurité & confiance",
    pricing: "Tarifs & abonnements",
    "Fonctionnement": "Fonctionnement",
    "Tarifs": "Tarifs & abonnements",
    "Avant la garde": "Avant la garde",
    "Pendant la garde": "Pendant la garde",
    "Confiance et sécurité": "Confiance & sécurité",
    "Gardien d'urgence": "Gardien d'urgence",
    "Petites missions": "Petites missions",
    "Mon compte": "Mon compte",
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: entries.map((e) => ({
      "@type": "Question",
      name: e.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: e.answer,
      },
    })),
  };

  return (
    <>
      <PageMeta
        title="FAQ Guardiens — Toutes vos questions"
        description="Toutes vos questions sur Guardiens — abonnement gardien, accès propriétaire à 0 € à vie, parrainage et petites missions d'entraide."
        path="/faq"
      />

      {entries.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      )}

      <div className="min-h-screen bg-background">
        <PublicHeader />
        <PageBreadcrumb items={[{ label: "FAQ" }]} />
        <header className="bg-primary/5 border-b border-border">
          <div className="max-w-3xl mx-auto px-4 py-12 sm:py-16 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-6">
              <HelpCircle className="h-7 w-7 text-primary" />
            </div>
            <h1 className="font-heading text-3xl sm:text-4xl font-bold text-foreground mb-3">
              Questions fréquentes
            </h1>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              Tout ce que vous devez savoir sur le house-sitting avec Guardiens.
            </p>
          </div>
        </header>

        <main className="max-w-3xl mx-auto px-4 py-10 sm:py-14">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
              ))}
            </div>
          ) : entries.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">
              Aucune question pour le moment.
            </p>
          ) : (
            <div className="space-y-10">
              {categories.map((cat) => {
                const catEntries = entries.filter((e) => e.category === cat);
                return (
                  <section key={cat}>
                    <h2 className="font-heading text-xl font-semibold text-foreground mb-4">
                      {categoryLabels[cat] || cat}
                    </h2>
                    <Accordion type="multiple" className="space-y-2">
                      {catEntries.map((entry) => (
                        <AccordionItem
                          key={entry.id}
                          value={entry.id}
                          className="border border-border rounded-lg px-5 data-[state=open]:bg-accent/30"
                        >
                          <AccordionTrigger className="text-left font-medium text-foreground hover:no-underline py-4">
                            {entry.question}
                          </AccordionTrigger>
                          <AccordionContent className="leading-relaxed pb-5">
                            <ReactMarkdown
                              components={{
                                p: ({ children }) => (
                                  <p className="mb-3 text-sm text-muted-foreground leading-relaxed last:mb-0">
                                    {children}
                                  </p>
                                ),
                                strong: ({ children }) => (
                                  <strong className="font-semibold text-foreground">{children}</strong>
                                ),
                                a: ({ href, children }) => {
                                  const isExternal = href?.startsWith("http");
                                  return (
                                    <a
                                      href={href}
                                      className="text-primary underline hover:text-primary/80 transition-colors"
                                      {...(isExternal ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                                    >
                                      {children}
                                    </a>
                                  );
                                },
                                ul: ({ children }) => (
                                  <ul className="list-disc pl-4 mb-3 space-y-1 text-sm text-muted-foreground">{children}</ul>
                                ),
                                li: ({ children }) => (
                                  <li className="leading-relaxed">{children}</li>
                                ),
                              }}
                            >
                              {entry.answer}
                            </ReactMarkdown>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </section>
                );
              })}
            </div>
          )}

          <div className="mt-10 rounded-xl border border-primary/20 bg-primary/5 p-6 text-center">
            <p className="font-heading font-semibold text-foreground mb-1">Tout savoir sur nos tarifs</p>
            <p className="text-sm text-muted-foreground mb-4">6,99 €/mois pour les gardiens, 0 € à vie pour les propriétaires. Découvrez les trois formules en détail.</p>
            <Link
              to="/actualites/nouveaux-tarifs-2026"
              className="inline-flex items-center justify-center rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Lire l'article tarifs 2026
            </Link>
          </div>

          <div className="mt-14 text-center border-t border-border pt-10">
            <p className="text-muted-foreground mb-4">
              Vous ne trouvez pas la réponse à votre question ?
            </p>
            <Link
              to="/contact"
              className="inline-flex items-center justify-center rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Contactez-nous
            </Link>
          </div>
        </main>

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "BreadcrumbList",
              itemListElement: [
                { "@type": "ListItem", position: 1, name: "Guardiens", item: "https://guardiens.fr" },
                { "@type": "ListItem", position: 2, name: "FAQ", item: "https://guardiens.fr/faq" },
              ],
            }),
          }}
        />
        <PublicFooter />
      </div>
    </>
  );
};

export default FAQ;
