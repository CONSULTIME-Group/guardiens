// Page publique éditoriale — toutes les annonces de garde ouvertes.
// Réutilise le moteur de recherche complet (SearchSitter) — filtres,
// département/ville/critères + carte live — mais dans un shell public
// (header + footer), sans la sidebar dashboard.
import { Suspense, useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import PublicHeader from "@/components/layout/PublicHeader";
import PublicFooter from "@/components/layout/PublicFooter";
import { lazyWithRetry } from "@/lib/lazyWithRetry";
import { supabase } from "@/integrations/supabase/client";

const SearchSitter = lazyWithRetry(
  () => import("@/components/search/SearchSitter"),
  "SearchSitter",
);

const CANONICAL = "https://guardiens.fr/annonces";
const TITLE = "Annonces de garde d'animaux à domicile en France | Guardiens";
const DESCRIPTION =
  "Toutes les annonces de garde de chats, chiens et NAC à domicile, partout en France. Filtres par ville, département et critères, carte en direct. Consultation libre, inscription gratuite pour postuler.";

const BASE_JSONLD = [
  {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: TITLE,
    description: DESCRIPTION,
    url: CANONICAL,
    inLanguage: "fr-FR",
    isPartOf: { "@type": "WebSite", name: "Guardiens", url: "https://guardiens.fr" },
  },
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Accueil", item: "https://guardiens.fr/" },
      { "@type": "ListItem", position: 2, name: "Annonces de garde", item: CANONICAL },
    ],
  },
];

export default function PublicListings() {
  const [itemListLd, setItemListLd] = useState<any | null>(null);
  const [intlCount, setIntlCount] = useState<number>(0);

  // Compte les annonces hors France pour piloter l'indicateur "radar"
  // (chip pulsant qui pointe vers /annonces/international).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { count } = await supabase
        .from("sits")
        .select("id", { count: "exact", head: true })
        .eq("status", "published")
        .not("country", "is", null)
        .neq("country", "FR");
      if (!cancelled) setIntlCount(count || 0);
    })();
    return () => { cancelled = true; };
  }, []);

  // Charge un échantillon léger des annonces ouvertes pour émettre un
  // JSON-LD ItemList (utile au carrousel Google « Offres »).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("sits")
        .select("id, title")
        .eq("status", "published")
        .order("created_at", { ascending: false })
        .limit(20);
      if (cancelled || !data || data.length === 0) return;
      setItemListLd({
        "@context": "https://schema.org",
        "@type": "ItemList",
        name: "Annonces de garde d'animaux ouvertes",
        url: CANONICAL,
        numberOfItems: data.length,
        itemListElement: data.map((s: any, i: number) => ({
          "@type": "ListItem",
          position: i + 1,
          url: `https://guardiens.fr/annonces/${s.id}`,
          name: s.title || "Garde d'animaux",
        })),
      });
    })();
    return () => { cancelled = true; };
  }, []);

  const jsonld = itemListLd ? [...BASE_JSONLD, itemListLd] : BASE_JSONLD;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Helmet>
        <title>{TITLE}</title>
        <meta name="description" content={DESCRIPTION} />
        <meta name="robots" content="index,follow" />
        <link rel="canonical" href={CANONICAL} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={CANONICAL} />
        <meta property="og:title" content={TITLE} />
        <meta property="og:description" content={DESCRIPTION} />
        <meta property="og:site_name" content="Guardiens" />
        <meta property="og:locale" content="fr_FR" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={TITLE} />
        <meta name="twitter:description" content={DESCRIPTION} />
        <script type="application/ld+json">{JSON.stringify(jsonld)}</script>
      </Helmet>

      <PublicHeader />

      <main id="main-content" className="flex-1 min-w-0" role="main">
        {/* ─── Hero éditorial + H1 SEO ─── */}
        <section className="max-w-6xl mx-auto px-4 md:px-6 pt-10 pb-6">
          <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground mb-3">
            Annonces ouvertes · France entière
          </p>
          <h1 className="font-heading text-3xl md:text-4xl lg:text-5xl font-medium leading-tight text-foreground tracking-tight max-w-3xl">
            Annonces de garde d'animaux à domicile
          </h1>
          <p className="mt-4 text-base md:text-lg text-muted-foreground max-w-2xl leading-relaxed">
            Parcourez librement les gardes proposées par les propriétaires&nbsp;:
            chats, chiens, NAC, à la campagne ou en ville. Filtrez par localisation,
            dates et critères, ou visualisez la carte en direct.
          </p>
          <nav aria-label="Voir aussi" className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
            <Link
              to="/petites-missions"
              className="inline-flex items-center gap-1.5 text-primary font-semibold hover:underline underline-offset-4"
            >
              Voir aussi&nbsp;: petites missions près de chez vous <span aria-hidden>→</span>
            </Link>
            <Link
              to="/guides-locaux"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Guides locaux
            </Link>
            <Link
              to="/tarifs"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Tarifs
            </Link>
          </nav>
        </section>

        <Suspense
          fallback={
            <div className="max-w-6xl mx-auto px-4 py-12 animate-pulse space-y-6">
              <div className="h-12 rounded-2xl bg-muted w-2/3" />
              <div className="h-64 rounded-3xl bg-muted" />
            </div>
          }
        >
          <SearchSitter />
        </Suspense>

        {/* ─── Maillage interne bas de page ─── */}
        <section className="border-t border-border/60 mt-12">
          <div className="max-w-6xl mx-auto px-4 md:px-6 py-10">
            <h2 className="font-heading text-xl font-medium text-foreground mb-4">
              Explorer aussi
            </h2>
            <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-sm">
              <li>
                <Link to="/petites-missions" className="group inline-flex items-baseline gap-2 text-foreground hover:text-primary transition-colors">
                  <span className="font-medium">Petites missions</span>
                  <span className="text-muted-foreground">— coups de main de proximité, gratuits</span>
                </Link>
              </li>
              <li>
                <Link to="/guides-locaux" className="group inline-flex items-baseline gap-2 text-foreground hover:text-primary transition-colors">
                  <span className="font-medium">Guides locaux</span>
                  <span className="text-muted-foreground">— villes et conseils</span>
                </Link>
              </li>
              <li>
                <Link to="/tarifs" className="group inline-flex items-baseline gap-2 text-foreground hover:text-primary transition-colors">
                  <span className="font-medium">Tarifs gardien</span>
                  <span className="text-muted-foreground">— 6,99 €/mois ou 12 € one-shot</span>
                </Link>
              </li>
            </ul>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
