/**
 * Source unique de vérité pour toutes les pages publiques indexables.
 * Utilisé par : sitemap generator, PageMeta, navigation SEO.
 */

export const SITE_URL = "https://guardiens.fr";

/**
 * Image OG par défaut utilisée sur toutes les pages sans image dédiée.
 * Référence unique : doit rester synchronisée avec index.html et PageMeta.tsx.
 */
export const DEFAULT_OG_IMAGE = `${SITE_URL}/og-default.jpg`;

export interface SiteRoute {
 path: string;
 title: string;
 metaDescription: string;
 h1: string;
 sitemapPriority: string;
 changeFreq: "daily" | "weekly" | "monthly" | "yearly";
 /** URL absolue de l'image OG. Si omise, DEFAULT_OG_IMAGE est utilisée. */
 ogImage?: string;
 /**
 * `true` (défaut) : page publique indexable (Allow + présente dans sitemap).
 * `false` : page publique mais NON indexable (Disallow dans robots.txt
 * + exclue du sitemap + meta robots noindex côté composant).
 * Sert pour les routes outils (`/recherche`) ou auth (`/login`).
 *
 * IMPORTANT : la cohérence triple (robots / sitemap / <meta>) est assurée
 * par les générateurs (`generate-robots.mjs`, `generate-sitemap.mjs`) qui
 * lisent ce flag. Toute exception côté composant doit être justifiée.
 */
 index?: boolean;
}

/**
 * Chemins privés — espace authentifié et endpoints système. Source de vérité
 * unique consommée par `scripts/generate-robots.mjs` pour générer les règles
 * `Disallow:`. Ne PAS dupliquer dans `public/robots.txt` (qui est généré).
 *
 * Règles d'inclusion :
 * - Toute route derrière auth (`/dashboard`, `/messages`, `/profile`…)
 * - Toute route avec donnée sensible (`/sits`, `/annonces/`, `/review/`…)
 * - Tout endpoint d'auth interne (`/auth/`, `/forgot-password`…)
 *
 * Les routes publiques marquées `index: false` dans staticRoutes (ex. `/login`,
 * `/recherche`) sont automatiquement ajoutées par le générateur — ne pas les
 * lister ici en double.
 */
export const privateDisallowPaths: string[] = [
 "/admin",
 "/dashboard",
 "/messages",
 "/mon-abonnement",
 "/notifications",
  "/sits",
  // NB : `/annonces/` NE doit PAS être bloqué. Les annonces individuelles
  // (`/annonces/:id`) sont publiques et indexables conditionnellement
  // (filtre qualité dans PublicSitDetail via <meta robots>). Bloquer le
  // préfixe ici empêcherait Google de crawler une page pourtant publique.
  "/recherche-gardiens",
 "/review/",
 "/house-guide/",
 "/profile",
 "/owner-profile",
 "/favoris",
 "/mes-avis",
 "/settings",
 "/forgot-password",
 "/reset-password",
 "/unsubscribe",
 "/test-accord",
 "/auth/",
];

/**
 * Configuration d'un groupe de routes dynamiques (mêmes patterns de title/description).
 * Utilisé par le script `validate-og-tags.mjs` pour valider en masse les pages
 * générées à partir d'un template (articles, villes, profils…).
 *
 * - `pathPattern` : pattern avec paramètres nommés, ex. "/actualites/:slug".
 * - `source` : d'où tirer les instances concrètes.
 * - "sitemap" : lit `sitemap.xml` et filtre les URLs dont le path correspond au pattern.
 * - "inline" : liste explicite `instances` (ex. [{ slug: "foo" }]).
 * - `title` / `metaDescription` : templates avec placeholders `{param}` (params du pattern).
 * Par défaut, seuls le titre et la description sont interpolés ; si une page
 * a réellement un titre unique (ex. titre d'article), mettez `dynamicTitle: true`
 * pour indiquer au script de ne vérifier que la présence d'OG (pas la valeur exacte).
 */
export interface DynamicRouteConfig {
 pathPattern: string;
 source: "sitemap" | "inline";
 instances?: Record<string, string>[];
 title: string;
 metaDescription: string;
 ogImage?: string;
 sitemapPriority: string;
 changeFreq: "daily" | "weekly" | "monthly" | "yearly";
 /** Si true, le script vérifie la présence des balises OG sans comparer la valeur exacte. */
 dynamicTitle?: boolean;
 /** Idem pour la description (ex. extraite du corps de l'article). */
 dynamicDescription?: boolean;
 /**
 * Exemple de paramètres (slug/id/city…) pour valider strictement le rendu d'une
 * instance représentative. Le script construit la page correspondante, interpole
 * `title` et `metaDescription` avec ces valeurs et compare exactement, même si
 * `dynamicTitle` / `dynamicDescription` sont à true pour le reste du groupe.
 * Ex: { slug: "nouveaux-tarifs-2026" } pour /actualites/:slug.
 */
 sampleParams?: Record<string, string>;
 /**
 * Titre attendu précis pour l'instance `sampleParams`. Si absent, le script
 * interpole `title` avec `sampleParams`. Utile quand le titre réel diffère du
 * pattern générique (ex. titre d'article éditorial).
 */
 sampleTitle?: string;
 /** Description attendue précise pour l'instance `sampleParams`. */
 sampleDescription?: string;
}

export const staticRoutes: SiteRoute[] = [
 {
 path: "/",
title: "Garde d'animaux à domicile entre particuliers | Guardiens",
metaDescription: "Trouvez un gardien du coin pour votre maison et vos animaux. Home sitting et entraide entre particuliers, vérifiés et notés. Partout en France.",
 h1: "Guardiens — Comme confier ses clés à quelqu'un du coin",
 sitemapPriority: "1.0",
 changeFreq: "daily",
 ogImage: DEFAULT_OG_IMAGE,
 },
 {
 path: "/tarifs",
title: "Tarifs — 6,99\u00A0€/mois pour les gardiens | Guardiens",
 metaDescription: "6,99\u00A0€/mois pour les gardiens, sans engagement. À 0 € pour les propriétaires. Sans commission, sans frais cachés.",
 h1: "Nos tarifs",
 sitemapPriority: "0.8",
 changeFreq: "weekly",
 },
 {
 path: "/faq",
 title: "FAQ — Questions fréquentes | Guardiens",
 metaDescription: "FAQ Guardiens : toutes vos questions sur le house-sitting, l'entraide entre gens du coin, le parrainage, les gardiens d'urgence et la plateforme.",
 h1: "Questions fréquentes",
 sitemapPriority: "0.8",
 changeFreq: "weekly",
 },
 {
 path: "/actualites",
 title: "Articles | Guardiens",
 metaDescription: "Conseils house-sitting, guides pratiques, témoignages et actualités de la communauté Guardiens. Tout pour bien préparer une garde.",
 h1: "Actualités",
 sitemapPriority: "0.8",
 changeFreq: "daily",
 },
 {
 path: "/petites-missions",
 title: "Petites missions — Entraide communautaire | Guardiens",
 metaDescription: "Petites missions d'entraide entre gens du coin. Sans frais, sans argent qui circule. Arrosage du jardin, promenade de chien, courses, partage de compétences.",
 h1: "Petites missions",
 sitemapPriority: "0.8",
 changeFreq: "weekly",
 },
 {
 path: "/petites-missions/lyon",
 title: "Petites missions d'entraide à domicile à Lyon | Guardiens",
 metaDescription: "Petites missions d'entraide à domicile à Lyon : garde animaux, jardin, courses. Sans contrepartie financière, entre gens du coin. Publiez ou aidez.",
 h1: "Petites missions d'entraide à domicile à Lyon",
 sitemapPriority: "0.7",
 changeFreq: "weekly",
 },
 {
 path: "/gardien-urgence",
 title: "Gardien d'urgence — Garde en moins de 24h | Guardiens",
 metaDescription: "Besoin d'un gardien en urgence pour vos animaux ? Activez l'alerte Guardiens et trouvez un gardien vérifié près de chez vous en moins de 24 heures.",
 h1: "Gardien d'urgence",
 sitemapPriority: "0.8",
 changeFreq: "weekly",
 },
 {
 path: "/pros",
 title: "Annuaire des pros animaliers près de chez vous | Guardiens",
 metaDescription: "Vétérinaires, éducateurs, toiletteurs, ostéopathes, transporteurs, photographes animaliers vérifiés. Trouvez le bon pro pour vos animaux, partout en France.",
 h1: "Pros animaliers près de chez vous",
 sitemapPriority: "0.8",
 changeFreq: "weekly",
 },
 {
 path: "/guides",
 title: "Guides locaux — Villes dog-friendly | Guardiens",
 metaDescription: "Guides locaux Guardiens : parcs à chien, vétérinaires, cafés dog-friendly et bonnes adresses dans chaque ville.",
 h1: "Guides locaux",
 sitemapPriority: "0.8",
 changeFreq: "weekly",
 },
  {
   path: "/annonces",
   title: "Annonces de garde d'animaux à domicile en France | Guardiens",
   metaDescription: "Toutes les annonces de garde de chats, chiens et NAC à domicile, partout en France. Filtres par ville, département et critères. Consultation libre, inscription gratuite pour postuler.",
   h1: "Annonces de garde d'animaux à domicile",
   sitemapPriority: "0.9",
   changeFreq: "daily",
   // Hub canonique des annonces de garde (modèle public, sans sidebar).
  },
  {
   path: "/recherche",
   title: "Annonces de garde d'animaux à domicile près de chez vous | Guardiens",
   metaDescription: "Découvrez les gardes d'animaux à domicile près de chez vous : chats, chiens, NAC. Consultez les annonces en libre accès, postulez après inscription gratuite.",
   h1: "Annonces de garde d'animaux à domicile",
   sitemapPriority: "0.4",
   changeFreq: "daily",
   // Alias outil pour membres connectés (rendu dans AppLayout avec sidebar).
   // Canonical pointe vers /annonces côté Helmet pour éviter la duplication.
   index: false,
  },
 {
 path: "/contact",
 title: "Contact — Nous écrire ou poser une question | Guardiens",
 metaDescription: "Contactez l'équipe Guardiens. Une question, une suggestion, un problème technique ou un partenariat ? Nous vous répondons sous 48 heures ouvrées.",
 h1: "Contactez-nous",
 sitemapPriority: "0.8",
 changeFreq: "weekly",
 },
 {
 path: "/a-propos",
 title: "À propos — Notre histoire et nos valeurs | Guardiens",
 metaDescription: "Découvrez l'histoire de Guardiens, notre vision du house-sitting de proximité, nos engagements de confiance et l'équipe derrière la plateforme.",
 h1: "À propos de Guardiens",
 sitemapPriority: "0.6",
 changeFreq: "monthly",
 },
 {
 path: "/login",
 title: "Connexion — Accéder à votre compte | Guardiens",
 metaDescription: "Connectez-vous à votre compte Guardiens pour gérer vos gardes, votre profil, vos messages et suivre vos animaux ou propriétaires de confiance.",
 h1: "Connexion",
 sitemapPriority: "0.4",
 changeFreq: "monthly",
 // Page d'auth : pas de valeur SEO + risque de duplication. Disallow + hors sitemap.
 index: false,
 },
 {
 path: "/inscription",
 title: "Inscription — Créer un compte à 0 € | Guardiens",
 metaDescription: "Rejoignez la communauté Guardiens. Inscription à 0 € pour les propriétaires, 6,99\u00A0€/mois pour les gardiens, sans engagement.",
 h1: "Créer un compte",
 sitemapPriority: "0.6",
 changeFreq: "monthly",
 // Anti-cannibalisation brand : on laisse remonter / et /tarifs sur la marque.
 index: false,
 },
 {
 path: "/cgu",
 title: "Conditions générales d'utilisation | Guardiens",
 metaDescription: "Consultez les conditions générales d'utilisation de la plateforme Guardiens : engagements, responsabilités, droits et obligations des membres.",
 h1: "Conditions générales d'utilisation",
 sitemapPriority: "0.3",
 changeFreq: "yearly",
 },
 {
 path: "/cgs",
 title: "Conditions générales de services | Guardiens",
 metaDescription: "Conditions générales de services Guardiens : tarifs, paiement, résiliation simplifiée et droit de rétractation.",
 h1: "Conditions générales de services",
 sitemapPriority: "0.3",
 changeFreq: "yearly",
 },
 {
 path: "/confidentialite",
 title: "Politique de confidentialité | Guardiens",
 metaDescription: "Comment Guardiens protège vos données personnelles : collecte, conservation, partage, cookies et exercice de vos droits RGPD en France.",
 h1: "Politique de confidentialité",
 sitemapPriority: "0.3",
 changeFreq: "yearly",
 },
 {
 path: "/mentions-legales",
 title: "Mentions légales — Éditeur et hébergeur | Guardiens",
 metaDescription: "Mentions légales de la plateforme Guardiens : éditeur, hébergeur, directeur de publication, propriété intellectuelle et coordonnées de contact.",
  h1: "Mentions légales",
  sitemapPriority: "0.3",
  changeFreq: "yearly",
 },
 {
  path: "/auteurs/jeremie",
  title: "Jérémie — Auteur Guardiens",
  metaDescription: "Jérémie, co-fondateur de Guardiens. 5 ans de house-sitting, 37 maisons gardées, 234 animaux accompagnés. Articles écrits depuis le terrain.",
  h1: "Jérémie",
  sitemapPriority: "0.5",
  changeFreq: "monthly",
 },
 {
  path: "/auteurs/elisa",
  title: "Elisa — Auteure Guardiens",
  metaDescription: "Elisa, co-fondatrice de Guardiens. 5 ans de house-sitting à deux. Sensibilité particulière à l'expérience humaine et à l'attention portée aux animaux.",
  h1: "Elisa",
  sitemapPriority: "0.5",
  changeFreq: "monthly",
 },
 {
  path: "/observatoire-garde-animaux",
  title: "Observatoire de la garde d'animaux à domicile en France | Guardiens",
  metaDescription: "Chiffres-clés sur la garde d'animaux à domicile en France : nombre d'animaux accompagnés, modèle économique, vérifications, badges. Datapoints sourcés Guardiens.",
  h1: "Observatoire de la garde d'animaux à domicile",
  sitemapPriority: "0.9",
  changeFreq: "monthly",
 },
 {
  path: "/races",
  title: "Races d'animaux : guides de garde à domicile | Guardiens",
  metaDescription: "Conseils de garde par race : tempérament, besoins, recommandations pour gardiens. Chiens, chats, NAC, équidés. Guides rédigés à partir de gardes réelles.",
  h1: "Guides de garde par race",
  sitemapPriority: "0.8",
  changeFreq: "weekly",
 },
];

/**
 * Routes dynamiques — patterns utilisés par `validate-og-tags.mjs` pour valider
 * en masse les pages générées (articles de blog, silos géo…).
 *
 * Les instances concrètes sont découvertes automatiquement via le sitemap.xml
 * servi sur l'origine cible, ce qui évite la duplication et reste aligné avec
 * ce que Google voit effectivement.
 */
export const dynamicRoutes: DynamicRouteConfig[] = [
 {
 pathPattern: "/actualites/:slug",
 source: "sitemap",
 title: "Article", // titre unique par article, non vérifié exactement
 metaDescription: "Article",
 sitemapPriority: "0.6",
 changeFreq: "monthly",
 dynamicTitle: true,
 dynamicDescription: true,
 // Instance représentative : l'article "nouveaux-tarifs-2026" (contenu stable, pilier SEO)
 sampleParams: { slug: "nouveaux-tarifs-2026" },
 // Titre et description réels servis par la page (vérifiés strictement)
 sampleTitle: "Tarifs Guardiens 2026 — 6,99\u00A0€/mois, 7 jours offerts | Guardiens",
 sampleDescription: "Les tarifs officiels Guardiens pour 2026 : 6,99\u00A0€/mois pour les gardiens avec 7 jours offerts, à 0 € pour les propriétaires. Sans commission ni frais cachés.",
 },
 {
 pathPattern: "/house-sitting/:city",
 source: "sitemap",
 title: "House-sitting à {city} | Guardiens",
 metaDescription: "Trouvez un gardien de maison à {city}. House-sitting local, propriétaires et gardiens vérifiés.",
 sitemapPriority: "0.8",
 changeFreq: "weekly",
 dynamicTitle: true, // les pages géo ont un titre SEO précis, non strict
 dynamicDescription: true,
 // Instance représentative : Lyon (silo géo phare)
 sampleParams: { city: "lyon" },
 },
];

