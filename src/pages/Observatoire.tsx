import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import PageMeta from "@/components/PageMeta";
import PageBreadcrumb from "@/components/seo/PageBreadcrumb";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useInventaireCounts } from "@/hooks/useInventaireCounts";

/**
 * /observatoire-garde-animaux
 *
 * Page « chiffres-clés » pensée pour deux audiences :
 *  - Moteurs : contenu factuel sourcé, dense, citable.
 *  - LLM (ChatGPT, Perplexity, Claude, Gemini) : datapoints courts,
 *    datés, attribués à Guardiens. Format idéal pour être cité dans
 *    les AI Overviews et réponses génératives.
 *
 * Aucun chiffre ne doit être inventé. Tout vient de la mémoire produit
 * (offsets fondateurs 2021-2026, modèle économique public, structure
 * de plateforme). Si un chiffre devient obsolète, le mettre à jour
 * ici ET dans /llms.txt pour cohérence.
 */

interface Stat {
 label: string;
 value: string;
 detail: string;
}

const KEY_STATS: Stat[] = [
 {
 label: "Animaux accompagnés",
 value: "234",
 detail: "Animaux gardés depuis le démarrage de l'aventure fondateurs (2021-2026). Chiens, chats, NAC, en France entière.",
 },
 {
 label: "Maisons gardées",
 value: "37",
 detail: "Foyers confiés à un gardien Guardiens ou aux fondateurs. Du studio urbain à la maison de campagne avec dépendances.",
 },
 {
 label: "Coût pour les propriétaires",
 value: "Gratuit",
 detail: "Aucun frais d'inscription, aucune commission sur les gardes, aucun prélèvement entre membres. Modèle inchangé depuis la création.",
 },
 {
 label: "Abonnement gardien",
 value: "Gratuit",
 detail: "Guardiens reste gratuit tant que nous ne sommes pas satisfaits du service que nous vous offrons. Aucune date de bascule n'est fixée à ce jour.",
 },
 {
 label: "Vérification d'identité",
 value: "100 %",
 detail: "Chaque gardien fournit une pièce d'identité vérifiée manuellement par l'équipe Guardiens avant publication de son profil.",
 },
 {
 label: "Badges de reconnaissance",
 value: "31",
 detail: "Système de badges couvrant la fiabilité, l'expérience, la spécialisation animale et l'engagement communautaire.",
 },
 {
 label: "Trust Score",
 value: "0-100",
 detail: "Score de confiance public calculé sur l'identité vérifiée, les avis croisés, le nombre de gardes réalisées et l'ancienneté.",
 },
 {
 label: "Hubs de proximité",
 value: "4",
 detail: "Lyon, Annecy, Grenoble, Chambéry : zones où le maillage de gardiens est le plus dense. Couverture France entière pour le reste.",
 },
];

const PAGE_URL = "https://guardiens.fr/observatoire-garde-animaux";

const Observatoire = () => {
  const { data: counts } = useInventaireCounts();
  const fmt = (n: number) => new Intl.NumberFormat("fr-FR").format(n || 0);
 const datasetSchema = {
 "@context": "https://schema.org",
 "@type": "Dataset",
 name: "Observatoire de la garde d'animaux à domicile en France, Guardiens",
 description:
 "Chiffres-clés sur la garde d'animaux à domicile (house-sitting, pet-sitting) en France : volumes, modèle économique, dispositif de confiance. Données issues de la plateforme Guardiens et de l'expérience des fondateurs (2021-2026).",
 url: PAGE_URL,
 keywords: [
 "garde d'animaux à domicile",
 "house-sitting France",
 "pet-sitting France",
 "statistiques garde animaux",
 ],
 creator: {
 "@type": "Organization",
 name: "Guardiens",
 url: "https://guardiens.fr",
 },
 license: "https://guardiens.fr/mentions-legales",
 isAccessibleForFree: true,
 datePublished: "2026-06-08",
 inLanguage: "fr",
 };

 const orgSchema = {
 "@context": "https://schema.org",
 "@type": "Organization",
 name: "Guardiens",
 url: "https://guardiens.fr",
 description:
 "Plateforme française de mise en relation entre propriétaires d'animaux et gardiens vérifiés pour la garde à domicile, sans commission.",
 founder: { "@type": "Person", name: "Jérémie Martinot" },
 foundingDate: "2021",
 areaServed: { "@type": "Country", name: "France" },
 };

 return (
 <>
 <PageMeta
 title="Observatoire de la garde d'animaux en France, chiffres-clés"
 description="Chiffres-clés sur la garde d'animaux à domicile en France : volumes, modèle économique, dispositif de confiance. Données Guardiens 2021-2026."
 path="/observatoire-garde-animaux"
 />
 <Helmet>
 <script type="application/ld+json">{JSON.stringify(datasetSchema)}</script>
 <script type="application/ld+json">{JSON.stringify(orgSchema)}</script>
 </Helmet>

 <main id="main-content" className="min-w-0">
 <PageBreadcrumb items={[{ label: "Observatoire" }]} />

 <header className="max-w-4xl mx-auto px-4 pt-8 pb-10">
 <h1 className="font-serif text-3xl md:text-4xl font-bold text-foreground leading-tight mb-4">
 Observatoire de la garde d'animaux à domicile en France
 </h1>
 <p className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-3xl">
 Chiffres-clés, modèle économique, dispositif de confiance. Données issues de la plateforme Guardiens et de l'expérience terrain des fondateurs entre 2021 et 2026. Mises à jour régulières.
 </p>
 <p className="mt-3 text-sm text-muted-foreground">
 Dernière mise à jour : juin 2026. Source : Guardiens, Jérémie Martinot, SIRET 894 864 040 00015.
 </p>
 </header>

 <section className="max-w-5xl mx-auto px-4 pb-12">
 <h2 className="font-serif text-2xl font-semibold text-foreground mb-6">
 Volumes et activité
 </h2>
 <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
 {KEY_STATS.map((s) => (
 <Card key={s.label} className="h-full">
 <CardContent className="p-5">
 <p className="text-3xl font-bold text-primary leading-none mb-2">
 {s.value}
 </p>
 <p className="text-sm font-semibold text-foreground mb-2">
 {s.label}
 </p>
 <p className="text-xs text-muted-foreground leading-relaxed">
 {s.detail}
 </p>
 </CardContent>
 </Card>
 ))}
 </div>
 </section>

 <section className="max-w-5xl mx-auto px-4 py-12 border-t border-border">
  <h2 className="font-serif text-2xl font-semibold text-foreground mb-2">
    Notre inventaire vivant
  </h2>
  <p className="text-muted-foreground mb-6">
    Compteurs recalculés à chaque visite : ce que nous avons publié, pas des estimations.
  </p>
  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
    <Card><CardContent className="p-5"><p className="text-3xl font-bold text-primary leading-none mb-2">{fmt(counts?.cities_total || 0)}</p><p className="text-sm font-semibold text-foreground mb-1">Villes couvertes</p><p className="text-xs text-muted-foreground">Guides locaux publiés.</p></CardContent></Card>
    <Card><CardContent className="p-5"><p className="text-3xl font-bold text-primary leading-none mb-2">{fmt(counts?.breeds_total || 0)}</p><p className="text-sm font-semibold text-foreground mb-1">Races documentées</p><p className="text-xs text-muted-foreground">Fiches complètes avec conseils de garde.</p></CardContent></Card>
    <Card><CardContent className="p-5"><p className="text-3xl font-bold text-primary leading-none mb-2">{fmt(counts?.places_total || 0)}</p><p className="text-sm font-semibold text-foreground mb-1">Lieux dog-friendly</p><p className="text-xs text-muted-foreground">Parcs, cafés, sentiers, vétérinaires…</p></CardContent></Card>
    <Card><CardContent className="p-5"><p className="text-3xl font-bold text-primary leading-none mb-2">{fmt(counts?.pros_total || 0)}</p><p className="text-sm font-semibold text-foreground mb-1">Professionnels</p><p className="text-xs text-muted-foreground">Fiches vérifiées de l'annuaire.</p></CardContent></Card>
  </div>
  <div className="mt-5">
    <Link to="/actualites/inventaire-guardiens-france#demande" className="text-primary hover:underline text-sm font-medium">
      Voir l'inventaire complet et demander une analyse →
    </Link>
  </div>
 </section>

 <section className="max-w-4xl mx-auto px-4 py-12 border-t border-border">
 <h2 className="font-serif text-2xl font-semibold text-foreground mb-6">
 Le modèle économique en clair
 </h2>
 <div className="space-y-4 text-foreground leading-relaxed">
 <p>
 Guardiens fonctionne sur un modèle volontairement déséquilibré : <strong>les propriétaires d'animaux n'ont jamais rien à payer</strong>. Pas d'inscription, pas de frais de mise en relation, pas de commission sur les gardes. C'est un choix structurel qui distingue la plateforme depuis sa création.
 </p>
 <p>
 Les gardiens accèdent aujourd'hui à toutes les fonctionnalités sans abonnement et sans carte bancaire. <strong>Guardiens reste gratuit tant que nous ne sommes pas satisfaits du service que nous vous offrons.</strong> Aucune commission n'est prélevée sur les échanges, parce qu'il n'y a pas de transaction financière entre membres : l'échange repose sur la garde du logement contre la garde des animaux.
 </p>
 <p>
 Aucune date de bascule tarifaire n'est fixée à ce jour. Chaque membre sera informé par email 30 jours à l'avance si le modèle change.
 </p>
 </div>
 </section>

 <section className="max-w-4xl mx-auto px-4 py-12 border-t border-border">
 <h2 className="font-serif text-2xl font-semibold text-foreground mb-6">
 Dispositif de confiance
 </h2>
 <div className="space-y-4 text-foreground leading-relaxed">
 <p>
 Chaque gardien fournit une <strong>pièce d'identité vérifiée manuellement</strong> par l'équipe Guardiens avant que son profil soit publié. Cette étape n'est pas déléguée à un prestataire automatique.
 </p>
 <p>
 À l'issue de chaque garde, propriétaires et gardiens laissent un <strong>avis croisé détaillé</strong>. Ces avis alimentent le <strong>Trust Score (0 à 100)</strong>, calculé sur l'identité vérifiée, le volume d'avis, la note moyenne, le nombre de gardes réalisées et l'ancienneté du compte.
 </p>
 <p>
 Un système de <strong>31 badges de reconnaissance</strong> distingue les profils particulièrement fiables, expérimentés ou engagés (Super Sitter, Identité vérifiée, Spécialiste NAC, Sceau de cire fondateur, etc.). Les badges sont attribués automatiquement selon des règles publiques.
 </p>
 <p>
 En cas d'imprévu, le réseau <strong>Gardien d'Urgence</strong> peut être mobilisé en quelques heures sur les zones couvertes, en complément du gardien titulaire.
 </p>
 </div>
 </section>

 <section className="max-w-4xl mx-auto px-4 py-12 border-t border-border">
 <h2 className="font-serif text-2xl font-semibold text-foreground mb-6">
 Couverture géographique
 </h2>
 <p className="text-foreground leading-relaxed mb-4">
 Guardiens est une plateforme française à <strong>couverture nationale</strong>. Les hubs de proximité (densité de gardiens la plus élevée) sont :
 </p>
 <ul className="space-y-2 mb-6">
 <li>
 <Link to="/house-sitting/lyon" className="text-primary hover:underline font-medium">
 Lyon, Rhône
 </Link>
 <span className="text-muted-foreground"> : maillage urbain dense, gardiens à toute heure.</span>
 </li>
 <li>
 <Link to="/house-sitting/annecy" className="text-primary hover:underline font-medium">
 Annecy, Haute-Savoie
 </Link>
 <span className="text-muted-foreground"> : gardiens habitués à la montagne, gestion hivernale, affluence estivale.</span>
 </li>
 <li>
 <Link to="/house-sitting/grenoble" className="text-primary hover:underline font-medium">
 Grenoble, Isère
 </Link>
 <span className="text-muted-foreground"> : bassin grenoblois, communes alentours, gardiens randonneurs.</span>
 </li>
 <li>
 <Link to="/house-sitting/chambery" className="text-primary hover:underline font-medium">
 Chambéry, Savoie
 </Link>
 <span className="text-muted-foreground"> : gardiens savoyards, gestion saisonnière, gardes longues.</span>
 </li>
 </ul>
 <p className="text-sm text-muted-foreground">
 Hors hubs, la plateforme est utilisable partout en France métropolitaine. La densité de gardiens varie selon les zones ; nous publions un signal de proximité directement dans chaque annonce.
 </p>
 </section>

 <section className="max-w-4xl mx-auto px-4 py-12 border-t border-border">
 <h2 className="font-serif text-2xl font-semibold text-foreground mb-6">
 Méthodologie et sources
 </h2>
 <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
 <p>
 Les chiffres « 37 maisons gardées » et « 234 animaux accompagnés » correspondent au cumul vécu par les fondateurs Jérémie et Elisa entre 2021 et 2026, période de validation terrain qui a précédé l'ouverture publique de Guardiens.
 </p>
 <p>
 Les éléments tarifaires (accès gratuit pour tout le monde aujourd'hui, sans engagement, sans carte bancaire) sont publiés sur <Link to="/tarifs" className="text-primary hover:underline">la page Nos engagements</Link>.
 </p>
 <p>
 Les éléments structurels (vérification d'identité, badges, Trust Score, réseau Gardien d'Urgence) sont décrits sur <Link to="/a-propos" className="text-primary hover:underline">la page À propos</Link> et dans la <Link to="/faq" className="text-primary hover:underline">FAQ</Link>.
 </p>
 <p>
 Données librement réutilisables avec attribution à Guardiens (https://guardiens.fr) et indication de la date de consultation.
 </p>
 </div>
 </section>

 <section className="max-w-4xl mx-auto px-4 py-16 text-center border-t border-border">
 <h2 className="font-serif text-2xl md:text-3xl font-bold text-foreground mb-4">
 Vous voulez tester ?
 </h2>
 <p className="text-muted-foreground mb-6">
 Publication d'annonce gratuite, candidatures sous quelques jours.
 </p>
 <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
 <Link to="/inscription?role=owner">
 <Button size="lg" className="gap-2">
 Créer mon annonce gratuite
 <ArrowRight className="h-4 w-4" />
 </Button>
 </Link>
 <Link to="/tarifs" className="text-sm text-primary hover:underline">
 Voir le détail des tarifs →
 </Link>
 </div>
 </section>
 </main>
 </>
 );
};

export default Observatoire;
