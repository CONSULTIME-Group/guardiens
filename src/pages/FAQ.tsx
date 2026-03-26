import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import PageMeta from "@/components/PageMeta";
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
        title="FAQ — Questions fréquentes"
        description="Trouvez les réponses à toutes vos questions sur Guardiens : house-sitting, inscription, sécurité, tarifs et plus encore."
        path="/faq"
      />

      {entries.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      )}

      <div className="min-h-screen bg-background">
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
                          <AccordionContent className="text-muted-foreground leading-relaxed pb-5">
                            {entry.answer}
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </section>
                );
              })}
            </div>
          )}

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
      </div>
    </>
  );
};

export default FAQ;
