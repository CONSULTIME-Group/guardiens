import { Link } from "react-router-dom";
import PageMeta from "@/components/PageMeta";
import PageBreadcrumb from "@/components/seo/PageBreadcrumb";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useInventaireCounts } from "@/hooks/useInventaireCounts";
import { useSpeciesBreakdown, type BreakdownRow } from "@/hooks/useSpeciesBreakdown";
import { BADGE_DEFINITIONS } from "@/components/badges/badge-definitions";
import { ORGANIZATION_NODE } from "@/lib/seo/organizationNode";

/** Nombre de badges dérivé du catalogue, jamais recopié à la main. */
const BADGE_COUNT = Object.keys(BADGE_DEFINITIONS).length;


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
 value: "Aucun frais",
 detail: "Aucun frais d'inscription, aucune commission sur les gardes, aucun prélèvement entre membres. Modèle inchangé depuis la création.",
 },
 {
 label: "Abonnement gardien",
 value: "Aucun frais",
 detail: "Accès complet aux fonctionnalités, sans limite, sans engagement et sans carte bancaire.",
 },

 {
 label: "Vérification d'identité",
 value: "Ouverte à tous",
 detail: "La vérification d'identité est ouverte à tous les membres. Vous envoyez une pièce d'identité, elle est analysée automatiquement, et les dossiers qui ne passent pas ce premier contrôle sont revus par l'équipe. Les profils validés affichent l'écusson « Identité vérifiée ».",
 },
 {
 label: "Badges de reconnaissance",
 value: String(BADGE_COUNT),
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
 detail: "Lyon, Annecy, Grenoble, Chambéry : les zones où la densité de gardiens est la plus forte. La couverture, elle, s'étend à l'ensemble du territoire (voir la section de données ci-dessous).",
 },
];

const PAGE_URL = "https://guardiens.fr/observatoire-garde-animaux";

const SPECIES_LABELS: Record<string, string> = {
  cat: "Chats",
  dog: "Chiens",
  farm_animal: "Animaux de ferme",
  rodent: "Rongeurs",
  horse: "Chevaux",
  nac: "NAC",
  bird: "Oiseaux",
  fish: "Poissons",
  reptile: "Reptiles",
};

const AUTONOMY_LABELS: Record<string, string> = {
  all_day: "Toute la journée",
  "6h": "Jusqu'à six heures",
  "2h": "Deux heures maximum",
  never: "Jamais seul",
};

const ACTIVITY_LABELS: Record<string, string> = {
  calm: "Calme",
  moderate: "Modéré",
  sportive: "Sportif",
};

const HOUSING_LABELS: Record<string, string> = {
  house: "Maison",
  apartment: "Appartement",
  farm: "Ferme",
  other: "Autre",
};

const ENVIRONMENT_LABELS: Record<string, string> = {
  countryside: "Campagne",
  city_center: "Centre-ville",
  suburban: "Périurbain",
  seaside: "Bord de mer",
  mountain: "Montagne",
  forest: "Forêt",
};

const formatFrDate = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
};

const formatPct = (n: number) =>
  new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(n || 0);

const BreakdownList = ({
  title,
  rows,
  labels,
}: {
  title: string;
  rows: BreakdownRow[];
  labels: Record<string, string>;
}) => {
  if (!rows?.length) return null;
  return (
    <div>
      <h3 className="font-serif text-lg font-semibold text-foreground mb-4">{title}</h3>
      <ul className="space-y-3">
        {rows.map((row) => (
          <li key={row.cle}>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="font-medium text-foreground">{labels[row.cle] ?? row.cle}</span>
              <span className="text-muted-foreground tabular-nums">
                {new Intl.NumberFormat("fr-FR").format(row.nombre)} ({formatPct(row.part_pourcent)} %)
              </span>
            </div>
            <div className="mt-1 h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${Math.min(100, Math.max(0, row.part_pourcent || 0))}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};



const Observatoire = () => {
  const { data: counts } = useInventaireCounts();
  const { data: species, isError: speciesError } = useSpeciesBreakdown();
  const fmt = (n: number) => new Intl.NumberFormat("fr-FR").format(n || 0);

 const datasetSchema = {
 "@context": "https://schema.org",
 "@type": "Dataset",
 name: "Observatoire de la garde d'animaux à domicile en France, Guardiens",
 description:
 "Chiffres-clés sur la garde d'animaux à domicile (house-sitting, pet-sitting) en France : volumes, modèle économique, dispositif de confiance. Le jeu de données décrit également les membres de la plateforme Guardiens, leurs animaux (espèces, autonomie, niveau d'activité) et leurs logements (type, environnement), ainsi que l'expérience des fondateurs (2021-2026).",
 url: PAGE_URL,
 variableMeasured: [
 "Répartition des animaux par espèce",
 "Répartition des animaux par durée de solitude supportée",
 "Répartition des animaux par niveau d'activité",
 "Répartition des logements par type",
 "Répartition des logements par environnement",
 ],
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
 ...(species?.calcule_le ? { dateModified: species.calcule_le.slice(0, 10) } : {}),

 inLanguage: "fr",
 };

 const orgSchema = { "@context": "https://schema.org", ...ORGANIZATION_NODE };

 const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
   { "@type": "ListItem", position: 1, name: "Accueil", item: "https://guardiens.fr" },
   { "@type": "ListItem", position: 2, name: "Observatoire", item: PAGE_URL },
  ],
 };

 const articleSchema = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: "Observatoire de la garde d'animaux à domicile en France",
  description:
   "Chiffres-clés sur la garde d'animaux à domicile en France : volumes, modèle économique, dispositif de confiance, répartitions par espèce, autonomie, activité, type de logement et environnement.",
  mainEntityOfPage: PAGE_URL,
  url: PAGE_URL,
  inLanguage: "fr",
  datePublished: "2026-06-08",
  ...(species?.calcule_le ? { dateModified: species.calcule_le.slice(0, 10) } : {}),
  author: { "@type": "Person", name: "Jérémie Martinot" },
  publisher: { "@id": "https://guardiens.fr/#organization" },
  isAccessibleForFree: true,
 };

 const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
   {
    "@type": "Question",
    name: "D'où viennent les chiffres de cet observatoire ?",
    acceptedAnswer: {
     "@type": "Answer",
     text: "Les répartitions (espèces, autonomie, activité, logements) sont calculées directement sur les profils, animaux et logements déclarés par les membres de Guardiens. Les repères historiques proviennent de l'expérience des fondateurs entre 2021 et 2026.",
    },
   },
   {
    "@type": "Question",
    name: "À quelle fréquence les données sont-elles mises à jour ?",
    acceptedAnswer: {
     "@type": "Answer",
     text: "Les répartitions sont recalculées automatiquement à partir de la base de la plateforme. La date de dernier calcul est affichée sur la page lorsqu'elle est disponible.",
    },
   },
   {
    "@type": "Question",
    name: "La garde à domicile implique-t-elle un paiement entre particuliers ?",
    acceptedAnswer: {
     "@type": "Answer",
     text: "Non. Sur Guardiens, la garde repose sur un échange : le gardien loge sur place et veille sur les animaux et le logement, sans transaction financière directe entre membres et sans commission de la plateforme.",
    },
   },
   {
    "@type": "Question",
    name: "Les profils sont-ils vérifiés ?",
    acceptedAnswer: {
     "@type": "Answer",
     text: "La vérification d'identité repose sur une revue manuelle des documents transmis. Les profils validés portent un écusson dédié, complété par les avis croisés et les indicateurs de fiabilité.",
    },
   },
  ],
 };

 return (
 <>
 <PageMeta
 title="Observatoire de la garde d'animaux à domicile en France | Guardiens"
 description="Chiffres-clés sur la garde d'animaux à domicile en France : nombre d'animaux accompagnés, modèle économique, vérifications, badges. Datapoints sourcés Guardiens."
 path="/observatoire-garde-animaux"
 jsonLd={[datasetSchema, orgSchema, breadcrumbSchema, articleSchema, faqSchema]}
 ready={Boolean(species) || speciesError}
 />




 <div className="min-w-0">
 <PageBreadcrumb items={[{ label: "Observatoire" }]} />

 <header className="max-w-4xl mx-auto px-4 pt-8 pb-10">
 <h1 className="font-serif text-3xl md:text-4xl font-bold text-foreground leading-tight mb-4">
 Observatoire de la garde d'animaux à domicile en France
 </h1>
 <p className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-3xl">
 Chiffres-clés, modèle économique, dispositif de confiance. Données issues de la plateforme Guardiens et de l'expérience terrain des fondateurs entre 2021 et 2026. Mises à jour régulières.
 </p>
 {species?.calcule_le ? (
 <p className="mt-3 text-sm text-muted-foreground">
 Dernière mise à jour : {formatFrDate(species.calcule_le)}. Source : Guardiens, Jérémie Martinot, SIRET 894 864 040 00015.
 </p>
 ) : (
 <p className="mt-3 text-sm text-muted-foreground">
 Source : Guardiens, Jérémie Martinot, SIRET 894 864 040 00015.
 </p>
 )}

 </header>

 <section id="datapoints" className="max-w-5xl mx-auto px-4 pb-12 scroll-mt-24">
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
 </section>

 <section className="max-w-5xl mx-auto px-4 py-12 border-t border-border">
   <h2 className="font-serif text-2xl font-semibold text-foreground mb-2">
     Que disent les profils de nos membres ?
   </h2>
   <p className="text-muted-foreground mb-6 max-w-3xl leading-relaxed">
     Ces chiffres viennent des profils créés sur Guardiens et se recalculent à chaque visite. Ils décrivent nos membres, leurs animaux et leurs logements, pas les gardes réalisées.
   </p>

    {speciesError ? (
      <p className="text-sm text-muted-foreground">Les données de la plateforme ne sont pas disponibles pour le moment.</p>
    ) : !species ? (
      <p className="text-sm text-muted-foreground">Chargement des données en cours.</p>
    ) : (
     <>
       <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-10">
         <Card><CardContent className="p-5"><p className="text-3xl font-bold text-primary leading-none mb-2">{fmt(species.total_membres)}</p><p className="text-sm font-semibold text-foreground mb-1">Membres inscrits</p><p className="text-xs text-muted-foreground">Propriétaires et gardiens confondus.</p></CardContent></Card>
         <Card><CardContent className="p-5"><p className="text-3xl font-bold text-primary leading-none mb-2">{fmt(species.departements_couverts)}</p><p className="text-sm font-semibold text-foreground mb-1">Départements couverts</p><p className="text-xs text-muted-foreground">Départements où au moins un membre est inscrit.</p></CardContent></Card>
         <Card><CardContent className="p-5"><p className="text-3xl font-bold text-primary leading-none mb-2">{fmt(species.total_animaux)}</p><p className="text-sm font-semibold text-foreground mb-1">Animaux déclarés</p><p className="text-xs text-muted-foreground">Renseignés par les membres sur leur profil.</p></CardContent></Card>
         <Card><CardContent className="p-5"><p className="text-3xl font-bold text-primary leading-none mb-2">{fmt(species.total_logements)}</p><p className="text-sm font-semibold text-foreground mb-1">Logements référencés</p><p className="text-xs text-muted-foreground">Logements décrits par les membres.</p></CardContent></Card>
       </div>

       <div className="grid gap-10 md:grid-cols-2">
         <BreakdownList title="Quelles espèces vivent chez nos membres ?" rows={species.par_espece} labels={SPECIES_LABELS} />
         <BreakdownList title="Combien de temps ces animaux peuvent-ils rester seuls ?" rows={species.par_autonomie} labels={AUTONOMY_LABELS} />
         <BreakdownList title="Quel est leur niveau d'activité ?" rows={species.par_niveau_activite} labels={ACTIVITY_LABELS} />
         <BreakdownList title="Dans quels logements vivent-ils ?" rows={species.par_type_logement} labels={HOUSING_LABELS} />
         <BreakdownList title="Dans quel environnement ?" rows={species.par_environnement} labels={ENVIRONMENT_LABELS} />
       </div>

       {species.calcule_le ? (
         <p className="mt-8 text-sm text-muted-foreground">
           Calculé le {formatFrDate(species.calcule_le)}.
         </p>
       ) : null}
     </>
   )}
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
 Les gardiens accèdent aujourd'hui à toutes les fonctionnalités sans abonnement. <strong>Guardiens reste gratuit tant que nous ne sommes pas satisfaits du service que nous vous offrons. Vous avez accès à tout, sans limite, sans engagement. Vous serez prévenu à l'avance quand cela changera.</strong> Aucune commission n'est prélevée sur les échanges, parce qu'il n'y a pas de transaction financière entre membres : l'échange repose sur la garde du logement contre la garde des animaux.
 </p>

 </div>
 </section>

 <section className="max-w-4xl mx-auto px-4 py-12 border-t border-border">
 <h2 className="font-serif text-2xl font-semibold text-foreground mb-6">
 Dispositif de confiance
 </h2>
 <div className="space-y-4 text-foreground leading-relaxed">
 <p>
 La <strong>vérification d'identité</strong> est ouverte à tous les membres. Vous envoyez une pièce d'identité, elle est analysée automatiquement, et les dossiers qui ne passent pas ce premier contrôle sont revus par l'équipe. Les profils validés affichent l'écusson « Identité vérifiée ». Regardez cet écusson avant de choisir.
 </p>
 <p>
 À l'issue de chaque garde, propriétaires et gardiens laissent un <strong>avis croisé détaillé</strong>. Ces avis alimentent le <strong>Trust Score (0 à 100)</strong>, calculé sur l'identité vérifiée, le volume d'avis, la note moyenne, le nombre de gardes réalisées et l'ancienneté du compte.
 </p>
 <p>
 Un système de <strong>{BADGE_COUNT} badges de reconnaissance</strong> distingue les profils particulièrement fiables, expérimentés ou engagés (Super Sitter, Identité vérifiée, Spécialiste NAC, Sceau de cire fondateur, etc.). Les badges sont attribués automatiquement selon des règles publiques.
 </p>
 <p>
 En cas d'imprévu, une alerte prioritaire peut être envoyée aux membres éligibles du réseau <strong>Gardien d'Urgence</strong> sur les zones couvertes, en complément du gardien titulaire.
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
 Les éléments tarifaires (accès complet, sans limite et sans engagement) sont publiés sur <Link to="/tarifs" className="text-primary hover:underline">la page Nos engagements</Link>.
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
 Publication d'annonce sans engagement, candidatures sous quelques jours.
 </p>
 <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
 <Link to="/inscription?role=owner">
 <Button size="lg" className="gap-2">
 Créer mon annonce
 <ArrowRight className="h-4 w-4" />

 </Button>
 </Link>
 <Link to="/tarifs" className="text-sm text-primary hover:underline">
 Voir le détail des tarifs →
 </Link>
 </div>
 </section>
 </div>
 </>
 );
};

export default Observatoire;
