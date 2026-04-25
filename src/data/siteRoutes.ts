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
}

/**
 * Configuration d'un groupe de routes dynamiques (mêmes patterns de title/description).
 * Utilisé par le script `validate-og-tags.mjs` pour valider en masse les pages
 * générées à partir d'un template (articles, villes, profils…).
 *
 * - `pathPattern` : pattern avec paramètres nommés, ex. "/actualites/:slug".
 * - `source`      : d'où tirer les instances concrètes.
 *     - "sitemap"  : lit `sitemap.xml` et filtre les URLs dont le path correspond au pattern.
 *     - "inline"   : liste explicite `instances` (ex. [{ slug: "foo" }]).
 * - `title` / `metaDescription` : templates avec placeholders `{param}` (params du pattern).
 *   Par défaut, seuls le titre et la description sont interpolés ; si une page
 *   a réellement un titre unique (ex. titre d'article), mettez `dynamicTitle: true`
 *   pour indiquer au script de ne vérifier que la présence d'OG (pas la valeur exacte).
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
    title: "Guardiens — Partez l'esprit tranquille",
    metaDescription: "Un gardien de votre région s'occupe de votre maison et de vos animaux pendant vos absences. Gratuit pour les propriétaires.",
    h1: "Guardiens — Comme confier ses clés à quelqu'un du coin",
    sitemapPriority: "1.0",
    changeFreq: "weekly",
    ogImage: DEFAULT_OG_IMAGE,
  },
  {
    path: "/tarifs",
    title: "Tarifs — 6,99€/mois pour les gardiens | Guardiens",
    metaDescription: "6,99€/mois pour les gardiens, 7 jours d'essai offerts. Gratuit pour les propriétaires. Sans commission, sans frais cachés.",
    h1: "Nos tarifs",
    sitemapPriority: "0.8",
    changeFreq: "monthly",
  },
  {
    path: "/faq",
    title: "FAQ — Questions fréquentes | Guardiens",
    metaDescription: "Toutes vos questions sur Guardiens : fonctionnement, inscription, déroulé d'une garde, sécurité, abonnement, paiement et annulation.",
    h1: "Questions fréquentes",
    sitemapPriority: "0.7",
    changeFreq: "weekly",
  },
  {
    path: "/actualites",
    title: "Blog — Actualités et conseils | Guardiens",
    metaDescription: "Conseils house-sitting, guides pratiques, témoignages et actualités de la communauté Guardiens. Tout pour bien préparer une garde.",
    h1: "Actualités",
    sitemapPriority: "0.8",
    changeFreq: "daily",
  },
  {
    path: "/petites-missions",
    title: "Petites missions — Entraide communautaire | Guardiens",
    metaDescription: "Coups de main de quartier : arrosage des plantes, promenade, nourrissage des animaux. L'entraide locale entre voisins, sans argent ni commission.",
    h1: "Petites missions",
    sitemapPriority: "0.7",
    changeFreq: "daily",
  },
  {
    path: "/gardien-urgence",
    title: "Gardien d'urgence — Garde en moins de 24h | Guardiens",
    metaDescription: "Besoin d'un gardien en urgence pour vos animaux ? Activez l'alerte Guardiens et trouvez un gardien vérifié près de chez vous en moins de 24 heures.",
    h1: "Gardien d'urgence",
    sitemapPriority: "0.7",
    changeFreq: "weekly",
  },
  {
    path: "/guides",
    title: "Guides locaux — Villes dog-friendly | Guardiens",
    metaDescription: "Découvrez nos guides locaux par ville : parcs à chiens, vétérinaires, balades, marchés et bons plans pour gardiens et propriétaires d'animaux.",
    h1: "Guides locaux",
    sitemapPriority: "0.8",
    changeFreq: "weekly",
  },
  {
    path: "/recherche",
    title: "Recherche — Trouver un gardien ou une garde | Guardiens",
    metaDescription: "Recherchez des gardes disponibles et des gardiens vérifiés près de chez vous. Filtrez par dates, type d'animal, distance et compétences.",
    h1: "Recherche",
    sitemapPriority: "0.7",
    changeFreq: "daily",
  },
  {
    path: "/contact",
    title: "Contact — Nous écrire ou poser une question | Guardiens",
    metaDescription: "Contactez l'équipe Guardiens. Une question, une suggestion, un problème technique ou un partenariat ? Nous vous répondons sous 48 heures ouvrées.",
    h1: "Contactez-nous",
    sitemapPriority: "0.5",
    changeFreq: "monthly",
  },
  {
    path: "/a-propos",
    title: "À propos — Notre histoire et nos valeurs | Guardiens",
    metaDescription: "Découvrez l'histoire de Guardiens, notre vision du house-sitting de proximité, nos engagements de confiance et l'équipe derrière la plateforme.",
    h1: "À propos de Guardiens",
    sitemapPriority: "0.5",
    changeFreq: "monthly",
  },
  {
    path: "/login",
    title: "Connexion — Accéder à votre compte | Guardiens",
    metaDescription: "Connectez-vous à votre compte Guardiens pour gérer vos gardes, votre profil, vos messages et suivre vos animaux ou propriétaires de confiance.",
    h1: "Connexion",
    sitemapPriority: "0.4",
    changeFreq: "monthly",
  },
  {
    path: "/inscription",
    title: "Inscription — Créer un compte gratuit | Guardiens",
    metaDescription: "Rejoignez la communauté Guardiens. Inscription gratuite pour les propriétaires, 6,99€/mois pour les gardiens avec 7 jours d'essai sans engagement.",
    h1: "Créer un compte",
    sitemapPriority: "0.6",
    changeFreq: "monthly",
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
    sampleTitle: "Tarifs Guardiens 2026 — 6,99€/mois, 7 jours offerts | Guardiens",
    sampleDescription: "Les tarifs officiels Guardiens pour 2026 : 6,99€/mois pour les gardiens avec 7 jours offerts, gratuit pour les propriétaires. Sans commission ni frais cachés.",
  },
  {
    pathPattern: "/house-sitting/:city",
    source: "sitemap",
    title: "House-sitting à {city} | Guardiens",
    metaDescription: "Trouvez un gardien de maison à {city}. House-sitting local, propriétaires et gardiens vérifiés.",
    sitemapPriority: "0.7",
    changeFreq: "weekly",
    dynamicTitle: true, // les pages géo ont un titre SEO précis, non strict
    dynamicDescription: true,
    // Instance représentative : Lyon (silo géo phare)
    sampleParams: { city: "lyon" },
  },
];

