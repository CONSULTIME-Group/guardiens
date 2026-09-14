import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import PageMeta from "@/components/PageMeta";
import PageBreadcrumb from "@/components/seo/PageBreadcrumb";
import { Button } from "@/components/ui/button";
import SearchListingCard from "@/components/search/listing/SearchListingCard";

const ARTICLE_URL = "/actualites/chantier-participatif-projet-collectif-cadre-legal";

const ProjetsListing = () => {
  const [projets, setProjets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await (supabase as any)
        .from("public_small_missions")
        .select("*")
        .eq("category", "projet")
        .eq("status", "open")
        .order("created_at", { ascending: false })
        .limit(60);
      setProjets((data || []) as any[]);
      setLoading(false);
    };
    void load();
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PageMeta
        title="Projets participatifs, apprendre en donnant un coup de main"
        description="Des particuliers ouvrent leur terrain ou leur maison pour un chantier. Vous venez participer quelques jours et vous repartez avec un savoir-faire."
      />

      <div className="max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <div className="mb-8">
          <PageBreadcrumb items={[{ label: "Projets participatifs" }]} />
        </div>

        {/* Bloc éditorial : ce qu'est un projet ici */}
        <header className="max-w-3xl mb-[52px]">
          <p className="inline-flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-terra mb-4">
            <span className="inline-block h-px w-5 bg-terra" aria-hidden />
            Projets participatifs
          </p>
          <h1 className="font-heading text-4xl md:text-5xl font-bold leading-[1.1] mb-6 text-foreground">
            Des chantiers ouverts, chez des particuliers
          </h1>
          <div className="space-y-4 text-lg leading-relaxed text-foreground/85">
            <p>
              Quelqu'un ouvre son terrain ou sa maison pour un chantier : un potager, un abri, un mur en pierre
              sèche, un atelier de récupération.
            </p>
            <p>
              Des gens viennent participer quelques jours, mettent la main à la pâte et repartent avec un
              savoir-faire appris sur place.
            </p>
            <p>
              Les échanges se font sans transaction financière : chacun donne de son temps, le porteur du projet
              transmet ce qu'il sait.
            </p>
          </div>
        </header>

        {loading ? (
          <div className="h-40" aria-busy="true" />
        ) : projets.length > 0 ? (
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-10">
            {projets.map((p, i) => (
              <SearchListingCard
                key={p.id}
                item={p}
                listIndex={i}
                tab="missions"
                radius={100}
                hasAccess
                testDemoMode={false}
                formatDate={(d) => (d ? new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }) : "")}
              />
            ))}
          </section>
        ) : (
          <section className="rounded-[2rem] border border-border bg-muted/50 p-8 md:p-12 max-w-3xl">
            <h2 className="font-heading text-2xl md:text-3xl font-bold mb-4 text-foreground">
              Portez le premier projet
            </h2>
            <p className="text-base leading-relaxed text-foreground/85 mb-6">
              Vous avez un chantier en tête chez vous, et l'envie de le mener avec quelques personnes : racontez
              ce que vous voulez construire, ce que vous transmettrez, et ce que vous pouvez proposer sur place.
            </p>
            <Link to={ARTICLE_URL}>
              <Button className="rounded-full">Lire comment se prépare un projet participatif</Button>
            </Link>
          </section>
        )}

        {/* Pied de page : affiché seulement quand des projets existent, pour
            ne pas répéter l'invitation déjà portée par l'état vide. */}
        {!loading && projets.length > 0 && (
          <section className="mt-[52px] rounded-[2rem] bg-primary text-primary-foreground p-10 md:p-14">
            <div className="max-w-2xl space-y-5">
              <h2 className="font-heading text-3xl md:text-4xl font-bold">Vous avez un projet</h2>
              <p className="text-lg opacity-90 leading-relaxed">
                Le cadre, les précautions à prendre et la manière d'accueillir des participants chez soi sont
                détaillés dans notre journal.
              </p>
              <Link to={ARTICLE_URL}>
                <Button size="lg" variant="secondary" className="rounded-full font-bold">
                  Lire l'article
                </Button>
              </Link>
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default ProjetsListing;
