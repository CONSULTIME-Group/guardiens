/**
 * Lot SORT13 (14/11/2026) : articles du journal affichés sous chaque onglet
 * de la rubrique « Entraide & sorties » (choix du poste SEO du conseil).
 * Titres et couvertures relevés en base le 14/11/2026 : la liste est écrite
 * ici pour s'afficher sans lecture supplémentaire (budget de requêtes de la
 * page) et pour être lue telle quelle par les robots.
 */
const COVERS = "https://erhccyqevdyevpyctsjj.supabase.co/storage/v1/object/public/property-photos/7bf29905-d372-4669-93b1-ec7def9b06d5/articles/covers/";

export interface HubArticle {
  slug: string;
  title: string;
  cover: string;
}

const article = (slug: string, title: string, cover = `${COVERS}${slug}-photo.webp`): HubArticle => ({ slug, title, cover });

const LIEN = article("technologie-recreer-lien-pres-de-chez-soi", "La technologie peut-elle recréer du lien près de chez soi ?", `${COVERS}technologie-recreer-lien-pres-de-chez-soi.webp`);

export const HUB_ARTICLES = {
  entraide: [
    article("idees-coups-de-main-entraide-pres-de-chez-soi", "30 idées de coups de main à demander ou proposer près de chez soi"),
    article("oser-demander-coup-de-main-pres-de-chez-soi", "Comment demander un coup de main près de chez soi, simplement"),
    article("se-sentir-utile-pres-de-chez-soi", "Se sentir utile près de chez soi : choisir un coup de main à sa mesure"),
  ],
  // Les articles propres aux sorties sont au plan éditorial du 14/11/2026.
  sorties: [LIEN],
  projets: [
    article("chantier-participatif-low-tech-participer-lancer-projet", "Chantier participatif et low-tech : comment choisir ou préparer un projet ?"),
    article("chantier-participatif-projet-collectif-cadre-legal", "Chantier participatif : responsabilité, assurance et cadre à vérifier", "https://images.unsplash.com/photo-1516880711640-ef7db81be3e1?w=600&q=75&auto=format&fit=crop"),
    article("apprendre-menuiserie-permaculture-ecoconstruction-gratuitement", "Apprendre la menuiserie, la permaculture ou l'écoconstruction : par où commencer ?"),
  ],
} as const satisfies Record<string, ReadonlyArray<HubArticle>>;
