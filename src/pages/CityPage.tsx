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
  Siren,
  CheckCircle2,
} from "lucide-react";

import { CITIES } from "@/data/cities";
import { useCityStats } from "@/hooks/useCityStats";
import { getCityContent } from "@/data/cityContent";
import CityPageMeta from "@/components/seo/CityPageMeta";
import CitySchemaOrg from "@/components/seo/CitySchemaOrg";
import LocalExpertise from "@/components/seo/LocalExpertise";
import LocalSpotsGrid from "@/components/seo/LocalSpotsGrid";
import LocalNetworkGrid from "@/components/seo/LocalNetworkGrid";
import CityArticleBody from "@/components/city/CityArticleBody";
import StickyCTA from "@/components/seo/StickyCTA";
import PageBreadcrumb from "@/components/seo/PageBreadcrumb";
import CityHero, { CITY_HERO_IMAGES } from "@/components/city/CityHero";

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

  useEffect(() => {
    if (cityData || (!dbLoading && dbPage !== undefined)) window.prerenderReady = true;
  }, [cityData, dbLoading, dbPage]);

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
    const content = getCityContent(cityData.slug);

    const faqItems = cityData.slug === "lyon"
      ? [
          { q: "Comment rencontrer un gardien avant de confier ma maison ?", a: "Après avoir accepté une candidature, vous organisez une rencontre directement via la messagerie Guardiens. La plupart des propriétaires à Lyon choisissent un café de quartier ou une visite du logement. Cette étape est systématique et fortement recommandée." },
          { q: "Que se passe-t-il en cas d'urgence ou d'imprévu ?", a: "Guardiens dispose d'un réseau de gardiens d'urgence à Lyon, mobilisables rapidement. En cas de problème vétérinaire, le gardien contacte la clinique indiquée dans le guide de la maison. En cas de problème technique, il suit les consignes laissées par le propriétaire." },
          { q: "Comment sont vérifiés les gardiens à Lyon ?", a: "Chaque gardien fournit une pièce d'identité vérifiée manuellement par l'équipe Guardiens. Les avis croisés après chaque garde et les badges de fiabilité complètent le dispositif de confiance." },
          { q: "Puis-je publier une annonce pour un chien ET un chat ?", a: "Absolument. Votre annonce peut inclure tous vos animaux. Les gardiens qui postulent voient la composition exacte de votre foyer et décident en connaissance de cause." },
          { q: "Combien de temps à l'avance faut-il publier mon annonce ?", a: "Pour les vacances d'été à Lyon, nous recommandons un mois à l'avance. Pour un week-end, une à deux semaines suffisent. Plus l'annonce est publiée tôt, plus vous recevez de candidatures de qualité." },
          { q: "Que faire si mon gardien annule au dernier moment ?", a: "C'est rare mais cela peut arriver. Guardiens active alors le réseau de gardiens d'urgence de votre zone. Le système de fiabilité pénalise les annulations répétées pour garantir la qualité du réseau." },
          { q: "Comment se passe la remise des clés à Lyon ?", a: "Lors de la rencontre préalable ou le jour du départ, vous remettez les clés en main propre à votre gardien. Certains propriétaires lyonnais laissent un double dans une boîte à clés sécurisée." },
          { q: "Guardiens fonctionne-t-il pour les gardes de plusieurs semaines ?", a: "Oui. La plateforme est conçue pour les gardes de toute durée, du week-end prolongé aux absences de plusieurs semaines. Les gardiens indiquent leurs disponibilités sur leur profil." },
        ]
      : [
          { q: `Comment trouver un gardien de maison à ${cityData.name} ?`, a: `Sur Guardiens, vous publiez une annonce et les gardiens disponibles à ${cityData.name} et ses environs postulent directement. Chaque gardien est vérifié manuellement avant d'apparaître sur la plateforme.` },
          { q: `Est-ce vraiment à 0 € pour les propriétaires à ${cityData.name} ?`, a: "Oui. Guardiens est à 0 € pour tous les propriétaires, à vie, sans limite dans le temps. Seuls les gardiens paient un abonnement pour accéder aux annonces et postuler." },
          { q: `Que se passe-t-il en cas d'urgence pendant la garde à ${cityData.name} ?`, a: `Guardiens dispose d'un réseau de Gardiens d'Urgence dans chaque zone. En cas d'imprévu — animal malade, problème technique — le gardien en poste peut déclencher une alerte.` },
          { q: `Combien coûte une pension pour animaux à ${cityData.name} ?`, a: `Les pensions autour de ${cityData.name} facturent en moyenne 25 à 45 euros par nuit et par animal. Sur Guardiens, c'est sans frais pour le propriétaire : le gardien s'installe chez vous et s'occupe de vos animaux dans leur environnement habituel.` },
          { q: `Comment devenir gardien à ${cityData.name} ?`, a: `Inscrivez-vous, complétez votre profil et faites vérifier votre identité. Vous pourrez ensuite postuler aux gardes disponibles en ${cityData.department}. L'abonnement gardien est de 6,99 euros par mois, résiliable à tout moment.` },
        ];

    return (
      <>
        <CityPageMeta city={cityData} />
        <CitySchemaOrg city={cityData} stats={stats} />

        {(() => {
          const cityKey = cityData.slug;
          const hasHeroImage = !!CITY_HERO_IMAGES[cityKey];

          if (hasHeroImage) {
            return (
              <CityHero
                city={cityData.name}
                h1Title={cityData.h1}
                subtitle={
                  content?.subtitle ||
                  (stats.guardiansCount > 0
                    ? `${stats.guardiansCount} gardien${stats.guardiansCount > 1 ? "s" : ""} vérifié${stats.guardiansCount > 1 ? "s" : ""} en ${cityData.department} · 0 € pour les propriétaires`
                    : `Gardiens vérifiés en ${cityData.department} · 0 € pour les propriétaires`)
                }
                heroAlt={cityData.heroImageAlt || `House-sitting à ${cityData.name}`}
                department={cityData.department}
              />
            );
          }

          return (
            <>
              <PageBreadcrumb items={[
                { label: "Nos villes", href: "/house-sitting" },
                { label: cityData.name },
              ]} />
            </>
          );
        })()}

        <div className="min-h-screen bg-background relative">
          {/* Text hero — only when no image hero */}
          {!CITY_HERO_IMAGES[cityData.slug] && (
            <section className="max-w-5xl mx-auto px-4 py-16">
              <h1 className="font-serif text-3xl md:text-5xl font-bold text-foreground mb-6">
                {cityData.h1}
              </h1>
              {content && (
                <p className="text-lg text-foreground/80 max-w-3xl leading-relaxed mb-4 font-body">
                  {content.subtitle}
                </p>
              )}
              <p className="text-lg text-muted-foreground max-w-3xl leading-relaxed mb-6">
                {stats.guardiansCount > 0
                  ? `${stats.guardiansCount} gardien${stats.guardiansCount > 1 ? "s" : ""} vérifié${stats.guardiansCount > 1 ? "s" : ""} en ${cityData.department}`
                  : `Gardiens vérifiés en ${cityData.department}`}
                {" · 0 € pour les propriétaires"}
              </p>

              <div className="flex flex-wrap gap-3 mb-8">
                <Badge variant="secondary" className="text-sm px-4 py-2 gap-2">
                  <ShieldCheck className="h-4 w-4" />
                  Vérification d'identité manuelle
                </Badge>
                <Badge variant="outline" className="text-sm px-4 py-2 gap-2">
                  <Heart className="h-4 w-4" />
                  0 € propriétaires
                </Badge>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Link to={`/search?ville=${cityData.slug}`}>
                  <Button size="lg" className="gap-2">
                    Voir les gardiens à {cityData.name}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/gardien-urgence">
                  <Button size="lg" variant="outline" className="gap-2">
                    <Siren className="h-4 w-4" />
                    Gardien d'urgence
                  </Button>
                </Link>
              </div>
            </section>
          )}

          {/* Cross-links */}
          {cityGuide && (
            <section className="max-w-5xl mx-auto px-4 py-6">
              <Link to={`/guides/${cityGuide.slug}`}>
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

          {/* Rich editorial content from cityContent */}
          {content && content.articleSections.length > 0 && (
            <section className="max-w-5xl mx-auto px-4 py-12 border-t border-border">
              <CityArticleBody sections={content.articleSections} />
            </section>
          )}

          {/* Reassurance */}
          <section className="max-w-5xl mx-auto px-4 py-12 border-t border-border">
            <h2 className="font-serif text-2xl font-bold text-foreground mb-6">
              Pourquoi choisir Guardiens à {cityData.name} ?
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="space-y-3">
                <ShieldCheck className="h-6 w-6 text-primary" />
                <h3 className="font-semibold text-foreground">Gardiens vérifiés</h3>
                <p className="text-sm text-muted-foreground">
                  Identité vérifiée manuellement, avis croisés détaillés, écussons de fiabilité. Vous savez exactement à qui vous confiez vos clés.
                </p>
              </div>
              <div className="space-y-3">
                <Heart className="h-6 w-6 text-primary" />
                <h3 className="font-semibold text-foreground">0 € pour les propriétaires</h3>
                <p className="text-sm text-muted-foreground">
                  Aucun frais, aucune commission. Le gardien vit chez vous et s'occupe de vos animaux dans leur environnement.
                </p>
              </div>
              <div className="space-y-3">
                <Siren className="h-6 w-6 text-primary" />
                <h3 className="font-semibold text-foreground">Filet de sécurité local</h3>
                <p className="text-sm text-muted-foreground">
                  Des <Link to="/gardien-urgence" className="text-primary hover:underline">gardiens d'urgence</Link> à {cityData.name}, mobilisables en quelques heures en cas d'imprévu.
                </p>
              </div>
            </div>
          </section>

          {/* Expertise */}
          <LocalExpertise city={cityData} />

          {/* Spots */}
          <LocalSpotsGrid city={cityData} />

          {/* Nearby towns from cityContent */}
          {content && content.nearbyTowns.length > 0 && (
            <section className="max-w-5xl mx-auto px-4 py-12 border-t border-border">
              <h2 className="font-serif text-2xl font-bold text-foreground mb-4">
                Aussi disponible autour de {cityData.name}
              </h2>
              <p className="text-sm text-muted-foreground mb-4">
                Les gardiens Guardiens couvrent {cityData.name} et ses communes alentour.
              </p>
              <div className="flex flex-wrap gap-2">
                {content.nearbyTowns.map((town) => (
                  <Badge key={town} variant="outline" className="text-sm px-3 py-1">
                    {town}
                  </Badge>
                ))}
              </div>
            </section>
          )}

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

          {/* Internal links — maillage stratégique vers guide local + département parent */}
          <section className="max-w-5xl mx-auto px-4 py-8 border-t border-border">
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-sm">
              <Link to={`/guides/${cityData.slug}`} className="text-primary hover:underline">
                Guide local de {cityData.name} →
              </Link>
              <Link
                to={`/departement/${cityData.department.toLowerCase().replace(/\s+/g, "-").replace(/'/g, "")}`}
                className="text-primary hover:underline"
              >
                House-sitting en {cityData.department} →
              </Link>
              <Link to="/guides" className="text-primary hover:underline">Tous les guides locaux →</Link>
              <Link to="/tarifs" className="text-primary hover:underline">Voir les tarifs →</Link>
              <Link to="/gardien-urgence" className="text-primary hover:underline">Gardiens d'urgence →</Link>
              <Link to="/faq" className="text-primary hover:underline">FAQ complète →</Link>
              <Link to="/a-propos" className="text-primary hover:underline">À propos de Guardiens →</Link>
            </div>
          </section>

          {/* Final CTA */}
          <section className="max-w-5xl mx-auto px-4 py-16 text-center border-t border-border">
            <h2 className="font-serif text-2xl md:text-3xl font-bold text-foreground mb-4">
              Prêt à partir l'esprit libre ?
            </h2>
            <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
              Publiez votre annonce en 5 minutes. À 0 €, à vie.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/inscription?role=owner">
                <Button size="lg" className="gap-2">
                  Créer mon annonce
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link
                to="/inscription?role=guardian"
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
    return <Navigate to="/" replace />;
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
        <PageBreadcrumb items={[
          { label: "Nos villes", href: "/house-sitting" },
          { label: dbPage.city },
        ]} />

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
              Inscription à 0 €
            </Badge>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link to="/inscription">
              <Button size="lg" className="gap-2">
                Je cherche un gardien à {dbPage.city}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/inscription">
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
          <Link to="/inscription">
            <Button size="lg" className="gap-2">
              S'inscrire — 0 €
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </section>
      </div>
    </>
  );
};

export default CityPage;
