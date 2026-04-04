import { useEffect } from "react";
import { useParams, Link, Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users,
  ShieldCheck,
  Heart,
  ArrowRight,
  Compass,
  Building2,
} from "lucide-react";

import { CITIES } from "@/data/cities";
import { useCityStats } from "@/hooks/useCityStats";
import CityPageMeta from "@/components/seo/CityPageMeta";
import CitySchemaOrg from "@/components/seo/CitySchemaOrg";
import LocalExpertise from "@/components/seo/LocalExpertise";
import LocalSpotsGrid from "@/components/seo/LocalSpotsGrid";
import LocalNetworkGrid from "@/components/seo/LocalNetworkGrid";
import StickyCTA from "@/components/seo/StickyCTA";

const CityPage = () => {
  const { slug } = useParams<{ slug: string }>();

  // Try static city data first
  const cityData = CITIES.find((c) => c.slug === slug);

  // Fallback: fetch from seo_city_pages if not in static data
  const { data: dbPage, isLoading: dbLoading } = useQuery({
    queryKey: ["city-page", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("seo_city_pages" as any)
        .select("*")
        .eq("slug", slug)
        .eq("published", true)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
    enabled: !!slug && !cityData,
  });

  const stats = useCityStats(
    cityData?.departmentCode || "",
    cityData?.name || dbPage?.city || ""
  );

  // Cross-linking queries (kept for DB-based pages)
  const { data: departmentPage } = useQuery({
    queryKey: ["city-department-link", dbPage?.department],
    queryFn: async () => {
      const { data } = await supabase
        .from("seo_department_pages" as any)
        .select("slug, department")
        .eq("department", dbPage!.department)
        .eq("published", true)
        .maybeSingle();
      return data as any;
    },
    enabled: !!dbPage?.department && !cityData,
  });

  const { data: cityGuide } = useQuery({
    queryKey: ["city-guide-link", slug],
    queryFn: async () => {
      const { data } = await supabase
        .from("city_guides" as any)
        .select("slug, city")
        .eq("slug", slug)
        .eq("published", true)
        .maybeSingle();
      return data as any;
    },
    enabled: !!slug,
  });

  const { data: relatedArticles = [] } = useQuery({
    queryKey: ["city-articles", cityData?.name || dbPage?.city],
    queryFn: async () => {
      const cityName = cityData?.name || dbPage?.city;
      const { data } = await supabase
        .from("articles")
        .select("slug, title, excerpt")
        .eq("published", true)
        .or(
          `city.ilike.%${cityName}%,tags.cs.{${cityName!.toLowerCase()}}`
        )
        .limit(3);
      return (data || []) as any[];
    },
    enabled: !!(cityData?.name || dbPage?.city),
  });

  // ── STATIC CITY DATA PATH ──
  if (cityData) {
    const faqItems = [
      {
        q: `Comment trouver un gardien de maison à ${cityData.name} ?`,
        a: `Sur Guardiens, vous publiez une annonce gratuite et les gardiens disponibles à ${cityData.name} et ses environs postulent directement. Chaque gardien est vérifié manuellement avant d'apparaître sur la plateforme.`,
      },
      {
        q: `Est-ce vraiment gratuit pour les propriétaires à ${cityData.name} ?`,
        a: "Oui. Guardiens est gratuit pour tous les propriétaires, sans limite dans le temps. Seuls les gardiens paient un abonnement annuel de 49€ pour accéder aux annonces et postuler.",
      },
      {
        q: `Que se passe-t-il en cas d'urgence pendant la garde à ${cityData.name} ?`,
        a: "Guardiens dispose d'un réseau de Gardiens d'Urgence dans chaque zone, disponibles sous 15 minutes. En cas d'imprévu — animal malade, problème technique — le gardien en poste peut déclencher une alerte directement depuis l'application.",
      },
    ];

    return (
      <>
        <CityPageMeta city={cityData} />
        <CitySchemaOrg city={cityData} stats={stats} />

        <div className="min-h-screen bg-background relative">
          {/* Hero */}
          <section className="max-w-5xl mx-auto px-4 py-16">
            <h1 className="font-serif text-3xl md:text-5xl font-bold text-foreground mb-6">
              {cityData.h1}
            </h1>
            <p className="text-lg text-muted-foreground max-w-3xl leading-relaxed mb-6">
              {stats.guardiansCount > 0
                ? `${stats.guardiansCount} gardien${stats.guardiansCount > 1 ? "s" : ""} vérifié${stats.guardiansCount > 1 ? "s" : ""} en ${cityData.department}`
                : `Gardiens vérifiés en ${cityData.department}`}
              {" · Gratuit pour les propriétaires"}
            </p>

            <div className="flex flex-wrap gap-3 mb-8">
              <Badge variant="secondary" className="text-sm px-4 py-2 gap-2">
                <ShieldCheck className="h-4 w-4" />
                Vérification d'identité manuelle
              </Badge>
              <Badge variant="outline" className="text-sm px-4 py-2 gap-2">
                <Heart className="h-4 w-4" />
                Gratuit propriétaires
              </Badge>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link to={`/search?ville=${cityData.slug}`}>
                <Button size="lg" className="gap-2">
                  Voir les gardiens à {cityData.name}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </section>

          {/* Cross-links */}
          {cityGuide && (
            <section className="max-w-5xl mx-auto px-4 py-6">
              <Link to={`/guide/${cityGuide.slug}`}>
                <Card className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4 flex items-center gap-3">
                    <Compass className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-semibold text-sm text-foreground">
                        Guide du gardien à {cityGuide.city}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Parcs, balades, vétos, cafés dog-friendly…
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground ml-auto" />
                  </CardContent>
                </Card>
              </Link>
            </section>
          )}

          {/* Expertise */}
          <LocalExpertise city={cityData} />

          {/* Spots */}
          <LocalSpotsGrid city={cityData} />

          {/* Network */}
          <LocalNetworkGrid current={cityData} allCities={CITIES} />

          {/* FAQ */}
          <section className="max-w-5xl mx-auto px-4 py-12 border-t border-border">
            <h2 className="font-serif text-2xl font-bold text-foreground mb-6">
              Questions fréquentes sur le house-sitting à {cityData.name}
            </h2>
            <Accordion type="single" collapsible className="w-full">
              {faqItems.map((faq, i) => (
                <AccordionItem key={i} value={`faq-${i}`}>
                  <AccordionTrigger className="text-left">
                    {faq.q}
                  </AccordionTrigger>
                  <AccordionContent>{faq.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </section>

          {/* Related articles */}
          {relatedArticles.length > 0 && (
            <section className="max-w-5xl mx-auto px-4 py-12 border-t border-border">
              <h2 className="font-serif text-2xl font-bold text-foreground mb-6">
                Articles sur {cityData.name}
              </h2>
              <div className="grid gap-4 md:grid-cols-3">
                {relatedArticles.map((a: any) => (
                  <Link
                    key={a.slug}
                    to={`/actualites/${a.slug}`}
                    className="group"
                  >
                    <Card className="h-full hover:shadow-md transition-shadow">
                      <CardContent className="p-5">
                        <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2 mb-2">
                          {a.title}
                        </h3>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {a.excerpt}
                        </p>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Final CTA */}
          <section className="max-w-5xl mx-auto px-4 py-16 text-center border-t border-border">
            <h2 className="font-serif text-2xl md:text-3xl font-bold text-foreground mb-4">
              Prêt à partir l'esprit libre ?
            </h2>
            <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
              Publiez votre annonce en 5 minutes. Gratuit.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/register?role=owner">
                <Button size="lg" className="gap-2">
                  Créer mon annonce
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link
                to="/register?role=guardian"
                className="text-sm text-primary hover:underline"
              >
                Je suis gardien, je m'inscris →
              </Link>
            </div>
          </section>

          {/* Sticky CTA */}
          <StickyCTA city={cityData} stats={stats} />
        </div>
      </>
    );
  }

  // ── DB FALLBACK PATH (existing seo_city_pages) ──
  if (dbLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-5xl mx-auto px-4 py-16">
          <Skeleton className="h-10 w-3/4 mb-4" />
          <Skeleton className="h-24 w-full mb-8" />
          <div className="grid grid-cols-3 gap-4">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
        </div>
      </div>
    );
  }

  if (!dbPage) {
    return <Navigate to="/404" replace />;
  }

  // Render DB-based page (simplified legacy)
  return (
    <>
      <CityPageMeta
        city={{
          slug: dbPage.slug,
          name: dbPage.city,
          department: dbPage.department,
          departmentCode: "",
          region: "Auvergne-Rhône-Alpes",
          coordinates: { lat: 0, lng: 0 },
          zoneProfile: "urbain",
          keywordPrimary: "",
          keywordSecondary: [],
          h1: dbPage.h1_title,
          metaDescription: dbPage.meta_description,
          localSpots: [],
          riskProfile: [],
          expertiseTips: [],
          heroImageAlt: "",
        }}
      />

      <div className="min-h-screen bg-background">
        {/* Breadcrumb */}
        <div className="max-w-5xl mx-auto px-4 pt-6">
          <nav className="text-sm text-muted-foreground" aria-label="Breadcrumb">
            <ol className="flex items-center gap-1.5">
              <li>
                <Link to="/" className="hover:text-primary transition-colors">
                  Guardiens
                </Link>
              </li>
              <li className="text-muted-foreground/50">/</li>
              {departmentPage ? (
                <li>
                  <Link
                    to={`/departement/${departmentPage.slug}`}
                    className="hover:text-primary transition-colors"
                  >
                    {dbPage.department}
                  </Link>
                </li>
              ) : (
                <li className="text-foreground font-medium">
                  {dbPage.department}
                </li>
              )}
              <li className="text-muted-foreground/50">/</li>
              <li className="text-foreground font-medium">{dbPage.city}</li>
            </ol>
          </nav>
        </div>

        {/* Hero */}
        <section className="max-w-5xl mx-auto px-4 py-12">
          <h1 className="font-serif text-3xl md:text-5xl font-bold text-foreground mb-6">
            {dbPage.h1_title}
          </h1>
          <p className="text-lg text-muted-foreground max-w-3xl leading-relaxed mb-8">
            {dbPage.intro_text}
          </p>
          <div className="flex flex-wrap gap-4 mb-8">
            {dbPage.sitter_count > 0 && (
              <Badge variant="secondary" className="text-base px-4 py-2 gap-2">
                <Users className="h-4 w-4" />
                {dbPage.sitter_count} gardien
                {dbPage.sitter_count > 1 ? "s" : ""} vérifié
                {dbPage.sitter_count > 1 ? "s" : ""}
              </Badge>
            )}
            <Badge variant="outline" className="text-base px-4 py-2 gap-2">
              <Heart className="h-4 w-4" />
              Inscrivez-vous gratuitement
            </Badge>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link to="/register">
              <Button size="lg" className="gap-2">
                Je cherche un gardien à {dbPage.city}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/register">
              <Button size="lg" variant="outline" className="gap-2">
                Je veux garder à {dbPage.city}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </section>

        {/* Cross-links */}
        {(cityGuide || departmentPage) && (
          <section className="max-w-5xl mx-auto px-4 py-6">
            <div className="flex flex-wrap gap-4">
              {cityGuide && (
                <Link to={`/guide/${cityGuide.slug}`}>
                  <Card className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4 flex items-center gap-3">
                      <Compass className="h-5 w-5 text-primary" />
                      <div>
                        <p className="font-semibold text-sm text-foreground">
                          Guide du gardien à {cityGuide.city}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Parcs, balades, vétos, cafés dog-friendly…
                        </p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground ml-auto" />
                    </CardContent>
                  </Card>
                </Link>
              )}
              {departmentPage && (
                <Link to={`/departement/${departmentPage.slug}`}>
                  <Card className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4 flex items-center gap-3">
                      <Building2 className="h-5 w-5 text-primary" />
                      <div>
                        <p className="font-semibold text-sm text-foreground">
                          House-sitting dans le {departmentPage.department}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Toutes les villes du département
                        </p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground ml-auto" />
                    </CardContent>
                  </Card>
                </Link>
              )}
            </div>
          </section>
        )}

        {/* Final CTA */}
        <section className="max-w-5xl mx-auto px-4 py-16 text-center">
          <h2 className="font-serif text-2xl md:text-3xl font-bold text-foreground mb-4">
            Rejoignez la communauté Guardiens à {dbPage.city}
          </h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
            Que vous soyez propriétaire ou gardien, rejoignez un réseau de
            confiance basé sur la proximité et le partage.
          </p>
          <Link to="/register">
            <Button size="lg" className="gap-2">
              S'inscrire gratuitement
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </section>
      </div>
    </>
  );
};

export default CityPage;
