import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import PageMeta from "@/components/PageMeta";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Users, ClipboardList, ShieldCheck, Heart, ArrowRight, Compass, Building2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const CityPage = () => {
  const { slug } = useParams<{ slug: string }>();

  const { data: page, isLoading } = useQuery({
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
    enabled: !!slug,
  });

  // Fetch active sits near this city
  const { data: nearbySits } = useQuery({
    queryKey: ["city-sits", page?.city],
    queryFn: async () => {
      const { data } = await supabase
        .from("sits")
        .select("id, title, start_date, end_date, property_id, properties!inner(photos, user_id, profiles!inner(city, first_name))")
        .eq("status", "published")
        .limit(6);
      return (data || []).filter((s: any) => {
        const sitCity = s.properties?.profiles?.city;
        return sitCity && page?.city && sitCity.toLowerCase().includes(page.city.toLowerCase());
      });
    },
    enabled: !!page?.city,
  });

  // Fetch sitters near this city
  const { data: nearbySitters } = useQuery({
    queryKey: ["city-sitters", page?.city],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, first_name, avatar_url, city, role")
        .in("role", ["sitter", "both"])
        .limit(6);
      return (data || []).filter((p: any) =>
        p.city && page?.city && p.city.toLowerCase().includes(page.city.toLowerCase())
      );
    },
    enabled: !!page?.city,
  });

  // Cross-linking: department page
  const { data: departmentPage } = useQuery({
    queryKey: ["city-department-link", page?.department],
    queryFn: async () => {
      const { data } = await supabase
        .from("seo_department_pages" as any)
        .select("slug, department")
        .eq("department", page!.department)
        .eq("published", true)
        .maybeSingle();
      return data as any;
    },
    enabled: !!page?.department,
  });

  // Cross-linking: local guide
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

  // Cross-linking: other cities in same department
  const { data: siblingCities = [] } = useQuery({
    queryKey: ["sibling-cities", page?.department, slug],
    queryFn: async () => {
      const { data } = await supabase
        .from("seo_city_pages" as any)
        .select("slug, city")
        .eq("department", page!.department)
        .eq("published", true)
        .neq("slug", slug)
        .order("city")
        .limit(6);
      return (data || []) as any[];
    },
    enabled: !!page?.department,
  });

  // Cross-linking: related articles for this city
  const { data: relatedArticles = [] } = useQuery({
    queryKey: ["city-articles", page?.city],
    queryFn: async () => {
      const { data } = await supabase
        .from("articles")
        .select("slug, title, excerpt")
        .eq("published", true)
        .or(`city.ilike.%${page!.city}%,tags.cs.{${page!.city.toLowerCase()}}`)
        .limit(3);
      return (data || []) as any[];
    },
    enabled: !!page?.city,
  });

  if (isLoading) {
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

  if (!page) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">Page non trouvée</h1>
          <p className="text-muted-foreground mb-4">Cette page ville n'existe pas encore.</p>
          <Link to="/">
            <Button>Retour à l'accueil</Button>
          </Link>
        </div>
      </div>
    );
  }

  const sitCount = nearbySits?.length || page.active_sits_count || 0;
  const sitterCount = nearbySitters?.length || page.sitter_count || 0;

  return (
    <>
      <PageMeta
        title={page.meta_title || `Pet sitting & House sitting à ${page.city} – Garde d'animaux gratuite | Guardiens`}
        description={page.meta_description || `Trouvez un pet sitter ou house sitter de confiance à ${page.city}. Garde d'animaux à domicile gratuite. Gardiens vérifiés, avis détaillés. Inscrivez-vous sur Guardiens.`}
        path={`/house-sitting/${page.slug}`}
      />

      <div className="min-h-screen bg-background">
        {/* Breadcrumb */}
        <div className="max-w-5xl mx-auto px-4 pt-6">
          <nav className="text-sm text-muted-foreground" aria-label="Breadcrumb">
            <ol className="flex items-center gap-1.5" itemScope itemType="https://schema.org/BreadcrumbList">
              <li itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem">
                <Link to="/" className="hover:text-primary transition-colors" itemProp="item">
                  <span itemProp="name">Guardiens</span>
                </Link>
                <meta itemProp="position" content="1" />
              </li>
              <li className="text-muted-foreground/50">/</li>
              <li itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem">
                {departmentPage ? (
                  <Link to={`/departement/${departmentPage.slug}`} className="hover:text-primary transition-colors" itemProp="item">
                    <span itemProp="name">{page.department}</span>
                  </Link>
                ) : (
                  <span itemProp="name" className="text-foreground font-medium">{page.department}</span>
                )}
                <meta itemProp="position" content="2" />
              </li>
              <li className="text-muted-foreground/50">/</li>
              <li itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem">
                <span itemProp="name" className="text-foreground font-medium">{page.city}</span>
                <meta itemProp="position" content="3" />
              </li>
            </ol>
          </nav>
        </div>

        {/* Hero */}
        <section className="max-w-5xl mx-auto px-4 py-12">
          <h1 className="font-serif text-3xl md:text-5xl font-bold text-foreground mb-6">
            {page.h1_title}
          </h1>
          <p className="text-lg text-muted-foreground max-w-3xl leading-relaxed mb-8">
            {page.intro_text}
          </p>

          {/* Stats */}
          <div className="flex flex-wrap gap-4 mb-8">
            <Badge variant="secondary" className="text-base px-4 py-2 gap-2">
              <Users className="h-4 w-4" />
              {sitterCount} gardien{sitterCount > 1 ? "s" : ""} vérifié{sitterCount > 1 ? "s" : ""}
            </Badge>
            <Badge variant="secondary" className="text-base px-4 py-2 gap-2">
              <ClipboardList className="h-4 w-4" />
              {sitCount} annonce{sitCount > 1 ? "s" : ""} active{sitCount > 1 ? "s" : ""}
            </Badge>
            <Badge variant="outline" className="text-base px-4 py-2 gap-2">
              <Heart className="h-4 w-4" />
              Inscrivez-vous gratuitement
            </Badge>
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Link to="/register">
              <Button size="lg" className="gap-2">
                Je cherche un gardien à {page.city}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/register">
              <Button size="lg" variant="outline" className="gap-2">
                Je veux garder à {page.city}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </section>

        {/* Cross-links: Guide + Department */}
        {(cityGuide || departmentPage) && (
          <section className="max-w-5xl mx-auto px-4 py-6">
            <div className="flex flex-wrap gap-4">
              {cityGuide && (
                <Link to={`/guide/${cityGuide.slug}`}>
                  <Card className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4 flex items-center gap-3">
                      <Compass className="h-5 w-5 text-primary" />
                      <div>
                        <p className="font-semibold text-sm text-foreground">Guide du gardien à {cityGuide.city}</p>
                        <p className="text-xs text-muted-foreground">Parcs, balades, vétos, cafés dog-friendly…</p>
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
                        <p className="font-semibold text-sm text-foreground">House-sitting dans le {departmentPage.department}</p>
                        <p className="text-xs text-muted-foreground">Toutes les villes du département</p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground ml-auto" />
                    </CardContent>
                  </Card>
                </Link>
              )}
              <Link to="/petites-missions">
                <Card className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4 flex items-center gap-3">
                    <Compass className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-semibold text-sm text-foreground">Petites missions à {page.city}</p>
                      <p className="text-xs text-muted-foreground">Entraide entre voisins : animaux, jardin, coups de main</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground ml-auto" />
                  </CardContent>
                </Card>
              </Link>
            </div>
          </section>
        )}

        {/* Active sits section */}
        <section className="max-w-5xl mx-auto px-4 py-12 border-t border-border">
          <h2 className="font-serif text-2xl font-bold text-foreground mb-6">
            Annonces actives à {page.city}
          </h2>
          {nearbySits && nearbySits.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {nearbySits.map((sit: any) => (
                <Card key={sit.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-foreground mb-1">{sit.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {sit.start_date && sit.end_date
                        ? `Du ${new Date(sit.start_date).toLocaleDateString("fr-FR")} au ${new Date(sit.end_date).toLocaleDateString("fr-FR")}`
                        : "Dates flexibles"}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="bg-muted/50">
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground mb-3">
                  Pas encore d'annonce à {page.city}. Soyez le premier à publier !
                </p>
                <Link to="/register">
                  <Button variant="outline" size="sm">Publier une annonce</Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </section>

        {/* Available sitters section */}
        <section className="max-w-5xl mx-auto px-4 py-12 border-t border-border">
          <h2 className="font-serif text-2xl font-bold text-foreground mb-6">
            Gardiens disponibles à {page.city}
          </h2>
          {nearbySitters && nearbySitters.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {nearbySitters.map((sitter: any) => (
                <div key={sitter.id} className="text-center">
                  <div className="w-16 h-16 mx-auto rounded-full bg-muted overflow-hidden mb-2">
                    {sitter.avatar_url ? (
                      <img src={sitter.avatar_url} alt={sitter.first_name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground text-lg font-semibold">
                        {sitter.first_name?.[0] || "?"}
                      </div>
                    )}
                  </div>
                  <p className="text-sm font-medium text-foreground">{sitter.first_name}</p>
                  <p className="text-xs text-muted-foreground">{sitter.city}</p>
                </div>
              ))}
            </div>
          ) : (
            <Card className="bg-muted/50">
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground mb-3">
                  Pas encore de gardien à {page.city}. Inscrivez-vous !
                </p>
                <Link to="/register">
                  <Button variant="outline" size="sm">Devenir gardien</Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </section>

        {/* Sibling cities */}
        {siblingCities.length > 0 && (
          <section className="max-w-5xl mx-auto px-4 py-12 border-t border-border">
            <h2 className="font-serif text-2xl font-bold text-foreground mb-6">
              Autres villes du {page.department}
            </h2>
            <div className="flex flex-wrap gap-3">
              {siblingCities.map((c: any) => (
                <Link key={c.slug} to={`/house-sitting/${c.slug}`}>
                  <Badge variant="outline" className="text-sm px-4 py-2 hover:bg-accent transition-colors gap-1.5 cursor-pointer">
                    <MapPin className="h-3.5 w-3.5" />
                    {c.city}
                  </Badge>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Why Guardiens section */}
        <section className="max-w-5xl mx-auto px-4 py-12 border-t border-border">
          <h2 className="font-serif text-2xl font-bold text-foreground mb-8">
            Pourquoi Guardiens à {page.city} ?
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="p-6">
                <MapPin className="h-8 w-8 text-primary mb-3" />
                <h3 className="font-semibold text-foreground mb-2">Proximité</h3>
                <p className="text-sm text-muted-foreground">
                  Des gardiens qui habitent dans votre quartier. On se connaît, on se fait confiance.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <ShieldCheck className="h-8 w-8 text-primary mb-3" />
                <h3 className="font-semibold text-foreground mb-2">Confiance</h3>
                <p className="text-sm text-muted-foreground">
                  Profils vérifiés, avis croisés détaillés, métriques de fiabilité. La transparence avant tout.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <Heart className="h-8 w-8 text-primary mb-3" />
                <h3 className="font-semibold text-foreground mb-2">Gratuité</h3>
                <p className="text-sm text-muted-foreground">
                  Inscrivez-vous gratuitement. Pas de commission sur les gardes. Simple et honnête.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Final CTA */}
        <section className="max-w-5xl mx-auto px-4 py-16 text-center">
          <h2 className="font-serif text-2xl md:text-3xl font-bold text-foreground mb-4">
            Rejoignez la communauté Guardiens à {page.city}
          </h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
            Que vous soyez propriétaire ou gardien, rejoignez un réseau de confiance basé sur la proximité et le partage.
          </p>
          <Link to="/register">
            <Button size="lg" className="gap-2">
              S'inscrire gratuitement
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </section>

        {/* JSON-LD: Breadcrumb */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "BreadcrumbList",
              itemListElement: [
                { "@type": "ListItem", position: 1, name: "Guardiens", item: "https://guardiens.lovable.app" },
                ...(departmentPage ? [{ "@type": "ListItem", position: 2, name: page.department, item: `https://guardiens.lovable.app/departement/${departmentPage.slug}` }] : []),
                { "@type": "ListItem", position: departmentPage ? 3 : 2, name: page.city, item: `https://guardiens.lovable.app/house-sitting/${page.slug}` },
              ],
            }),
          }}
        />

        {/* JSON-LD: Service */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Service",
              name: `Pet sitting & House sitting à ${page.city}`,
              description: `Service de garde d'animaux et house sitting gratuit à ${page.city}. Trouvez un gardien de confiance vérifié pour vos animaux et votre maison.`,
              provider: {
                "@type": "Organization",
                name: "Guardiens",
                url: "https://guardiens.lovable.app",
              },
              areaServed: {
                "@type": "City",
                name: page.city,
                containedInPlace: {
                  "@type": "AdministrativeArea",
                  name: page.department,
                },
              },
              serviceType: ["Pet sitting", "House sitting", "Garde d'animaux", "Gardiennage de maison"],
              offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "EUR",
                description: "Inscription et mise en relation gratuites",
              },
            }),
          }}
        />

        {/* JSON-LD: FAQPage */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              mainEntity: [
                {
                  "@type": "Question",
                  name: `Comment trouver un pet sitter à ${page.city} ?`,
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: `Inscrivez-vous gratuitement sur Guardiens, publiez votre annonce de garde et recevez des candidatures de gardiens vérifiés à ${page.city}.`,
                  },
                },
                {
                  "@type": "Question",
                  name: `Le house sitting à ${page.city} est-il gratuit ?`,
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: "Oui, Guardiens est entièrement gratuit. Pas de commission, pas de frais cachés. Le house sitting repose sur l'échange : le gardien loge gratuitement en échange de la garde de vos animaux.",
                  },
                },
                {
                  "@type": "Question",
                  name: `Combien de gardiens sont disponibles à ${page.city} ?`,
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: `Actuellement ${sitterCount} gardien${sitterCount > 1 ? "s" : ""} vérifié${sitterCount > 1 ? "s" : ""} ${sitterCount > 1 ? "sont" : "est"} disponible${sitterCount > 1 ? "s" : ""} à ${page.city} sur Guardiens. Ce nombre grandit chaque jour.`,
                  },
                },
              ],
            }),
          }}
        />
      </div>
    </>
  );
};

export default CityPage;
