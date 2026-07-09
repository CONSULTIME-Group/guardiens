import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import PageMeta from "@/components/PageMeta";
import PageBreadcrumb from "@/components/seo/PageBreadcrumb";
import PublicHeader from "@/components/layout/PublicHeader";
import PublicFooter from "@/components/layout/PublicFooter";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { supabase } from "@/integrations/supabase/client";
import { haversineDistance } from "@/lib/geocode";
import { MISSIONS_LYON } from "@/data/missionsCityContent";
import MissionCardCover from "@/components/missions/MissionCardCover";

const SITE_URL = "https://guardiens.fr";

const CATEGORY_LABEL: Record<string, string> = {
  animals: "Animaux",
  garden: "Jardin",
  errand: "Courses",
  tech: "Technique",
  company: "Compagnie",
  home: "Maison",
  other: "Autre",
};

interface MissionRow {
  id: string;
  slug?: string | null;
  title: string;
  category: string;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
  photos: string[] | null;
}

const MissionsCityPage = () => {
  const c = MISSIONS_LYON;
  const [missions, setMissions] = useState<MissionRow[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("small_missions")
        .select("id, slug, title, category, city, latitude, longitude, created_at, photos")
        .eq("status", "open")
        .order("created_at", { ascending: false })
        .limit(100);

      if (!data) return;
      const filtered = (data as MissionRow[])
        .filter((m) => m.latitude != null && m.longitude != null)
        .map((m) => ({
          m,
          d: haversineDistance(c.coordinates.lat, c.coordinates.lng, Number(m.latitude), Number(m.longitude)),
        }))
        .filter((x) => x.d <= c.radiusKm)
        .sort((a, b) => a.d - b.d)
        .slice(0, 12)
        .map((x) => x.m);

      setMissions(filtered);
    };
    void load();
  }, [c.coordinates.lat, c.coordinates.lng, c.radiusKm]);

  const path = `/petites-missions/${c.slug}`;
  const url = `${SITE_URL}${path}`;

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Accueil", item: `${SITE_URL}/` },
      { "@type": "ListItem", position: 2, name: "Petites missions", item: `${SITE_URL}/petites-missions` },
      { "@type": "ListItem", position: 3, name: c.cityName, item: url },
    ],
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: c.faq.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <>
      <PageMeta title={c.metaTitle} description={c.metaDescription} path={path} />
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(breadcrumbSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>
      </Helmet>

      <div className="min-h-screen bg-background font-body">
        <PublicHeader />
        <PageBreadcrumb
          items={[
            { label: "Petites missions", href: "/petites-missions" },
            { label: c.cityName },
          ]}
        />

        <section className="bg-background">
          <div className="max-w-3xl mx-auto px-6 py-8 md:py-24">
            <p className="hidden md:block text-xs font-body font-semibold tracking-widest uppercase text-primary/60 mb-4">
              Entraide à domicile · {c.cityName}
            </p>
            <h1 className="font-heading text-2xl md:text-5xl font-bold text-foreground leading-tight">
              {c.h1}
            </h1>
            <p className="font-body text-lg text-foreground/75 leading-relaxed mt-6">
              {c.intro}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 mt-8">
              <Link to="/inscription?redirect=/petites-missions/creer">
                <Button className="rounded-full px-8 py-4 h-auto text-sm font-semibold tracking-wide">
                  Publier une mission à {c.cityName}
                </Button>
              </Link>
              <Link to="/petites-missions">
                <Button variant="outline" className="rounded-full px-8 py-4 h-auto text-sm font-semibold tracking-wide">
                  Voir toutes les missions
                </Button>
              </Link>
            </div>
          </div>
        </section>

        <section className="bg-muted/30 border-t border-border/40">
          <div className="max-w-3xl mx-auto px-6 py-8 md:py-20 space-y-10">
            {c.sections.map((s) => (
              <article key={s.heading}>
                <h2 className="font-heading text-xl md:text-3xl font-semibold text-foreground mb-4 leading-snug">
                  {s.heading}
                </h2>
                <p className="font-body text-base md:text-lg text-foreground/80 leading-relaxed">
                  {s.body}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="bg-background border-t border-border/40">
          <div className="max-w-3xl mx-auto px-6 py-8 md:py-20">
            <h2 className="font-heading text-xl md:text-3xl font-semibold text-foreground mb-6 md:mb-8 leading-snug">
              Missions ouvertes près de {c.cityName}
            </h2>

            {missions.length > 0 ? (
              <ul className="space-y-3">
                {missions.map((m) => {
                  const hasPhoto = Array.isArray(m.photos) && m.photos.length > 0;
                  return (
                    <li key={m.id}>
                      <Link
                        to={`/petites-missions/${m.slug || m.id}`}
                        className="flex gap-4 p-4 rounded-xl border border-border bg-card hover:bg-accent/50 transition-colors"
                      >
                        {hasPhoto && (
                          <MissionCardCover
                            photo={m.photos![0]}
                            category={m.category}
                            title={m.title}
                            className="w-24 sm:w-32 shrink-0 aspect-[4/3] rounded-lg"
                          />
                        )}
                        <div className="flex items-center justify-between gap-4 flex-1 min-w-0">
                          <div className="min-w-0">
                            <p className="font-heading text-base font-semibold text-foreground truncate">
                              {m.title}
                            </p>
                            <p className="text-xs text-foreground/60 mt-1">
                              {m.city ? `${m.city} · ` : ""}{CATEGORY_LABEL[m.category] || m.category}
                            </p>
                          </div>
                          <span className="text-xs text-primary font-semibold shrink-0">Voir →</span>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="p-8 rounded-2xl border border-dashed border-border bg-accent/20 text-center">
                <p className="font-heading text-lg text-foreground/85 leading-relaxed">
                  Aucune mission ouverte à {c.cityName} pour le moment.
                </p>
                <p className="font-body text-base text-foreground/65 leading-relaxed mt-3 max-w-xl mx-auto">
                  La communauté lyonnaise grandit chaque semaine. Publiez la première mission de votre quartier, quelqu'un, près de chez vous, n'attend que ça.
                </p>
                <Link to="/inscription?redirect=/petites-missions/creer" className="inline-block mt-6">
                  <Button className="rounded-full px-8 py-3 h-auto text-sm font-semibold">
                    Publier une mission
                  </Button>
                </Link>
              </div>
            )}

            <p className="text-sm text-foreground/60 mt-8">
              Vous cherchez plutôt un gardien pour une absence de plusieurs jours à {c.cityName} ?{" "}
              <Link to="/house-sitting/lyon" className="text-primary font-semibold hover:underline">
                Découvrez le house-sitting à Lyon
              </Link>
              .
            </p>
          </div>
        </section>

        <section className="bg-muted/30 border-t border-border/40">
          <div className="max-w-3xl mx-auto px-6 py-8 md:py-20">
            <h2 className="font-heading text-xl md:text-3xl font-semibold text-foreground mb-6 md:mb-8 leading-snug">
              Questions fréquentes, Lyon
            </h2>
            <Accordion type="single" collapsible className="space-y-3">
              {c.faq.map((f, i) => (
                <AccordionItem key={i} value={`q-${i}`} className="border border-border rounded-xl px-4 bg-card">
                  <AccordionTrigger className="text-left font-heading text-base font-semibold">
                    {f.q}
                  </AccordionTrigger>
                  <AccordionContent className="font-body text-base text-foreground/75 leading-relaxed">
                    {f.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        <PublicFooter />
      </div>
    </>
  );
};

export default MissionsCityPage;
