/**
 * Source unique de vérité pour toutes les pages publiques indexables.
 * Utilisé par : sitemap generator, PageMeta, navigation SEO.
 */

export interface SiteRoute {
  path: string;
  title: string;
  metaDescription: string;
  h1: string;
  sitemapPriority: string;
  changeFreq: "daily" | "weekly" | "monthly" | "yearly";
}

export const staticRoutes: SiteRoute[] = [
  {
    path: "/",
    title: "Guardiens — House-sitting de confiance en Auvergne-Rhône-Alpes",
    metaDescription: "Trouvez un gardien de maison et d'animaux près de chez vous en Auvergne-Rhône-Alpes. Gardiens vérifiés, proximité, confiance. Gratuit.",
    h1: "Guardiens — Comme confier ses clés à quelqu'un du coin",
    sitemapPriority: "1.0",
    changeFreq: "weekly",
  },
  {
    path: "/tarifs",
    title: "Tarifs — Abonnement gardien | Guardiens",
    metaDescription: "49€/an pour les gardiens. Gratuit pour les propriétaires. Un seul prix, pas de commission, pas de piège.",
    h1: "Nos tarifs",
    sitemapPriority: "0.8",
    changeFreq: "monthly",
  },
  {
    path: "/faq",
    title: "FAQ — Questions fréquentes | Guardiens",
    metaDescription: "Tout ce que vous devez savoir sur Guardiens : fonctionnement, inscription, gardes, sécurité, abonnement.",
    h1: "Questions fréquentes",
    sitemapPriority: "0.7",
    changeFreq: "weekly",
  },
  {
    path: "/actualites",
    title: "Blog — Actualités et conseils | Guardiens",
    metaDescription: "Conseils house-sitting, guides pratiques et actualités de la communauté Guardiens en Auvergne-Rhône-Alpes.",
    h1: "Actualités",
    sitemapPriority: "0.8",
    changeFreq: "daily",
  },
  {
    path: "/petites-missions",
    title: "Petites missions — Entraide communautaire | Guardiens",
    metaDescription: "Coups de main de quartier : arrosage, promenade, nourrissage. L'entraide de proximité, sans argent.",
    h1: "Petites missions",
    sitemapPriority: "0.7",
    changeFreq: "daily",
  },
  {
    path: "/gardien-urgence",
    title: "Gardien d'urgence — Garde en moins de 24h | Guardiens",
    metaDescription: "Besoin d'un gardien en urgence ? Trouvez un gardien disponible près de chez vous en moins de 24 heures.",
    h1: "Gardien d'urgence",
    sitemapPriority: "0.7",
    changeFreq: "weekly",
  },
  {
    path: "/guides",
    title: "Guides locaux — Villes dog-friendly | Guardiens",
    metaDescription: "Découvrez nos guides locaux : parcs, vétérinaires, balades et bons plans pour gardiens et animaux.",
    h1: "Guides locaux",
    sitemapPriority: "0.8",
    changeFreq: "weekly",
  },
  {
    path: "/recherche",
    title: "Recherche — Trouver un gardien ou une garde | Guardiens",
    metaDescription: "Recherchez des gardes disponibles et des gardiens vérifiés près de chez vous en Auvergne-Rhône-Alpes.",
    h1: "Recherche",
    sitemapPriority: "0.7",
    changeFreq: "daily",
  },
  {
    path: "/contact",
    title: "Contact | Guardiens",
    metaDescription: "Contactez l'équipe Guardiens. Une question, une suggestion, un problème ? On vous répond rapidement.",
    h1: "Contactez-nous",
    sitemapPriority: "0.5",
    changeFreq: "monthly",
  },
  {
    path: "/a-propos",
    title: "À propos | Guardiens",
    metaDescription: "Découvrez l'histoire de Guardiens, le house-sitting de proximité en Auvergne-Rhône-Alpes.",
    h1: "À propos de Guardiens",
    sitemapPriority: "0.5",
    changeFreq: "monthly",
  },
  {
    path: "/login",
    title: "Connexion | Guardiens",
    metaDescription: "Connectez-vous à votre compte Guardiens pour gérer vos gardes et votre profil.",
    h1: "Connexion",
    sitemapPriority: "0.4",
    changeFreq: "monthly",
  },
  {
    path: "/register",
    title: "Inscription | Guardiens",
    metaDescription: "Rejoignez la communauté Guardiens. Inscription gratuite pour les propriétaires, 49€/an pour les gardiens.",
    h1: "Créer un compte",
    sitemapPriority: "0.6",
    changeFreq: "monthly",
  },
  {
    path: "/cgu",
    title: "Conditions générales d'utilisation | Guardiens",
    metaDescription: "Consultez les conditions générales d'utilisation de la plateforme Guardiens.",
    h1: "Conditions générales d'utilisation",
    sitemapPriority: "0.3",
    changeFreq: "yearly",
  },
  {
    path: "/confidentialite",
    title: "Politique de confidentialité | Guardiens",
    metaDescription: "Comment Guardiens protège vos données personnelles. Notre politique de confidentialité.",
    h1: "Politique de confidentialité",
    sitemapPriority: "0.3",
    changeFreq: "yearly",
  },
  {
    path: "/mentions-legales",
    title: "Mentions légales | Guardiens",
    metaDescription: "Mentions légales de la plateforme Guardiens.",
    h1: "Mentions légales",
    sitemapPriority: "0.3",
    changeFreq: "yearly",
  },
];

export const SITE_URL = "https://guardiens.fr";
