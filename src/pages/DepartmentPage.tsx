import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import PageMeta from "@/components/PageMeta";
import { buildOgImageUrl } from "@/lib/ogImage";
import ShareLink from "@/components/share/ShareLink";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Users, ClipboardList, ShieldCheck, Heart, ArrowRight, Compass, Building2 } from "lucide-react";
import PageBreadcrumb from "@/components/seo/PageBreadcrumb";
import { Skeleton } from "@/components/ui/skeleton";

const DepartmentPage = () => {
 const { slug } = useParams<{ slug: string }>();

 const { data: page, isLoading } = useQuery({
 queryKey: ["department-page", slug],
 queryFn: async () => {
 const { data, error } = await supabase
.from("seo_department_pages" as any)
.select("*")
.eq("slug", slug)
.eq("published", true)
.maybeSingle();
 if (error) throw error;
 return data as any;
 },
 enabled: !!slug,
 });

 // Fetch city pages in this department
 const { data: cityPages = [] } = useQuery({
 queryKey: ["department-cities", page?.department],
 queryFn: async () => {
 const { data, error } = await supabase
.from("seo_city_pages" as any)
.select("id, city, slug, sitter_count, active_sits_count")
.eq("department", page!.department)
.eq("published", true)
.order("city");
 if (error) throw error;
 return (data || []) as any[];
 },
 enabled: !!page?.department,
 });

 // Fetch guides in this department
 const { data: guides = [] } = useQuery({
 queryKey: ["department-guides", page?.department],
 queryFn: async () => {
 const { data, error } = await supabase
.from("city_guides" as any)
.select("id, city, slug")
.eq("department", page!.department)
.eq("published", true)
.order("city");
 if (error) throw error;
 return (data || []) as any[];
 },
 enabled: !!page?.department,
 });

 if (isLoading) {
 return (
 <div className="min-h-screen bg-background">
 <div className="max-w-5xl mx-auto px-4 py-16">
 <Skeleton className="h-10 w-3/4 mb-4" />
 <Skeleton className="h-24 w-full mb-8" />
 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
 <p className="text-muted-foreground mb-4">Cette page département n'existe pas encore.</p>
 <Link to="/"><Button>Retour à l'accueil</Button></Link>
 </div>
 </div>
 );
 }

 return (
 <>
 <PageMeta
 title={page.meta_title || `Pet sitting & House sitting ${page.department}, garde d'animaux gratuite pour les propriétaires | Guardiens`}
 description={page.meta_description || `Trouvez un pet sitter ou house sitter dans le ${page.department}. Garde d'animaux entre particuliers, gratuite pour les propriétaires. ${cityPages.length} villes couvertes sur Guardiens.`}
 path={`/departement/${page.slug}`}
 image={buildOgImageUrl({ title: page.department, subtitle: `${cityPages.length} villes couvertes`, kind: "departement" })}
 />

 <div className="min-h-screen bg-background">
 <PageBreadcrumb items={[
 { label: "Départements" },
 { label: page.department },
 ]} />

 {/* Hero */}
 <section className="max-w-5xl mx-auto px-4 py-8 md:py-12">
 <h1 className="font-serif text-3xl md:text-5xl font-bold text-foreground mb-6">
 {page.h1_title}
 </h1>
 <p className="text-lg text-muted-foreground max-w-3xl leading-relaxed mb-4">
 {page.intro_text}
 </p>
 {page.highlights && (
 <p className="text-base text-foreground/80 max-w-3xl leading-relaxed mb-8">
 {page.highlights}
 </p>
 )}
 <div className="mb-6">
 <ShareLink url={`https://guardiens.fr/departement/${page.slug}`} title={page.h1_title} text={page.intro_text} source="department_page" />
 </div>


 {/* Stats */}
 <div className="flex flex-wrap gap-4 mb-8">
 <Badge variant="secondary" className="text-base px-4 py-2 gap-2">
 <Building2 className="h-4 w-4" />
 {cityPages.length} ville{cityPages.length > 1 ? "s" : ""} couvertes
 </Badge>
 <Badge variant="secondary" className="text-base px-4 py-2 gap-2">
 <Compass className="h-4 w-4" />
 {guides.length} guide{guides.length > 1 ? "s" : ""} locaux
 </Badge>
 <Badge variant="outline" className="text-base px-4 py-2 gap-2">
 <Heart className="h-4 w-4" />
 Inscription gratuite
 </Badge>
 </div>

 {/* CTAs */}
 <div className="flex flex-col sm:flex-row gap-3">
 <Link to="/inscription">
 <Button size="lg" className="gap-2">
 Trouver un gardien dans le {page.department}
 <ArrowRight className="h-4 w-4" />
 </Button>
 </Link>
 <Link to="/inscription">
 <Button size="lg" variant="outline" className="gap-2">
 Devenir gardien dans le {page.department}
 <ArrowRight className="h-4 w-4" />
 </Button>
 </Link>
 </div>
 </section>

 {/* Cities in this department */}
 {cityPages.length > 0 && (
 <section className="max-w-5xl mx-auto px-4 py-6 md:py-12 border-t border-border">
 <h2 className="font-serif text-2xl font-bold text-foreground mb-6">
 Villes du {page.department} sur Guardiens
 </h2>
 <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
 {cityPages.map((city: any) => (
 <Link key={city.id} to={`/house-sitting/${city.slug}`}>
 <Card className="hover:shadow-md transition-shadow h-full">
 <CardContent className="p-5">
 <div className="flex items-center gap-3 mb-2">
 <MapPin className="h-5 w-5 text-primary shrink-0" />
 <h3 className="font-semibold text-foreground">{city.city}</h3>
 </div>
 <div className="flex gap-3 text-sm text-muted-foreground">
 <span className="flex items-center gap-1">
 <Users className="h-3.5 w-3.5" />
 {city.sitter_count} gardiens
 </span>
 <span className="flex items-center gap-1">
 <ClipboardList className="h-3.5 w-3.5" />
 {city.active_sits_count} annonces
 </span>
 </div>
 </CardContent>
 </Card>
 </Link>
 ))}
 </div>
 </section>
 )}

 {/* Guides in this department */}
 {guides.length > 0 && (
 <section className="max-w-5xl mx-auto px-4 py-6 md:py-12 border-t border-border">
 <h2 className="font-serif text-2xl font-bold text-foreground mb-6">
 Guides locaux, {page.department}
 </h2>
 <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
 {guides.map((guide: any) => (
 <Link key={guide.id} to={`/guide/${guide.slug}`}>
 <Card className="hover:shadow-md transition-shadow h-full">
 <CardContent className="p-5 flex items-center gap-3">
 <Compass className="h-5 w-5 text-primary shrink-0" />
 <div>
 <h3 className="font-semibold text-foreground">Guide de {guide.city}</h3>
 <p className="text-sm text-muted-foreground">Parcs, balades, vétos, cafés…</p>
 </div>
 </CardContent>
 </Card>
 </Link>
 ))}
 </div>
 </section>
  )}

  {/* Combien coûte */}
  <section className="max-w-5xl mx-auto px-4 py-6 md:py-12 border-t border-border">
    <h2 className="font-serif text-2xl font-bold text-foreground mb-4">
      Combien coûte une garde d'animaux dans le {page.department} ?
    </h2>
    <p className="text-base text-foreground/90 leading-relaxed mb-3">
      Guardiens reste gratuit tant que nous ne sommes pas satisfaits du service que nous vous offrons. Aucune commission côté propriétaire, aucun frais de mise en relation, une rencontre systématique avant chaque garde.
    </p>
    <p className="text-base text-foreground/80 leading-relaxed">
      Une pension pour animaux dans le {page.department} se facture généralement entre 25 et 50 € par nuit et par animal, soit 350 à 700 € pour deux semaines avec un chien. Confier son animal à un gardien à domicile, c'est éviter le stress de la mise en pension, garder votre logement occupé pendant votre absence, et bénéficier d'une relation directe entre particuliers, sans intermédiaire commercial. Les gardiens du réseau Guardiens dans le {page.department} sont vérifiés (identité, avis publics de la communauté) et rencontrés en amont.
    </p>
  </section>

  {/* Comment trouver un gardien fiable */}
  <section className="max-w-5xl mx-auto px-4 py-6 md:py-12 border-t border-border">
    <h2 className="font-serif text-2xl font-bold text-foreground mb-4">
      Comment trouver un gardien fiable dans le {page.department} ?
    </h2>
    <p className="text-base text-foreground/90 leading-relaxed mb-4">
      Pour trouver un gardien fiable dans le {page.department}, publiez votre annonce sur Guardiens, recevez des candidatures de gardiens vérifiés de votre secteur, consultez leurs profils et avis, puis organisez une rencontre avant de confirmer la garde. Le processus tient en trois étapes.
    </p>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card>
        <CardContent className="p-5">
          <h3 className="font-semibold text-foreground mb-2">1. Publiez votre annonce</h3>
          <p className="text-sm text-muted-foreground">Décrivez votre maison, vos animaux, les dates, vos attentes. La publication est sans frais côté propriétaire. Précisez votre ville ou commune pour être trouvé par les gardiens de proximité.</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-5">
          <h3 className="font-semibold text-foreground mb-2">2. Rencontrez les candidats</h3>
          <p className="text-sm text-muted-foreground">Consultez les profils vérifiés, les avis de la communauté, l'expérience animale. Rencontrez-vous autour d'un café ou lors d'une visite du logement. C'est cette rencontre physique qui fait la différence.</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-5">
          <h3 className="font-semibold text-foreground mb-2">3. Confirmez la garde</h3>
          <p className="text-sm text-muted-foreground">Échangez les informations pratiques via la messagerie intégrée : clés, routine de l'animal, contacts du vétérinaire. Un guide de maison optionnel permet de tout centraliser.</p>
        </CardContent>
      </Card>
    </div>
  </section>

  {/* Vétérinaires */}
  <section className="max-w-5xl mx-auto px-4 py-6 md:py-12 border-t border-border">
    <h2 className="font-serif text-2xl font-bold text-foreground mb-4">
      Vétérinaires et cliniques d'urgence dans le {page.department}
    </h2>
    <p className="text-base text-foreground/90 leading-relaxed mb-3">
      Chaque garde Guardiens s'accompagne d'un guide de maison où le propriétaire renseigne le vétérinaire habituel, la clinique d'urgence la plus proche et la conduite à tenir en cas d'incident. Dans le {page.department}, les cliniques vétérinaires de garde couvrent la plupart des villes moyennes, avec des permanences 24h/24 dans les chefs-lieux.
    </p>
    <p className="text-base text-foreground/80 leading-relaxed">
      Consultez <Link to="/observatoire-garde-animaux" className="underline text-primary">l'observatoire Guardiens de la garde d'animaux</Link> pour les chiffres nationaux (densité de vétérinaires, cliniques d'urgence, tarifs moyens). En cas d'imprévu majeur pendant une garde, le réseau <Link to="/gardien-urgence" className="underline text-primary">gardien d'urgence</Link> peut relayer votre gardien titulaire.
    </p>
  </section>

  {/* Fiches races */}
  <section className="max-w-5xl mx-auto px-4 py-6 md:py-12 border-t border-border">
    <h2 className="font-serif text-2xl font-bold text-foreground mb-4">
      Fiches races populaires
    </h2>
    <p className="text-base text-foreground/80 leading-relaxed mb-4">
      Selon la race de votre animal, les besoins de garde diffèrent : rythme des sorties, sensibilité au stress, comportement en présence d'inconnus. Nos fiches race, nationales, aident les gardiens à préparer chaque mission.
    </p>
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {[
        { slug: "border-collie-guide-race-complet", label: "Border Collie" },
        { slug: "bouledogue-francais-guide-race-complet", label: "Bouledogue français" },
        { slug: "malinois-guide-race-complet", label: "Malinois" },
        { slug: "labrador-retriever-guide-race", label: "Labrador Retriever" },
        { slug: "golden-retriever-guide-race-complet", label: "Golden Retriever" },
        { slug: "maine-coon-guide-race", label: "Maine Coon" },
      ].map((race) => (
        <Link key={race.slug} to={`/actualites/${race.slug}`} className="rounded-lg border border-border px-4 py-3 text-sm text-foreground hover:bg-accent transition-colors">
          {race.label}
        </Link>
      ))}
    </div>
  </section>

  {/* Why Guardiens */}
  <section className="max-w-5xl mx-auto px-4 py-6 md:py-12 border-t border-border">
 <h2 className="font-serif text-2xl font-bold text-foreground mb-8">
 Pourquoi Guardiens dans le {page.department} ?
 </h2>
 <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
 <Card>
 <CardContent className="p-4 md:p-6">
 <MapPin className="h-8 w-8 text-primary mb-3" />
 <h3 className="font-semibold text-foreground mb-2">Proximité</h3>
 <p className="text-sm text-muted-foreground">
 Des gardiens qui habitent dans votre département. On se connaît, on se fait confiance.
 </p>
 </CardContent>
 </Card>
 <Card>
 <CardContent className="p-4 md:p-6">
 <ShieldCheck className="h-8 w-8 text-primary mb-3" />
 <h3 className="font-semibold text-foreground mb-2">Confiance</h3>
 <p className="text-sm text-muted-foreground">
 Profils vérifiés, avis croisés détaillés, métriques de fiabilité.
 </p>
 </CardContent>
 </Card>
 <Card>
 <CardContent className="p-4 md:p-6">
 <Heart className="h-8 w-8 text-primary mb-3" />
 <h3 className="font-semibold text-foreground mb-2">Gratuit pour les propriétaires</h3>
 <p className="text-sm text-muted-foreground">
 Inscription gratuite. Pas de commission sur les gardes.
 </p>
 </CardContent>
 </Card>
 </div>
 </section>

 {/* Final CTA */}
 <section className="max-w-5xl mx-auto px-4 py-8 md:py-16 text-center">
 <h2 className="font-serif text-2xl md:text-3xl font-bold text-foreground mb-4">
 Rejoignez Guardiens dans le {page.department}
 </h2>
 <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
 Propriétaire ou gardien, rejoignez un réseau de confiance basé sur la proximité.
 </p>
 <Link to="/inscription">
 <Button size="lg" className="gap-2">
 Créer mon compte <ArrowRight className="h-4 w-4" />
 </Button>
 </Link>
 <p className="text-xs text-muted-foreground mt-3">
 Inscription en 2 minutes · Sans carte bancaire
 </p>
 </section>

 {/* JSON-LD: Breadcrumb */}
 <script
 type="application/ld+json"
 dangerouslySetInnerHTML={{
 __html: JSON.stringify({
 "@context": "https://schema.org",
 "@type": "BreadcrumbList",
 itemListElement: [
 { "@type": "ListItem", position: 1, name: "Guardiens", item: "https://guardiens.fr" },
 { "@type": "ListItem", position: 2, name: page.department, item: `https://guardiens.fr/departement/${page.slug}` },
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
 name: `Pet sitting & House sitting dans le ${page.department}`,
 description: `Service de garde d'animaux et house sitting gratuit pour les propriétaires dans le ${page.department}. ${cityPages.length} villes couvertes. Gardiens vérifiés.`,
 provider: {
 "@type": "Organization",
 name: "Guardiens",
 url: "https://guardiens.fr",
 },
 areaServed: {
 "@type": "AdministrativeArea",
 name: page.department,
 containedInPlace: {
 "@type": "AdministrativeArea",
 name: page.region || "France",
 },
 },
 serviceType: ["Pet sitting", "House sitting", "Garde d'animaux", "Gardiennage de maison"],
 offers: {
 "@type": "Offer",
 price: "0",
 priceCurrency: "EUR",
 eligibleCustomerType: "Owner",
 description: "Gratuit pour les propriétaires, sans abonnement requis.",
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
 name: `Comment trouver un pet sitter dans le ${page.department} ?`,
 acceptedAnswer: {
 "@type": "Answer",
 text: `Inscrivez-vous sans frais sur Guardiens et parcourez les ${cityPages.length} villes du ${page.department} pour trouver un gardien vérifié près de chez vous.`,
 },
 },
 {
 "@type": "Question",
 name: `Le house sitting dans le ${page.department} est-il sans frais ?`,
 acceptedAnswer: {
 "@type": "Answer",
 text: "Oui, Guardiens est gratuit pour les propriétaires. Le house sitting repose sur l'échange : le gardien loge sans frais en échange de la garde de vos animaux.",
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

export default DepartmentPage;
