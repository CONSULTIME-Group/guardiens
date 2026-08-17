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
 /**
 * Langues pour lesquelles CETTE page possède une traduction réelle et
 * indexable (hors fr, toujours inclus). Source unique consommée par le
 * composant de la page (prop `translatedLangs` de PageMeta) ET par
 * `generate-sitemap.mjs` (alternates hreflang) : une variante n'est
 * déclarée nulle part ailleurs que ce qu'elle existe vraiment.
 * Absent ou vide : aucune alternate, les variantes `?lang=` restent
 * noindex côté PageMeta.
 */
 translatedLangs?: readonly string[];
}

/**
 * Chemins privés, espace authentifié et endpoints système. Source de vérité
 * unique consommée par `scripts/generate-robots.mjs` pour générer les règles
 * `Disallow:`. Ne PAS dupliquer dans `public/robots.txt` (qui est généré).
 *
 * Règles d'inclusion :
 * - Toute route derrière auth (`/dashboard`, `/messages`, `/profile`…)
 * - Toute route avec donnée sensible (`/sits`, `/annonces/`, `/review/`…)
 * - Tout endpoint d'auth interne (`/auth/`, `/forgot-password`…)
 *
 * Les routes publiques marquées `index: false` dans staticRoutes (ex. `/login`,
 * `/recherche`) sont automatiquement ajoutées par le générateur, ne pas les
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
		title: "Garde d'animaux à domicile, maison et jardin | House-sitting | Guardiens",
		metaDescription: "Un gardien du coin pour votre maison, vos animaux et votre jardin. Garde d'animaux à domicile et house-sitting entre particuliers. Partout en France.",
 h1: "Guardiens, comme confier ses clés à quelqu'un du coin",
 sitemapPriority: "1.0",
 changeFreq: "daily",
 ogImage: DEFAULT_OG_IMAGE,
 // Seule page statique réellement traduite : l'allemand et l'italien ont
 // été retirés le 17/08/2026. Consommé par Landing.tsx et le sitemap.
 translatedLangs: ["en", "es"],
 },
 {
 path: "/tarifs",
		title: "Tarifs Guardiens : nos engagements de service | Guardiens",
		metaDescription: "Guardiens est gratuit aujourd'hui pour les propriétaires comme pour les gardiens, sans engagement, sans commission, sans frais cachés.",
		h1: "Tarifs Guardiens : nos engagements de service",
 sitemapPriority: "0.8",
 changeFreq: "weekly",
 },
 {
 path: "/faq",
 title: "FAQ, questions fréquentes | Guardiens",
 metaDescription: "FAQ Guardiens : toutes vos questions sur le house-sitting, l'entraide entre gens du coin, le parrainage, les gardiens d'urgence et la plateforme.",
 h1: "Questions fréquentes",
 sitemapPriority: "0.8",
 changeFreq: "weekly",
 },
 {
 path: "/devenir-home-sitter",
 title: "Devenir home-sitter, guide complet | Guardiens",
 metaDescription: "Comment devenir home-sitter en France : créer votre profil, décrocher vos premières gardes, gagner la confiance des propriétaires. Guide pratique.",
 h1: "Devenir home-sitter, guide complet",
 sitemapPriority: "0.8",
 changeFreq: "monthly",
 },
 {
 path: "/actualites",
 title: "Articles | Guardiens",
 metaDescription: "Conseils house-sitting, guides pratiques, témoignages et actualités de la communauté Guardiens. Tout pour bien préparer une garde.",
 h1: "Le journal",
 sitemapPriority: "0.8",
 changeFreq: "daily",
 },
 {
 path: "/petites-missions",
 title: "Petites missions, entraide communautaire | Guardiens",
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
 title: "Gardien d'urgence, garde d'animaux à domicile | Guardiens",
 metaDescription: "Besoin d'un gardien en urgence pour vos animaux ? Activez l'alerte Guardiens : les gardiens d'urgence près de chez vous sont notifiés en priorité.",
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
 title: "Guides locaux, villes dog-friendly | Guardiens",
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
 title: "Contact, nous écrire ou poser une question | Guardiens",
 metaDescription: "Contactez l'équipe Guardiens. Une question, une suggestion, un problème technique ou un partenariat ? Nous vous répondons sous 48 heures ouvrées.",
 h1: "Contactez-nous",
 sitemapPriority: "0.8",
 changeFreq: "weekly",
 },
 {
 path: "/a-propos",
 title: "À propos, notre histoire et nos valeurs | Guardiens",
 metaDescription: "Découvrez l'histoire de Guardiens, notre vision du house-sitting de proximité, nos engagements de confiance et l'équipe derrière la plateforme.",
 h1: "À propos de Guardiens",
 sitemapPriority: "0.6",
 changeFreq: "monthly",
 },
 {
 path: "/login",
 title: "Connexion, accéder à votre compte | Guardiens",
 metaDescription: "Connectez-vous à votre compte Guardiens pour gérer vos gardes, votre profil, vos messages et suivre vos animaux ou propriétaires de confiance.",
 h1: "Connexion",
 sitemapPriority: "0.4",
 changeFreq: "monthly",
 // Page d'auth : pas de valeur SEO + risque de duplication. Disallow + hors sitemap.
 index: false,
 },
 {
 path: "/inscription",
 title: "Inscription, créer un compte gratuit | Guardiens",
 metaDescription: "Rejoignez la communauté Guardiens. Inscription gratuite pour tous, aujourd'hui et sans deadline. Ni carte bancaire, ni engagement.",
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
 title: "Mentions légales, éditeur et hébergeur | Guardiens",
 metaDescription: "Mentions légales de la plateforme Guardiens : éditeur, hébergeur, directeur de publication, propriété intellectuelle et coordonnées de contact.",
  h1: "Mentions légales",
  sitemapPriority: "0.3",
  changeFreq: "yearly",
 },
 {
  path: "/auteurs/jeremie",
  title: "Jérémie, auteur Guardiens",
  metaDescription: "Jérémie, co-fondateur de Guardiens. 5 ans de house-sitting, 37 maisons gardées, 234 animaux accompagnés. Articles écrits depuis le terrain.",
  h1: "Jérémie",
  sitemapPriority: "0.5",
  changeFreq: "monthly",
 },
 {
  path: "/auteurs/elisa",
  title: "Elisa, auteure Guardiens",
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
  path: "/house-sitting",
  title: "House-sitting en France : toutes les villes couvertes | Guardiens",
  metaDescription: "Toutes les villes où Guardiens met en relation propriétaires et gardiens de maison et d'animaux. Choisissez votre ville et découvrez les gardes disponibles près de chez vous.",
  h1: "House-sitting en France, ville par ville",
  sitemapPriority: "0.9",
  changeFreq: "weekly",
 },
 {
  path: "/departement",
  title: "Garde d'animaux à domicile, maison et jardin, house-sitting par département | Guardiens",
  metaDescription: "Les 101 départements français couverts par Guardiens. Trouvez un gardien pour votre maison, vos animaux et votre jardin dans votre département, ou proposez vos services près de chez vous.",
  h1: "La garde d'animaux département par département",
  sitemapPriority: "0.9",
  changeFreq: "weekly",
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
 * Routes dynamiques, patterns utilisés par `validate-og-tags.mjs` pour valider
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
		// Instance représentative : l'article "c-est-quoi-le-house-sitting" (publié, indexable, stable)
		sampleParams: { slug: "c-est-quoi-le-house-sitting" },
		// Titre et description réels servis par la page (vérifiés strictement)
		sampleTitle: "House sitting : comment ça marche en France (guide 2026) | Guardiens",
		sampleDescription: "Le house sitting, c'est faire garder sa maison et ses animaux par un particulier qui loge sur place. Fonctionnement, coûts réels, cadre légal : le guide 2026.",
 },
 {
 pathPattern: "/house-sitting/:city",
 source: "sitemap",
 title: "House-sitting à {city}, garde d'animaux, de maison et de jardin | Guardiens",
 metaDescription: "Trouvez un gardien à {city} pour votre maison, vos animaux et votre jardin. House-sitting local entre propriétaires et gardiens du coin.",
 sitemapPriority: "0.8",
 changeFreq: "weekly",
 dynamicTitle: true, // les pages géo ont un titre SEO précis, non strict
 dynamicDescription: true,
 // Instance représentative : Lyon (silo géo phare)
 sampleParams: { city: "lyon" },
 },
];

