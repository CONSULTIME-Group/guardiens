import { Link } from "react-router-dom";
import { marked } from "marked";
import DOMPurify from "dompurify";
import { Search, TreePine, Users, CheckCircle2, Lightbulb, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getOptimizedImageUrl } from "@/lib/imageOptim";
import { interpolatePlaceholders, type PlaceholderValue } from "@/lib/contentPlaceholders";

// ── Supabase Storage base URL ──────────────────────────────
const SB = "https://erhccyqevdyevpyctsjj.supabase.co/storage/v1/object/public/property-photos/articles-inline";


const ARTICLE_IMAGES: Record<string, string> = {
  // ── LOT 1, migrated to Supabase Storage ──────────────────
  "/images/parc-tete-dor-chiens-lyon.jpg": `${SB}/parc-tete-dor-chiens-lyon.webp`,
  "/images/golden-retriever-tete-dor-lyon.jpg": `${SB}/golden-retriever-tete-dor-lyon.webp`,
  "/images/parc-parilly-labrador-lyon.jpg": `${SB}/parc-parilly-labrador-lyon.webp`,
  "/images/grenoble-confiance-cafe.jpg": `${SB}/grenoble-confiance-cafe.webp`,
  "/images/border-collie-feyssine-lyon.jpg": `${SB}/border-collie-feyssine-lyon.webp`,
  "/images/lyon-confiance-cafe.jpg": `${SB}/lyon-confiance-cafe.webp`,
  "/images/boom-petsitting-confluence-lyon.jpg": `${SB}/boom-petsitting-confluence-lyon.webp`,
  "/images/golden-retriever-interieur-vieux-lyon.jpg": `${SB}/golden-retriever-interieur-vieux-lyon.webp`,
  "/images/villa-ouest-lyonnais-vide.jpg": `${SB}/villa-ouest-lyonnais-vide.webp`,
  "/images/berger-australien-feyssine-lyon.jpg": `${SB}/berger-australien-feyssine-lyon.webp`,
  "/images/saint-etienne-confiance-cafe.jpg": `${SB}/saint-etienne-confiance-cafe.webp`,
  "/images/garde-animaux-croix-rousse-lyon.jpg": `${SB}/garde-animaux-croix-rousse-lyon.webp`,

  // ── LOT 2, migrated to Supabase Storage ──────────────────
  "/images/lyon-hero-quais.jpg": `${SB}/lyon-hero-quais.webp`,
  "/images/lyon-chat-fenetre.jpg": `${SB}/lyon-chat-fenetre.webp`,
  "/images/venissieux-parilly-chat.jpg": `${SB}/venissieux-parilly-chat.webp`,
  "/images/chambery-elephants-chien.jpg": `${SB}/chambery-elephants-chien.webp`,
  "/images/saint-etienne-parc-chien.jpg": `${SB}/saint-etienne-parc-chien.webp`,
  "/images/golden-retriever-quais-lyon.jpg": `${SB}/golden-retriever-quais-lyon.webp`,
  "/images/valence-chat-drome.jpg": `${SB}/valence-chat-drome.webp`,
  "/images/garde-animaux-appartement-lyon.jpg": `${SB}/garde-animaux-appartement-lyon.webp`,
  "/images/valence-confiance-cafe.jpg": `${SB}/valence-confiance-cafe.webp`,
  "/images/berger-australien-interieur-lyon.jpg": `${SB}/berger-australien-interieur-lyon.webp`,
  "/images/gardien-bellecour-lyon.jpg": `${SB}/gardien-bellecour-lyon.webp`,
  "/images/clermont-jaude-chien.jpg": `${SB}/clermont-jaude-chien.webp`,
  "/images/boom-petsitting-homeoffice-lyon.jpg": `${SB}/boom-petsitting-homeoffice-lyon.webp`,
  "/images/valence-parc-chien.jpg": `${SB}/valence-parc-chien.webp`,
  "/images/villeurbanne-gratteciel-chien.jpg": `${SB}/villeurbanne-gratteciel-chien.webp`,

  // ── LOT 3, migrated to Supabase Storage ──────────────────
  "/images/grenoble-bastille-chien.jpg": `${SB}/grenoble-bastille-chien.webp`,
  "/images/grenoble-chat-chartreuse.jpg": `${SB}/grenoble-chat-chartreuse.webp`,
  "/images/saint-etienne-chat-forez.jpg": `${SB}/saint-etienne-chat-forez.webp`,
  "/images/chambery-chat-bauges.jpg": `${SB}/chambery-chat-bauges.webp`,
  "/images/chambery-confiance-rue.jpg": `${SB}/chambery-confiance-rue.webp`,
  "/images/aix-les-bains-villa-lac.jpg": `${SB}/aix-les-bains-villa-lac.webp`,
  "/images/border-collie-interieur-croix-rousse.jpg": `${SB}/border-collie-interieur-croix-rousse.webp`,
  "/images/bouledogue-francais-vieux-lyon.jpg": `${SB}/bouledogue-francais-vieux-lyon.webp`,
  "/images/bouledogue-francais-interieur-lyon6.jpg": `${SB}/bouledogue-francais-interieur-lyon6.webp`,
  "/images/fondateurs-guardiens-quais-lyon.jpg": `${SB}/fondateurs-guardiens-quais-lyon.webp`,
  "/images/profil-gardien-laptop-lyon.jpg": `${SB}/profil-gardien-laptop-lyon.webp`,
  "/images/gardien-teletravail-ouest-lyon.jpg": `${SB}/gardien-teletravail-ouest-lyon.webp`,
  "/images/pension-chien-alternatives-cover.jpg": `${SB}/pension-chien-alternatives-cover.webp`,
  "/images/garde-animal-hospitalisation-cover.jpg": `${SB}/garde-animal-hospitalisation-cover.webp`,
  "/images/garde-chat-domicile-lyon.jpg": `${SB}/garde-chat-domicile-lyon.webp`,
  "/images/garde-chat-presquile-lyon.jpg": `${SB}/garde-chat-presquile-lyon.webp`,
  "/images/s-absenter-animal-guide-cover.jpg": `${SB}/s-absenter-animal-guide-cover.webp`,
};

export function resolveImagePath(path: string): string {
  return ARTICLE_IMAGES[path] || path;
}

function resolveArticleImages(html: string): string {
  return html.replace(/src="(\/images\/[^"]+)"/g, (match, path) => {
    const resolved = ARTICLE_IMAGES[path];
    if (!resolved) return match;
    // Apply Supabase Image Transformations if it's a Supabase URL
    const optimized = getOptimizedImageUrl(resolved, 800, 75);
    return `src="${optimized}"`;
  });
}

/**
 * Surcharge des blocs d'appel à l'action, par slug d'article.
 *
 * Par défaut tous les articles reçoivent les blocs orientés garde d'animaux.
 * Certains articles portent un autre sujet, et un bloc hors sujet y coûte
 * plus qu'il ne rapporte. Ajouter une entrée ici suffit à les réorienter.
 */
type CtaCopy = {
  midText: string;
  midPrimary: { label: string; href: string; role: string };
  midSecondary?: { label: string; href: string; role: string };
  endHeading: string;
  endText: string;
  endPrimary: { label: string; href: string; role: string };
  endSecondary?: { label: string; href: string; role: string };
};

const CTA_DEFAUT: CtaCopy = {
  midText: "Vous êtes propriétaire d'animaux ou vous aimez les animaux ?",
  midPrimary: { label: "Rejoindre la communauté", href: "/inscription?role=owner", role: "owner" },
  midSecondary: { label: "Devenir gardien", href: "/inscription?role=sitter", role: "sitter" },
  endHeading: "Prêt à rejoindre la communauté ?",
  endText: "Créez votre profil et rejoignez les gardiens de votre secteur.",
  endPrimary: { label: "Créer mon profil propriétaire", href: "/inscription?role=owner", role: "owner" },
  endSecondary: { label: "Devenir gardien", href: "/inscription?role=sitter", role: "sitter" },
};

/**
 * Le rôle "projet" est volontairement hors de la liste traitée par
 * adaptEndCTAsForRole : ces libellés survivent tels quels, y compris pour
 * une personne connectée, parce qu'ils portent le sujet de l'article.
 */
export const EXPAT_OWNER_ARTICLE_SLUG = "expat-proprietaire-faire-garder-maison-etranger";
export const REUNION_OWNER_ARTICLE_SLUG = "garde-kaz-house-sitting-la-reunion";
export const TAHITI_OWNER_ARTICLE_SLUG = "garde-maison-animaux-tahiti";
export const CALEDONIE_OWNER_ARTICLE_SLUG = "garde-maison-animaux-nouvelle-caledonie";
export const PENSION_OWNER_ARTICLE_SLUG = "pension-chien-alternatives-guide";
export const LONG_STAY_OWNER_ARTICLE_SLUG = "vacances-longues-garde-animal-2-semaines";
export const CHOOSING_OWNER_ARTICLE_SLUG = "choisir-gardien-bons-criteres";
export const NO_PETS_OWNER_ARTICLE_SLUG = "garder-une-maison-ce-n-est-pas-garder-un-animal";
export const LISTING_OWNER_ARTICLE_SLUG = "rediger-bonne-annonce-house-sitting";
export const PREPARATION_OWNER_ARTICLE_SLUG = "preparer-maison-avant-garde";
export const CHRISTMAS_OWNER_ARTICLE_SLUG = "house-sitting-noel-fetes-fin-annee";
export const WEEKEND_OWNER_ARTICLE_SLUG = "house-sitting-week-end-court-sejour-aura";
export const WINTER_OWNER_ARTICLE_SLUG = "house-sitting-hiver-montagne-savoie";
export const GARDEN_OWNER_ARTICLE_SLUG = "entretenir-jardin-pendant-absence";
export const PLANTS_OWNER_ARTICLE_SLUG = "arroser-plantes-pendant-vacances-guide";
export const SECURITY_OWNER_ARTICLE_SLUG = "securiser-maison-absence-prolongee";
export const FRANCE_EXPAT_OWNER_ARTICLE_SLUG = "francais-etranger-garde-maison-france";
export const RECIPROCAL_OWNER_ARTICLE_SLUG = "echange-reciproque-garde-maison-expatries";
export const DOG_OWNER_ARTICLE_SLUG = "garde-chien-faire-garder-son-chien";
export const CAT_OWNER_ARTICLE_SLUG = "garde-chat-domicile-house-sitting";
export const TRUST_OWNER_ARTICLE_SLUG = "securite-confiance-house-sitting";
export const AGREEMENT_OWNER_ARTICLE_SLUG = "commodat-garde-guardiens";
export const INCIDENT_OWNER_ARTICLE_SLUG = "gerer-imprevu-pendant-garde";
export const HOSPITAL_OWNER_ARTICLE_SLUG = "faire-garder-animal-pendant-hospitalisation";
// Ces guides répondent aussi à un besoin immédiat : le CTA reste en fin de page, pour anticiper une garde.
export const PREPARATION_ONLY_OWNER_ARTICLE_SLUGS = new Set<string>([INCIDENT_OWNER_ARTICLE_SLUG, HOSPITAL_OWNER_ARTICLE_SLUG, "accueillir-gardien-bonnes-pratiques", "checklist-partir-vacances-animaux", "bien-etre-animal-pendant-absence", "s-absenter-avec-animal-guide-solutions-2026", "veterinaire-urgence-annecy-haute-savoie", "veterinaire-urgence-grenoble-isere", "veterinaire-urgence-lyon-guide", "garde-ferme-animaux-monts-du-lyonnais", "meilleures-villes-vivre-chien-autour-lyon", "parcs-balades-chiens-annecy-guide", "parcs-balades-chiens-grenoble-guide", "bengal-guide-race", "berger-allemand-guide-race", "berger-australien-guide-race", "border-collie-guide-race-complet", "bouledogue-francais-guide-race-complet", "cavalier-king-charles-guide-race", "golden-retriever-guide-race-complet", "labrador-retriever-guide-race", "maine-coon-guide-race", "malinois-guide-race-complet", "persan-guide-race", "siamois-guide-race"]);
export const WELCOME_OWNER_ARTICLE_SLUG = "accueillir-gardien-bonnes-pratiques";
export const DEPARTURE_OWNER_ARTICLE_SLUG = "checklist-partir-vacances-animaux";
export const AT_HOME_OWNER_ARTICLE_SLUG = "garde-animaux-domicile-chien-chat";
export const WELFARE_OWNER_ARTICLE_SLUG = "bien-etre-animal-pendant-absence";
export const ENTRUST_HOME_OWNER_ARTICLE_SLUG = "confier-sa-maison-absence-risques";
export const ABSENCE_SITUATIONS_OWNER_ARTICLE_SLUG = "s-absenter-avec-animal-guide-solutions-2026";
export const LYON_HOLIDAY_DOG_OWNER_ARTICLE_SLUG = "ou-faire-garder-chien-lyon-vacances";
export const LYON_CAT_OWNER_ARTICLE_SLUG = "garde-chat-domicile-lyon";
export const CROIX_ROUSSE_OWNER_ARTICLE_SLUG = "garde-animaux-croix-rousse-lyon";
export const PRESQUILE_CAT_OWNER_ARTICLE_SLUG = "garde-chat-presquile-lyon";
export const LYON_HUB_OWNER_ARTICLE_SLUG = "pet-sitting-lyon-guide-complet";
export const WEST_LYON_OWNER_ARTICLE_SLUG = "pet-sitting-lyon-ouest-lyonnais";
export const FRANCE_PRACTICAL_OWNER_ARTICLE_SLUG = "house-sitting-auvergne-rhone-alpes";
export const SUMMER_OWNER_ARTICLE_SLUG = "house-sitting-ete-aura-guide";
export const SAVOIE_ANIMALS_OWNER_ARTICLE_SLUG = "garde-animaux-savoie-guide";
export const HAUTE_SAVOIE_STAY_OWNER_ARTICLE_SLUG = "house-sitting-haute-savoie-annecy-megeve";
export const ANNECY_VET_CONTACT_ARTICLE_SLUG = "veterinaire-urgence-annecy-haute-savoie";
export const GRENOBLE_VET_CONTACT_ARTICLE_SLUG = "veterinaire-urgence-grenoble-isere";
export const LYON_VET_CONTACT_ARTICLE_SLUG = "veterinaire-urgence-lyon-guide";
export const PROJECT_GUIDE_ARTICLE_SLUGS = new Set<string>(["chantier-participatif-low-tech-participer-lancer-projet", "chantier-participatif-projet-collectif-cadre-legal", "apprendre-menuiserie-permaculture-ecoconstruction-gratuitement"]);
export const RESOURCE_GUIDE_ARTICLE_SLUGS = new Set<string>(["malinois-lyon-guide-race", "pet-sitting-annecy-guide", "house-sitting-saint-etienne-guide", "house-sitting-vs-pension-comparatif", "house-sitting-grenoble", "house-sitting-lyon", "house-sitting-caluire-et-cuire", "house-sitting-chambery", "house-sitting-annecy", "house-sitting-aura-guide-complet", "guide-house-sitting-lyon", "guide-lieu-meilleurs-parcs-chiens-lyon", "gardiennage-maison-vacances-aura", "golden-retriever-lyon-guide-race", "garde-a-domicile-vs-pension", "garde-chien-lyon-solutions", "devenir-pet-sitter-guide-debutant", "erreurs-premiere-garde", "conseils-garder-chien", "devenir-gardien-guide-complet", "bouledogue-francais-lyon-guide-race", "conseil-gardien-creer-profil-attractif-lyon", "berger-australien-guide", "border-collie-lyon-guide-race", "abandon-animaux-france-chiffres-causes"]);
export const MIXED_GUIDE_ARTICLE_SLUGS = new Set<string>(["premiers-pas-sur-guardiens", "comment-fonctionne-guardiens-et-le-house-sitting-entre-particuliers", "notre-histoire-pet-sitting-argentine-lyon"]);
export const ENTRAIDE_GUIDE_ARTICLE_SLUGS = new Set<string>(["technologie-recreer-lien-pres-de-chez-soi", "se-sentir-utile-pres-de-chez-soi", "petites-missions-entraide-guardiens", "reseau-entraide-quartier-lyon-aura", "oser-demander-coup-de-main-pres-de-chez-soi", "jardinage-entraide-quartier-lyon", "jardinage-entraide-locale-grenoble", "jardinage-entraide-quartier-annecy", "idees-coups-de-main-entraide-pres-de-chez-soi", "courses-aide-domicile-entraide-senior-lyon", "demenagement-entraide-locale-france", "bricolage-montage-meubles-entraide-grenoble-lyon", "arroser-plantes-vacances-annecy", "arroser-plantes-vacances-grenoble", "arroser-plantes-vacances-lyon"]);
export const SITTER_PROFILE_GUIDE_ARTICLE_SLUGS = new Set<string>(["creer-profil-gardien-attractif", "comment-devenir-home-sitter-france-guide-debutant", "devenir-gardien-pro-animalier", "devenir-gardien-urgence-guardiens"]);
export const SITTER_GUIDE_ARTICLE_SLUGS = new Set<string>([...SITTER_PROFILE_GUIDE_ARTICLE_SLUGS, "temoignage-premiere-garde-auvergne", "voyager-gratuitement-france-house-sitting", "devenir-gardien-maison-etranger", "reussir-premiere-garde-house-sitting", "gerer-animaux-difficiles-garde", "boom-pet-sitting-lyon-2026"]);
export const AIX_HOME_OWNER_ARTICLE_SLUG = "house-sitting-aix-les-bains";
export const FARM_HOME_OWNER_ARTICLE_SLUG = "garde-ferme-animaux-monts-du-lyonnais";
export const GRENOBLE_STAY_OWNER_ARTICLE_SLUG = "pet-sitting-grenoble-chartreuse";
export const SAINT_ETIENNE_OWNER_ARTICLE_SLUG = "pet-sitting-saint-etienne-loire";
export const VALENCE_OWNER_ARTICLE_SLUG = "pet-sitting-valence-drome";
export const VENISSIEUX_OWNER_ARTICLE_SLUG = "pet-sitting-venissieux";
export const VILLEURBANNE_OWNER_ARTICLE_SLUG = "pet-sitting-villeurbanne";
export const VILLES_CHIEN_OWNER_ARTICLE_SLUG = "meilleures-villes-vivre-chien-autour-lyon";
export const ANNECY_WALKS_OWNER_ARTICLE_SLUG = "parcs-balades-chiens-annecy-guide";
export const GRENOBLE_WALKS_OWNER_ARTICLE_SLUG = "parcs-balades-chiens-grenoble-guide";
export const BENGAL_OWNER_ARTICLE_SLUG = "bengal-guide-race";
export const BERGER_ALLEMAND_OWNER_ARTICLE_SLUG = "berger-allemand-guide-race";
export const BERGER_AUSTRALIEN_OWNER_ARTICLE_SLUG = "berger-australien-guide-race";
export const BORDER_COLLIE_OWNER_ARTICLE_SLUG = "border-collie-guide-race-complet";
export const BOULEDOGUE_FRANCAIS_OWNER_ARTICLE_SLUG = "bouledogue-francais-guide-race-complet";
export const CAVALIER_OWNER_ARTICLE_SLUG = "cavalier-king-charles-guide-race";
export const GOLDEN_OWNER_ARTICLE_SLUG = "golden-retriever-guide-race-complet";
export const LABRADOR_OWNER_ARTICLE_SLUG = "labrador-retriever-guide-race";
export const MAINE_COON_OWNER_ARTICLE_SLUG = "maine-coon-guide-race";
export const MALINOIS_OWNER_ARTICLE_SLUG = "malinois-guide-race-complet";
export const PERSAN_OWNER_ARTICLE_SLUG = "persan-guide-race";
export const SIAMOIS_OWNER_ARTICLE_SLUG = "siamois-guide-race";
export const OWNER_GUIDE_ARTICLE_SLUGS = new Set<string>([
  SIAMOIS_OWNER_ARTICLE_SLUG,

  PERSAN_OWNER_ARTICLE_SLUG,

  MAINE_COON_OWNER_ARTICLE_SLUG,
  MALINOIS_OWNER_ARTICLE_SLUG,

  LABRADOR_OWNER_ARTICLE_SLUG,

  GOLDEN_OWNER_ARTICLE_SLUG,

  CAVALIER_OWNER_ARTICLE_SLUG,

  BORDER_COLLIE_OWNER_ARTICLE_SLUG,
  BOULEDOGUE_FRANCAIS_OWNER_ARTICLE_SLUG,

  BERGER_ALLEMAND_OWNER_ARTICLE_SLUG,
  BERGER_AUSTRALIEN_OWNER_ARTICLE_SLUG,

  BENGAL_OWNER_ARTICLE_SLUG,

  ANNECY_WALKS_OWNER_ARTICLE_SLUG,
  GRENOBLE_WALKS_OWNER_ARTICLE_SLUG,

  VILLES_CHIEN_OWNER_ARTICLE_SLUG,

  VILLEURBANNE_OWNER_ARTICLE_SLUG,

  VALENCE_OWNER_ARTICLE_SLUG,
  VENISSIEUX_OWNER_ARTICLE_SLUG,

  GRENOBLE_STAY_OWNER_ARTICLE_SLUG,
  SAINT_ETIENNE_OWNER_ARTICLE_SLUG,

  AIX_HOME_OWNER_ARTICLE_SLUG,
  FARM_HOME_OWNER_ARTICLE_SLUG,

  LYON_VET_CONTACT_ARTICLE_SLUG,

  ANNECY_VET_CONTACT_ARTICLE_SLUG,
  GRENOBLE_VET_CONTACT_ARTICLE_SLUG,

  SAVOIE_ANIMALS_OWNER_ARTICLE_SLUG,
  HAUTE_SAVOIE_STAY_OWNER_ARTICLE_SLUG,

  FRANCE_PRACTICAL_OWNER_ARTICLE_SLUG,
  SUMMER_OWNER_ARTICLE_SLUG,

  LYON_HUB_OWNER_ARTICLE_SLUG,
  WEST_LYON_OWNER_ARTICLE_SLUG,

  CROIX_ROUSSE_OWNER_ARTICLE_SLUG,
  PRESQUILE_CAT_OWNER_ARTICLE_SLUG,

  LYON_HOLIDAY_DOG_OWNER_ARTICLE_SLUG,
  LYON_CAT_OWNER_ARTICLE_SLUG,

  ENTRUST_HOME_OWNER_ARTICLE_SLUG,
  ABSENCE_SITUATIONS_OWNER_ARTICLE_SLUG,

  AT_HOME_OWNER_ARTICLE_SLUG,
  WELFARE_OWNER_ARTICLE_SLUG,

  WELCOME_OWNER_ARTICLE_SLUG,
  DEPARTURE_OWNER_ARTICLE_SLUG,
  INCIDENT_OWNER_ARTICLE_SLUG,
  HOSPITAL_OWNER_ARTICLE_SLUG,
  TRUST_OWNER_ARTICLE_SLUG,
  AGREEMENT_OWNER_ARTICLE_SLUG,
  DOG_OWNER_ARTICLE_SLUG,
  CAT_OWNER_ARTICLE_SLUG,
  EXPAT_OWNER_ARTICLE_SLUG,
  REUNION_OWNER_ARTICLE_SLUG,
  TAHITI_OWNER_ARTICLE_SLUG,
  CALEDONIE_OWNER_ARTICLE_SLUG,
  PENSION_OWNER_ARTICLE_SLUG,
  LONG_STAY_OWNER_ARTICLE_SLUG,
  CHOOSING_OWNER_ARTICLE_SLUG,
  NO_PETS_OWNER_ARTICLE_SLUG,
  LISTING_OWNER_ARTICLE_SLUG,
  PREPARATION_OWNER_ARTICLE_SLUG,
  CHRISTMAS_OWNER_ARTICLE_SLUG,
  WEEKEND_OWNER_ARTICLE_SLUG,
  WINTER_OWNER_ARTICLE_SLUG,
  GARDEN_OWNER_ARTICLE_SLUG,
  PLANTS_OWNER_ARTICLE_SLUG,
  SECURITY_OWNER_ARTICLE_SLUG,
  FRANCE_EXPAT_OWNER_ARTICLE_SLUG,
  RECIPROCAL_OWNER_ARTICLE_SLUG,
]);

const CTA_PAR_SLUG: Record<string, CtaCopy> = {
  "pet-sitting-annecy-guide": {
  "midText": "Retrouver les repères détaillés",
  "midPrimary": {
    "label": "Lire le guide actuel",
    "href": "/house-sitting/annecy",
    "role": "ressource"
  },
  "endHeading": "Poursuivre avec le guide actuel",
  "endText": "Retrouvez les préparatifs, les questions utiles et les conditions à convenir dans le guide consacré à ce besoin.",
  "endPrimary": {
    "label": "Lire le guide actuel",
    "href": "/house-sitting/annecy",
    "role": "ressource"
  }
},
  "malinois-lyon-guide-race": {
  "midText": "Retrouver les repères détaillés",
  "midPrimary": {
    "label": "Lire le guide actuel",
    "href": "/actualites/malinois-guide-race-complet",
    "role": "ressource"
  },
  "endHeading": "Poursuivre avec le guide actuel",
  "endText": "Retrouvez les préparatifs, les questions utiles et les conditions à convenir dans le guide consacré à ce besoin.",
  "endPrimary": {
    "label": "Lire le guide actuel",
    "href": "/actualites/malinois-guide-race-complet",
    "role": "ressource"
  }
},
  "house-sitting-vs-pension-comparatif": {
  "midText": "Retrouver les repères détaillés",
  "midPrimary": {
    "label": "Lire le guide actuel",
    "href": "/actualites/pension-chien-alternatives-guide",
    "role": "ressource"
  },
  "endHeading": "Poursuivre avec le guide actuel",
  "endText": "Retrouvez les préparatifs, les questions utiles et les conditions à convenir dans le guide consacré à ce besoin.",
  "endPrimary": {
    "label": "Lire le guide actuel",
    "href": "/actualites/pension-chien-alternatives-guide",
    "role": "ressource"
  }
},
  "house-sitting-saint-etienne-guide": {
  "midText": "Retrouver les repères détaillés",
  "midPrimary": {
    "label": "Lire le guide actuel",
    "href": "/actualites/pet-sitting-saint-etienne-loire",
    "role": "ressource"
  },
  "endHeading": "Poursuivre avec le guide actuel",
  "endText": "Retrouvez les préparatifs, les questions utiles et les conditions à convenir dans le guide consacré à ce besoin.",
  "endPrimary": {
    "label": "Lire le guide actuel",
    "href": "/actualites/pet-sitting-saint-etienne-loire",
    "role": "ressource"
  }
},
  "house-sitting-lyon": {
  "midText": "Retrouver les repères détaillés",
  "midPrimary": {
    "label": "Lire le guide actuel",
    "href": "/house-sitting/lyon",
    "role": "ressource"
  },
  "endHeading": "Poursuivre avec le guide actuel",
  "endText": "Retrouvez les préparatifs, les questions utiles et les conditions à convenir dans le guide consacré à ce besoin.",
  "endPrimary": {
    "label": "Lire le guide actuel",
    "href": "/house-sitting/lyon",
    "role": "ressource"
  }
},
  "house-sitting-grenoble": {
  "midText": "Retrouver les repères détaillés",
  "midPrimary": {
    "label": "Lire le guide actuel",
    "href": "/house-sitting/grenoble",
    "role": "ressource"
  },
  "endHeading": "Poursuivre avec le guide actuel",
  "endText": "Retrouvez les préparatifs, les questions utiles et les conditions à convenir dans le guide consacré à ce besoin.",
  "endPrimary": {
    "label": "Lire le guide actuel",
    "href": "/house-sitting/grenoble",
    "role": "ressource"
  }
},
  "house-sitting-chambery": {
  "midText": "Retrouver les repères détaillés",
  "midPrimary": {
    "label": "Lire le guide actuel",
    "href": "/house-sitting/chambery",
    "role": "ressource"
  },
  "endHeading": "Poursuivre avec le guide actuel",
  "endText": "Retrouvez les préparatifs, les questions utiles et les conditions à convenir dans le guide consacré à ce besoin.",
  "endPrimary": {
    "label": "Lire le guide actuel",
    "href": "/house-sitting/chambery",
    "role": "ressource"
  }
},
  "house-sitting-caluire-et-cuire": {
  "midText": "Retrouver les repères détaillés",
  "midPrimary": {
    "label": "Lire le guide actuel",
    "href": "/house-sitting/lyon",
    "role": "ressource"
  },
  "endHeading": "Poursuivre avec le guide actuel",
  "endText": "Retrouvez les préparatifs, les questions utiles et les conditions à convenir dans le guide consacré à ce besoin.",
  "endPrimary": {
    "label": "Lire le guide actuel",
    "href": "/house-sitting/lyon",
    "role": "ressource"
  }
},
  "house-sitting-aura-guide-complet": {
  "midText": "Retrouver les repères détaillés",
  "midPrimary": {
    "label": "Lire le guide actuel",
    "href": "/actualites/voyager-gratuitement-france-house-sitting",
    "role": "ressource"
  },
  "endHeading": "Poursuivre avec le guide actuel",
  "endText": "Retrouvez les préparatifs, les questions utiles et les conditions à convenir dans le guide consacré à ce besoin.",
  "endPrimary": {
    "label": "Lire le guide actuel",
    "href": "/actualites/voyager-gratuitement-france-house-sitting",
    "role": "ressource"
  }
},
  "house-sitting-annecy": {
  "midText": "Retrouver les repères détaillés",
  "midPrimary": {
    "label": "Lire le guide actuel",
    "href": "/house-sitting/annecy",
    "role": "ressource"
  },
  "endHeading": "Poursuivre avec le guide actuel",
  "endText": "Retrouvez les préparatifs, les questions utiles et les conditions à convenir dans le guide consacré à ce besoin.",
  "endPrimary": {
    "label": "Lire le guide actuel",
    "href": "/house-sitting/annecy",
    "role": "ressource"
  }
},
  "guide-lieu-meilleurs-parcs-chiens-lyon": {
  "midText": "Retrouver les repères détaillés",
  "midPrimary": {
    "label": "Lire le guide actuel",
    "href": "/actualites/parcs-chiens-lyon-guide-complet",
    "role": "ressource"
  },
  "endHeading": "Poursuivre avec le guide actuel",
  "endText": "Retrouvez les préparatifs, les questions utiles et les conditions à convenir dans le guide consacré à ce besoin.",
  "endPrimary": {
    "label": "Lire le guide actuel",
    "href": "/actualites/parcs-chiens-lyon-guide-complet",
    "role": "ressource"
  }
},
  "guide-house-sitting-lyon": {
  "midText": "Retrouver les repères détaillés",
  "midPrimary": {
    "label": "Lire le guide actuel",
    "href": "/actualites/pet-sitting-lyon-guide-complet",
    "role": "ressource"
  },
  "endHeading": "Poursuivre avec le guide actuel",
  "endText": "Retrouvez les préparatifs, les questions utiles et les conditions à convenir dans le guide consacré à ce besoin.",
  "endPrimary": {
    "label": "Lire le guide actuel",
    "href": "/actualites/pet-sitting-lyon-guide-complet",
    "role": "ressource"
  }
},
  "golden-retriever-lyon-guide-race": {
  "midText": "Retrouver les repères détaillés",
  "midPrimary": {
    "label": "Lire le guide actuel",
    "href": "/actualites/golden-retriever-guide-race-complet",
    "role": "ressource"
  },
  "endHeading": "Poursuivre avec le guide actuel",
  "endText": "Retrouvez les préparatifs, les questions utiles et les conditions à convenir dans le guide consacré à ce besoin.",
  "endPrimary": {
    "label": "Lire le guide actuel",
    "href": "/actualites/golden-retriever-guide-race-complet",
    "role": "ressource"
  }
},
  "gardiennage-maison-vacances-aura": {
  "midText": "Retrouver les repères détaillés",
  "midPrimary": {
    "label": "Lire le guide actuel",
    "href": "/actualites/house-sitting-auvergne-rhone-alpes",
    "role": "ressource"
  },
  "endHeading": "Poursuivre avec le guide actuel",
  "endText": "Retrouvez les préparatifs, les questions utiles et les conditions à convenir dans le guide consacré à ce besoin.",
  "endPrimary": {
    "label": "Lire le guide actuel",
    "href": "/actualites/house-sitting-auvergne-rhone-alpes",
    "role": "ressource"
  }
},
  "garde-chien-lyon-solutions": {
  "midText": "Retrouver les repères détaillés",
  "midPrimary": {
    "label": "Lire le guide actuel",
    "href": "/actualites/pet-sitting-lyon-guide-complet",
    "role": "ressource"
  },
  "endHeading": "Poursuivre avec le guide actuel",
  "endText": "Retrouvez les préparatifs, les questions utiles et les conditions à convenir dans le guide consacré à ce besoin.",
  "endPrimary": {
    "label": "Lire le guide actuel",
    "href": "/actualites/pet-sitting-lyon-guide-complet",
    "role": "ressource"
  }
},
  "garde-a-domicile-vs-pension": {
  "midText": "Retrouver les repères détaillés",
  "midPrimary": {
    "label": "Lire le guide actuel",
    "href": "/actualites/pension-chien-alternatives-guide",
    "role": "ressource"
  },
  "endHeading": "Poursuivre avec le guide actuel",
  "endText": "Retrouvez les préparatifs, les questions utiles et les conditions à convenir dans le guide consacré à ce besoin.",
  "endPrimary": {
    "label": "Lire le guide actuel",
    "href": "/actualites/pension-chien-alternatives-guide",
    "role": "ressource"
  }
},
  "erreurs-premiere-garde": {
  "midText": "Retrouver les repères détaillés",
  "midPrimary": {
    "label": "Lire le guide actuel",
    "href": "/actualites/reussir-premiere-garde-house-sitting",
    "role": "ressource"
  },
  "endHeading": "Poursuivre avec le guide actuel",
  "endText": "Retrouvez les préparatifs, les questions utiles et les conditions à convenir dans le guide consacré à ce besoin.",
  "endPrimary": {
    "label": "Lire le guide actuel",
    "href": "/actualites/reussir-premiere-garde-house-sitting",
    "role": "ressource"
  }
},
  "devenir-pet-sitter-guide-debutant": {
  "midText": "Retrouver les repères détaillés",
  "midPrimary": {
    "label": "Lire le guide actuel",
    "href": "/actualites/creer-profil-gardien-attractif",
    "role": "ressource"
  },
  "endHeading": "Poursuivre avec le guide actuel",
  "endText": "Retrouvez les préparatifs, les questions utiles et les conditions à convenir dans le guide consacré à ce besoin.",
  "endPrimary": {
    "label": "Lire le guide actuel",
    "href": "/actualites/creer-profil-gardien-attractif",
    "role": "ressource"
  }
},
  "devenir-gardien-guide-complet": {
  "midText": "Retrouver les repères détaillés",
  "midPrimary": {
    "label": "Lire le guide actuel",
    "href": "/actualites/creer-profil-gardien-attractif",
    "role": "ressource"
  },
  "endHeading": "Poursuivre avec le guide actuel",
  "endText": "Retrouvez les préparatifs, les questions utiles et les conditions à convenir dans le guide consacré à ce besoin.",
  "endPrimary": {
    "label": "Lire le guide actuel",
    "href": "/actualites/creer-profil-gardien-attractif",
    "role": "ressource"
  }
},
  "conseils-garder-chien": {
  "midText": "Retrouver les repères détaillés",
  "midPrimary": {
    "label": "Lire le guide actuel",
    "href": "/actualites/reussir-premiere-garde-house-sitting",
    "role": "ressource"
  },
  "endHeading": "Poursuivre avec le guide actuel",
  "endText": "Retrouvez les préparatifs, les questions utiles et les conditions à convenir dans le guide consacré à ce besoin.",
  "endPrimary": {
    "label": "Lire le guide actuel",
    "href": "/actualites/reussir-premiere-garde-house-sitting",
    "role": "ressource"
  }
},
  "conseil-gardien-creer-profil-attractif-lyon": {
  "midText": "Retrouver les repères détaillés",
  "midPrimary": {
    "label": "Lire le guide actuel",
    "href": "/actualites/creer-profil-gardien-attractif",
    "role": "ressource"
  },
  "endHeading": "Poursuivre avec le guide actuel",
  "endText": "Retrouvez les préparatifs, les questions utiles et les conditions à convenir dans le guide consacré à ce besoin.",
  "endPrimary": {
    "label": "Lire le guide actuel",
    "href": "/actualites/creer-profil-gardien-attractif",
    "role": "ressource"
  }
},
  "bouledogue-francais-lyon-guide-race": {
  "midText": "Retrouver les repères détaillés",
  "midPrimary": {
    "label": "Lire le guide actuel",
    "href": "/actualites/bouledogue-francais-guide-race-complet",
    "role": "ressource"
  },
  "endHeading": "Poursuivre avec le guide actuel",
  "endText": "Retrouvez les préparatifs, les questions utiles et les conditions à convenir dans le guide consacré à ce besoin.",
  "endPrimary": {
    "label": "Lire le guide actuel",
    "href": "/actualites/bouledogue-francais-guide-race-complet",
    "role": "ressource"
  }
},
  "border-collie-lyon-guide-race": {
  "midText": "Retrouver les repères détaillés",
  "midPrimary": {
    "label": "Lire le guide actuel",
    "href": "/actualites/border-collie-guide-race-complet",
    "role": "ressource"
  },
  "endHeading": "Poursuivre avec le guide actuel",
  "endText": "Retrouvez les préparatifs, les questions utiles et les conditions à convenir dans le guide consacré à ce besoin.",
  "endPrimary": {
    "label": "Lire le guide actuel",
    "href": "/actualites/border-collie-guide-race-complet",
    "role": "ressource"
  }
},
  "berger-australien-guide": {
  "midText": "Retrouver les repères détaillés",
  "midPrimary": {
    "label": "Lire le guide actuel",
    "href": "/actualites/berger-australien-guide-race",
    "role": "ressource"
  },
  "endHeading": "Poursuivre avec le guide actuel",
  "endText": "Retrouvez les préparatifs, les questions utiles et les conditions à convenir dans le guide consacré à ce besoin.",
  "endPrimary": {
    "label": "Lire le guide actuel",
    "href": "/actualites/berger-australien-guide-race",
    "role": "ressource"
  }
},
  [SIAMOIS_OWNER_ARTICLE_SLUG]: {
    "midText": "Vous préparez la garde de votre Siamois ?",
    "midPrimary": {
        "label": "Publier mon annonce de garde",
        "href": "/inscription?role=owner&redirect=%2Fsits%2Fcreate",
        "role": "owner"
    },
    "endHeading": "Présenter les habitudes de votre Siamois",
    "endText": "Précisez les dates, la présence et les consignes utiles, puis échangez avec les personnes intéressées avant de confirmer.",
    "endPrimary": {
        "label": "Publier mon annonce de garde",
        "href": "/inscription?role=owner&redirect=%2Fsits%2Fcreate",
        "role": "owner"
    }
},

  [PERSAN_OWNER_ARTICLE_SLUG]: {
    "midText": "Vous préparez une garde ?",
    "midPrimary": {
        "label": "Publier mon annonce de garde",
        "href": "/inscription?role=owner&redirect=%2Fsits%2Fcreate",
        "role": "owner"
    },
    "endHeading": "Présenter les habitudes et soins de votre Persan",
    "endText": "Précisez les dates, la présence et les gestes nécessaires, puis échangez avec les personnes intéressées avant de confirmer.",
    "endPrimary": {
        "label": "Publier mon annonce de garde",
        "href": "/inscription?role=owner&redirect=%2Fsits%2Fcreate",
        "role": "owner"
    }
},

  [MAINE_COON_OWNER_ARTICLE_SLUG]: {
    "midText": "Vous préparez une garde ?",
    "midPrimary": {
        "label": "Publier mon annonce de garde",
        "href": "/inscription?role=owner&redirect=%2Fsits%2Fcreate",
        "role": "owner"
    },
    "endHeading": "Présenter les habitudes de votre Maine Coon",
    "endText": "Précisez les dates, la présence et les consignes utiles, puis échangez avec les personnes intéressées avant de confirmer.",
    "endPrimary": {
        "label": "Publier mon annonce de garde",
        "href": "/inscription?role=owner&redirect=%2Fsits%2Fcreate",
        "role": "owner"
    }
},
  [MALINOIS_OWNER_ARTICLE_SLUG]: {
    "midText": "Vous préparez une garde ?",
    "midPrimary": {
        "label": "Publier mon annonce de garde",
        "href": "/inscription?role=owner&redirect=%2Fsits%2Fcreate",
        "role": "owner"
    },
    "endHeading": "Présenter les habitudes de votre Malinois",
    "endText": "Précisez les dates, la présence et les consignes utiles, puis échangez avec les personnes intéressées avant de confirmer.",
    "endPrimary": {
        "label": "Publier mon annonce de garde",
        "href": "/inscription?role=owner&redirect=%2Fsits%2Fcreate",
        "role": "owner"
    }
},

  [LABRADOR_OWNER_ARTICLE_SLUG]: {
    "midText": "Vous préparez la garde de votre Labrador ?",
    "midPrimary": {
        "label": "Publier mon annonce de garde",
        "href": "/inscription?role=owner&redirect=%2Fsits%2Fcreate",
        "role": "owner"
    },
    "endHeading": "Présenter les habitudes de votre Labrador",
    "endText": "Décrivez repas, sorties, présence et précautions utiles, puis échangez avec les personnes intéressées avant de confirmer.",
    "endPrimary": {
        "label": "Publier mon annonce de garde",
        "href": "/inscription?role=owner&redirect=%2Fsits%2Fcreate",
        "role": "owner"
    }
},

  [GOLDEN_OWNER_ARTICLE_SLUG]: {
    "midText": "Vous préparez la garde de votre Golden ?",
    "midPrimary": {
        "label": "Publier mon annonce de garde",
        "href": "/inscription?role=owner&redirect=%2Fsits%2Fcreate",
        "role": "owner"
    },
    "endHeading": "Présenter les habitudes de votre Golden pour préparer sa garde",
    "endText": "Décrivez les dates, la présence, les sorties et les consignes importantes, puis échangez avec les personnes intéressées avant de confirmer.",
    "endPrimary": {
        "label": "Publier mon annonce de garde",
        "href": "/inscription?role=owner&redirect=%2Fsits%2Fcreate",
        "role": "owner"
    }
},

  [CAVALIER_OWNER_ARTICLE_SLUG]: {
    "midText": "Vous préparez la garde de votre Cavalier ?",
    "midPrimary": {
        "label": "Publier mon annonce de garde",
        "href": "/inscription?role=owner&redirect=%2Fsits%2Fcreate",
        "role": "owner"
    },
    "endHeading": "Présenter les besoins de votre Cavalier dans une annonce",
    "endText": "Décrivez les dates, les habitudes et les soins éventuels. Échangez sur les possibilités du gardien avant de confirmer le séjour.",
    "endPrimary": {
        "label": "Publier mon annonce de garde",
        "href": "/inscription?role=owner&redirect=%2Fsits%2Fcreate",
        "role": "owner"
    }
},

  [BORDER_COLLIE_OWNER_ARTICLE_SLUG]: {
    "midText": "Vous préparez la garde de votre chien ?",
    "midPrimary": {
        "label": "Publier mon annonce de garde",
        "href": "/inscription?role=owner&redirect=%2Fsits%2Fcreate",
        "role": "owner"
    },
    "endHeading": "Décrire les besoins de votre chien pour organiser sa garde",
    "endText": "Précisez les dates, les sorties, la présence et les contraintes importantes, puis échangez avec les personnes intéressées avant de confirmer.",
    "endPrimary": {
        "label": "Publier mon annonce de garde",
        "href": "/inscription?role=owner&redirect=%2Fsits%2Fcreate",
        "role": "owner"
    }
},
  [BOULEDOGUE_FRANCAIS_OWNER_ARTICLE_SLUG]: {
    "midText": "Vous préparez la garde de votre chien ?",
    "midPrimary": {
        "label": "Publier mon annonce de garde",
        "href": "/inscription?role=owner&redirect=%2Fsits%2Fcreate",
        "role": "owner"
    },
    "endHeading": "Décrire les besoins de votre chien pour organiser sa garde",
    "endText": "Précisez les dates, les sorties, la présence et les contraintes importantes, puis échangez avec les personnes intéressées avant de confirmer.",
    "endPrimary": {
        "label": "Publier mon annonce de garde",
        "href": "/inscription?role=owner&redirect=%2Fsits%2Fcreate",
        "role": "owner"
    }
},

  [BERGER_ALLEMAND_OWNER_ARTICLE_SLUG]: {
    "midText": "Vous préparez la garde de votre Berger allemand ?",
    "midPrimary": {
        "label": "Publier mon annonce de garde",
        "href": "/inscription?role=owner&redirect=%2Fsits%2Fcreate",
        "role": "owner"
    },
    "endHeading": "Présenter les habitudes de votre chien dans votre annonce",
    "endText": "Précisez les dates, la présence, les sorties et les contraintes à assurer. Échangez avec les personnes intéressées avant de confirmer un séjour.",
    "endPrimary": {
        "label": "Publier mon annonce de garde",
        "href": "/inscription?role=owner&redirect=%2Fsits%2Fcreate",
        "role": "owner"
    }
},
  [BERGER_AUSTRALIEN_OWNER_ARTICLE_SLUG]: {
    "midText": "Vous préparez la garde de votre Berger australien ?",
    "midPrimary": {
        "label": "Publier mon annonce de garde",
        "href": "/inscription?role=owner&redirect=%2Fsits%2Fcreate",
        "role": "owner"
    },
    "endHeading": "Présenter les habitudes de votre chien dans votre annonce",
    "endText": "Précisez les dates, la présence, les sorties et les contraintes à assurer. Échangez avec les personnes intéressées avant de confirmer un séjour.",
    "endPrimary": {
        "label": "Publier mon annonce de garde",
        "href": "/inscription?role=owner&redirect=%2Fsits%2Fcreate",
        "role": "owner"
    }
},

  [BENGAL_OWNER_ARTICLE_SLUG]: {
    "midText": "Vous préparez la garde de votre Bengal ?",
    "midPrimary": {
        "label": "Publier mon annonce de garde",
        "href": "/inscription?role=owner&redirect=%2Fsits%2Fcreate",
        "role": "owner"
    },
    "endHeading": "Décrire les habitudes de votre chat pour préparer sa garde",
    "endText": "Précisez les dates, le logement, la présence et les routines à assurer. Vous pourrez échanger avec les gardiens intéressés avant de confirmer.",
    "endPrimary": {
        "label": "Publier mon annonce de garde",
        "href": "/inscription?role=owner&redirect=%2Fsits%2Fcreate",
        "role": "owner"
    }
},

"abandon-animaux-france-chiffres-causes": {
  "midText": "Vous préparez une absence temporaire ?",
  "midPrimary": {
    "label": "Préparer une garde pendant une hospitalisation",
    "href": "/actualites/faire-garder-animal-pendant-hospitalisation",
    "role": "ressource"
  },
  "endHeading": "Organiser une aide pendant une absence temporaire",
  "endText": "Le guide d’hospitalisation aide à préparer les besoins, les consignes et le relais, sans garantie de solution immédiate.",
  "endPrimary": {
    "label": "Préparer une garde pendant une hospitalisation",
    "href": "/actualites/faire-garder-animal-pendant-hospitalisation",
    "role": "ressource"
  }
},
"temoignage-premiere-garde-auvergne": {
  "midText": "Vous envisagez une garde à la campagne ?",
  "midPrimary": {
    "label": "Consulter les annonces de garde",
    "href": "/search",
    "role": "sitter"
  },
  "endHeading": "Chercher un séjour compatible avec vos possibilités",
  "endText": "Lisez les tâches, les accès et les conditions proposées, puis posez vos questions avant de confirmer une garde.",
  "endPrimary": {
    "label": "Consulter les annonces de garde",
    "href": "/search",
    "role": "sitter"
  }
},

"voyager-gratuitement-france-house-sitting": {
  "midText": "Vous préparez un séjour de house-sitting ?",
  "midPrimary": {
    "label": "Consulter les annonces de garde",
    "href": "/search",
    "role": "sitter"
  },
  "endHeading": "Chercher un séjour adapté à votre organisation",
  "endText": "Lisez les tâches, les conditions du logement et les dates proposées, puis échangez avant de confirmer votre voyage.",
  "endPrimary": {
    "label": "Consulter les annonces de garde",
    "href": "/search",
    "role": "sitter"
  }
},
"notre-histoire-pet-sitting-argentine-lyon": {
  "midText": "Vous souhaitez participer au réseau ?",
  "midPrimary": {
    "label": "Publier mon annonce de garde",
    "href": "/inscription?role=owner&redirect=%2Fsits%2Fcreate",
    "role": "owner"
  },
  "midSecondary": {
    "label": "Préparer mon profil gardien",
    "href": "/inscription?role=sitter&redirect=%2Fprofile",
    "role": "sitter"
  },
  "endHeading": "Participer à cette histoire",
  "endText": "Vous pouvez décrire votre besoin de garde ou présenter vos possibilités comme gardien. Vos retours nous aideront à améliorer Guardiens.",
  "endPrimary": {
    "label": "Publier mon annonce de garde",
    "href": "/inscription?role=owner&redirect=%2Fsits%2Fcreate",
    "role": "owner"
  },
  "endSecondary": {
    "label": "Préparer mon profil gardien",
    "href": "/inscription?role=sitter&redirect=%2Fprofile",
    "role": "sitter"
  }
},

"premiers-pas-sur-guardiens": {
  "midText": "Vous préparez une garde de maison ?",
  "midPrimary": {
    "label": "Publier mon annonce de garde",
    "href": "/inscription?role=owner&redirect=%2Fsits%2Fcreate",
    "role": "owner"
  },
  "midSecondary": {
    "label": "Préparer mon profil gardien",
    "href": "/inscription?role=sitter&redirect=%2Fprofile",
    "role": "sitter"
  },
  "endHeading": "Choisir votre première démarche",
  "endText": "Vous souhaitez confier votre logement ? Préparez une annonce. Vous souhaitez proposer des gardes ? Présentez votre expérience et vos possibilités dans votre profil.",
  "endPrimary": {
    "label": "Publier mon annonce de garde",
    "href": "/inscription?role=owner&redirect=%2Fsits%2Fcreate",
    "role": "owner"
  },
  "endSecondary": {
    "label": "Préparer mon profil gardien",
    "href": "/inscription?role=sitter&redirect=%2Fprofile",
    "role": "sitter"
  }
},
"comment-fonctionne-guardiens-et-le-house-sitting-entre-particuliers": {
  "midText": "Vous préparez une garde de maison ?",
  "midPrimary": {
    "label": "Publier mon annonce de garde",
    "href": "/inscription?role=owner&redirect=%2Fsits%2Fcreate",
    "role": "owner"
  },
  "midSecondary": {
    "label": "Préparer mon profil gardien",
    "href": "/inscription?role=sitter&redirect=%2Fprofile",
    "role": "sitter"
  },
  "endHeading": "Préparer un échange qui vous convient",
  "endText": "Décrivez votre besoin de garde ou présentez ce que vous pouvez assurer. Vous pourrez échanger avant de confirmer un séjour.",
  "endPrimary": {
    "label": "Publier mon annonce de garde",
    "href": "/inscription?role=owner&redirect=%2Fsits%2Fcreate",
    "role": "owner"
  },
  "endSecondary": {
    "label": "Préparer mon profil gardien",
    "href": "/inscription?role=sitter&redirect=%2Fprofile",
    "role": "sitter"
  }
},

"devenir-gardien-pro-animalier": {
  "midText": "Vous souhaitez présenter vos possibilités de garde ?",
  "midPrimary": {
    "label": "Mettre à jour mon profil",
    "href": "/inscription?role=sitter&redirect=%2Fprofile",
    "role": "sitter"
  },
  "endHeading": "Présenter votre activité et vos formations",
  "endText": "Indiquez la spécialité et les formations qui correspondent à votre parcours, puis précisez les tâches que vous pouvez assurer pendant une garde.",
  "endPrimary": {
    "label": "Mettre à jour mon profil",
    "href": "/inscription?role=sitter&redirect=%2Fprofile",
    "role": "sitter"
  }
},
"devenir-gardien-urgence-guardiens": {
  "midText": "Vous souhaitez présenter vos possibilités de garde ?",
  "midPrimary": {
    "label": "Préparer mon profil gardien",
    "href": "/inscription?role=sitter&redirect=%2Fprofile",
    "role": "sitter"
  },
  "endHeading": "Participer aux gardes classiques dès aujourd’hui",
  "endText": "Présentez vos possibilités pour des séjours préparés avec les propriétaires. Cette démarche ne vaut pas activation du futur réseau d’urgence.",
  "endPrimary": {
    "label": "Préparer mon profil gardien",
    "href": "/inscription?role=sitter&redirect=%2Fprofile",
    "role": "sitter"
  }
},

"comment-devenir-home-sitter-france-guide-debutant": {
  "midText": "Vous préparez un séjour de house-sitting ?",
  "midPrimary": {
    "label": "Préparer mon profil gardien",
    "href": "/inscription?role=sitter&redirect=%2Fprofile",
    "role": "sitter"
  },
  "endHeading": "Présenter vos possibilités pour une première garde",
  "endText": "Décrivez votre expérience, votre organisation et les séjours que vous pouvez envisager avant de contacter un propriétaire.",
  "endPrimary": {
    "label": "Préparer mon profil gardien",
    "href": "/inscription?role=sitter&redirect=%2Fprofile",
    "role": "sitter"
  }
},
"devenir-gardien-maison-etranger": {
  "midText": "Vous préparez un séjour de house-sitting ?",
  "midPrimary": {
    "label": "Consulter les annonces de garde",
    "href": "/search",
    "role": "sitter"
  },
  "endHeading": "Chercher une garde compatible avec votre projet",
  "endText": "Consultez les annonces disponibles, puis clarifiez les responsabilités et les conditions de voyage avant de confirmer un séjour.",
  "endPrimary": {
    "label": "Consulter les annonces de garde",
    "href": "/search",
    "role": "sitter"
  }
},

"creer-profil-gardien-attractif": {
  "midText": "Vous préparez un séjour de house-sitting ?",
  "midPrimary": {
    "label": "Préparer mon profil gardien",
    "href": "/inscription?role=sitter&redirect=%2Fprofile",
    "role": "sitter"
  },
  "endHeading": "Présenter votre expérience et vos disponibilités",
  "endText": "Mettez à jour votre profil avec des informations concrètes sur les tâches que vous connaissez et les séjours que vous pouvez envisager.",
  "endPrimary": {
    "label": "Préparer mon profil gardien",
    "href": "/inscription?role=sitter&redirect=%2Fprofile",
    "role": "sitter"
  }
},
"reussir-premiere-garde-house-sitting": {
  "midText": "Vous préparez un séjour de house-sitting ?",
  "midPrimary": {
    "label": "Consulter les annonces de garde",
    "href": "/search",
    "role": "sitter"
  },
  "endHeading": "Chercher une première garde adaptée à vos possibilités",
  "endText": "Lisez les tâches, les soins et les conditions de séjour, puis posez vos questions avant de confirmer votre disponibilité.",
  "endPrimary": {
    "label": "Consulter les annonces de garde",
    "href": "/search",
    "role": "sitter"
  }
},

  [ANNECY_WALKS_OWNER_ARTICLE_SLUG]: {
    "midText": "Vous préparez une garde avec des promenades à Annecy ?",
    "midPrimary": {
        "label": "Publier mon annonce de garde",
        "href": "/inscription?role=owner&redirect=%2Fsits%2Fcreate",
        "role": "owner"
    },
    "endHeading": "Préparer les sorties pendant votre absence",
    "endText": "Présentez vos dates, le logement et les besoins de votre chien pour échanger sur les promenades et l’organisation du séjour.",
    "endPrimary": {
        "label": "Publier mon annonce de garde",
        "href": "/inscription?role=owner&redirect=%2Fsits%2Fcreate",
        "role": "owner"
    }
},
  [GRENOBLE_WALKS_OWNER_ARTICLE_SLUG]: {
    "midText": "Vous préparez une garde avec des promenades à Grenoble ?",
    "midPrimary": {
        "label": "Publier mon annonce de garde",
        "href": "/inscription?role=owner&redirect=%2Fsits%2Fcreate",
        "role": "owner"
    },
    "endHeading": "Organiser la garde et les promenades de votre chien",
    "endText": "Décrivez vos dates, le logement et les soins et sorties nécessaires pour préparer les échanges avec les personnes intéressées.",
    "endPrimary": {
        "label": "Publier mon annonce de garde",
        "href": "/inscription?role=owner&redirect=%2Fsits%2Fcreate",
        "role": "owner"
    }
},

  [VILLES_CHIEN_OWNER_ARTICLE_SLUG]: {
    "midText": "Vous préparez une garde après votre installation ?",
    "midPrimary": {
        "label": "Publier mon annonce de garde",
        "href": "/inscription?role=owner&redirect=%2Fsits%2Fcreate",
        "role": "owner"
    },
    "endHeading": "Organiser une garde depuis votre nouveau logement",
    "endText": "Décrivez vos dates, les accès au logement et les besoins de votre chien pour échanger avec les personnes intéressées par un séjour chez vous.",
    "endPrimary": {
        "label": "Publier mon annonce de garde",
        "href": "/inscription?role=owner&redirect=%2Fsits%2Fcreate",
        "role": "owner"
    }
},

"arroser-plantes-vacances-lyon": {
  "midText": "Vous cherchez un relais pour vos plantes ?",
  "midPrimary": {
    "label": "Publier mon besoin d’arrosage",
    "href": "/petites-missions/creer",
    "role": "entraide"
  },
  "endHeading": "Chercher un coup de main pour vos plantes à Lyon",
  "endText": "Présentez le secteur, les dates, les plantes et les conditions de passage pour préparer les échanges avec les personnes intéressées.",
  "endPrimary": {
    "label": "Publier mon besoin d’arrosage",
    "href": "/petites-missions/creer",
    "role": "entraide"
  }
},
"arroser-plantes-vacances-annecy": {
  "midText": "Vous cherchez un relais pour vos plantes ?",
  "midPrimary": {
    "label": "Publier mon besoin d’arrosage",
    "href": "/petites-missions/creer",
    "role": "entraide"
  },
  "endHeading": "Préparer un coup de main à Annecy",
  "endText": "Décrivez les dates, les plantes, les passages et les conditions d’accès pour échanger avec les personnes intéressées.",
  "endPrimary": {
    "label": "Publier mon besoin d’arrosage",
    "href": "/petites-missions/creer",
    "role": "entraide"
  }
},
"arroser-plantes-vacances-grenoble": {
  "midText": "Vous cherchez un relais pour vos plantes ?",
  "midPrimary": {
    "label": "Publier mon besoin d’arrosage",
    "href": "/petites-missions/creer",
    "role": "entraide"
  },
  "endHeading": "Préparer un coup de main à Grenoble",
  "endText": "Décrivez les dates, les plantes, les passages et les conditions d’accès pour échanger avec les personnes intéressées.",
  "endPrimary": {
    "label": "Publier mon besoin d’arrosage",
    "href": "/petites-missions/creer",
    "role": "entraide"
  }
},

  ["boom-pet-sitting-lyon-2026"]: {
  "midText": "Vous préparez un séjour en télétravail ?",
  "midPrimary": {
    "label": "Consulter les annonces de garde",
    "href": "/search",
    "role": "sitter"
  },
  "endHeading": "Chercher un séjour compatible avec votre travail",
  "endText": "Lisez les soins et les conditions de séjour, puis posez vos questions sur la présence, le logement et la connexion avant de confirmer.",
  "endPrimary": {
    "label": "Consulter les annonces de garde",
    "href": "/search",
    "role": "sitter"
  }
},
  [VILLEURBANNE_OWNER_ARTICLE_SLUG]: {
    "midText": "Vous préparez une garde à Villeurbanne ?",
    "midPrimary": {
        "label": "Publier mon annonce de garde",
        "href": "/inscription?role=owner&redirect=%2Fsits%2Fcreate",
        "role": "owner"
    },
    "endHeading": "Préparer votre garde à Villeurbanne",
    "endText": "Présentez vos dates, les soins, les sorties et les conditions de séjour pour vérifier les possibilités avec les personnes intéressées.",
    "endPrimary": {
        "label": "Publier mon annonce de garde",
        "href": "/inscription?role=owner&redirect=%2Fsits%2Fcreate",
        "role": "owner"
    }
},

  [VALENCE_OWNER_ARTICLE_SLUG]: {
    "midText": "Vous préparez une garde à Valence ou dans son agglomération ?",
    "midPrimary": {
        "label": "Publier mon annonce de garde",
        "href": "/inscription?role=owner&redirect=%2Fsits%2Fcreate",
        "role": "owner"
    },
    "endHeading": "Préparer votre garde à Valence",
    "endText": "Présentez vos dates, votre logement et les besoins des animaux pour préparer les échanges et les conditions du séjour.",
    "endPrimary": {
        "label": "Publier mon annonce de garde",
        "href": "/inscription?role=owner&redirect=%2Fsits%2Fcreate",
        "role": "owner"
    }
},
  [VENISSIEUX_OWNER_ARTICLE_SLUG]: {
    "midText": "Vous préparez une garde de votre logement à Vénissieux ?",
    "midPrimary": {
        "label": "Publier mon annonce de garde",
        "href": "/inscription?role=owner&redirect=%2Fsits%2Fcreate",
        "role": "owner"
    },
    "endHeading": "Organiser votre garde à Vénissieux",
    "endText": "Décrivez les dates, les soins, les accès et les conditions d’hébergement pour vérifier ensemble si le séjour convient.",
    "endPrimary": {
        "label": "Publier mon annonce de garde",
        "href": "/inscription?role=owner&redirect=%2Fsits%2Fcreate",
        "role": "owner"
    }
},

  [GRENOBLE_STAY_OWNER_ARTICLE_SLUG]: {
    "midText": "Vous préparez une garde de votre logement à Grenoble ou en Chartreuse ?",
    "midPrimary": {
        "label": "Publier mon annonce de garde",
        "href": "/inscription?role=owner&redirect=%2Fsits%2Fcreate",
        "role": "owner"
    },
    "endHeading": "Préparer votre garde à Grenoble ou en Chartreuse",
    "endText": "Décrivez les dates, les accès, les soins et les sorties nécessaires pour préparer les échanges avec les personnes intéressées.",
    "endPrimary": {
        "label": "Publier mon annonce de garde",
        "href": "/inscription?role=owner&redirect=%2Fsits%2Fcreate",
        "role": "owner"
    }
},
  [SAINT_ETIENNE_OWNER_ARTICLE_SLUG]: {
    "midText": "Vous préparez une garde de votre maison et de vos animaux ?",
    "midPrimary": {
        "label": "Publier mon annonce de garde",
        "href": "/inscription?role=owner&redirect=%2Fsits%2Fcreate",
        "role": "owner"
    },
    "endHeading": "Organiser votre garde à Saint-Étienne et dans la Loire",
    "endText": "Présentez votre logement, vos dates et les besoins des animaux pour vérifier les possibilités de séjour et les tâches avant de confirmer.",
    "endPrimary": {
        "label": "Publier mon annonce de garde",
        "href": "/inscription?role=owner&redirect=%2Fsits%2Fcreate",
        "role": "owner"
    }
},

  [AIX_HOME_OWNER_ARTICLE_SLUG]: {
    "midText": "Vous préparez une garde de votre logement à Aix-les-Bains ?",
    "midPrimary": {
        "label": "Publier mon annonce de garde",
        "href": "/inscription?role=owner&redirect=%2Fsits%2Fcreate",
        "role": "owner"
    },
    "endHeading": "Préparer votre garde à Aix-les-Bains",
    "endText": "Décrivez les dates, le logement, les accès et les besoins des animaux pour échanger avec les personnes intéressées.",
    "endPrimary": {
        "label": "Publier mon annonce de garde",
        "href": "/inscription?role=owner&redirect=%2Fsits%2Fcreate",
        "role": "owner"
    }
},
  [FARM_HOME_OWNER_ARTICLE_SLUG]: {
    "midText": "Votre besoin relève d’une garde domestique ?",
    "midPrimary": {
        "label": "Publier mon annonce de garde",
        "href": "/inscription?role=owner&redirect=%2Fsits%2Fcreate",
        "role": "owner"
    },
    "endHeading": "Décrire une garde adaptée à votre maison et vos animaux",
    "endText": "Pour une garde domestique, précisez les animaux, les tâches, les compétences nécessaires et le relais. Pour le fonctionnement d’une exploitation, contactez le service de remplacement adapté.",
    "endPrimary": {
        "label": "Publier mon annonce de garde",
        "href": "/inscription?role=owner&redirect=%2Fsits%2Fcreate",
        "role": "owner"
    }
},

  ["gerer-animaux-difficiles-garde"]: {
  "midText": "Vous préparez votre prochaine garde ?",
  "midPrimary": {
    "label": "Consulter les annonces de garde",
    "href": "/search",
    "role": "sitter"
  },
  "endHeading": "Choisir une garde adaptée à votre expérience",
  "endText": "Lisez les besoins des animaux et les tâches prévues, puis posez vos questions au propriétaire avant de vous engager.",
  "endPrimary": {
    "label": "Consulter les annonces de garde",
    "href": "/search",
    "role": "sitter"
  }
},
  [LYON_VET_CONTACT_ARTICLE_SLUG]: {
    "midText": "Vous préparez une garde à venir ?",
    "midPrimary": {
        "label": "Publier mon annonce de garde",
        "href": "/inscription?role=owner&redirect=%2Fsits%2Fcreate",
        "role": "owner"
    },
    "endHeading": "Préparer une prochaine absence à Lyon",
    "endText": "Décrivez votre logement et les besoins des animaux pour préparer une garde future, les contacts et le relais avant de confirmer.",
    "endPrimary": {
        "label": "Publier mon annonce de garde",
        "href": "/inscription?role=owner&redirect=%2Fsits%2Fcreate",
        "role": "owner"
    }
},

  [ANNECY_VET_CONTACT_ARTICLE_SLUG]: {
    "midText": "Vous préparez une garde à venir ?",
    "midPrimary": {
        "label": "Publier mon annonce de garde",
        "href": "/inscription?role=owner&redirect=%2Fsits%2Fcreate",
        "role": "owner"
    },
    "endHeading": "Préparer une prochaine absence",
    "endText": "Pour une garde future, décrivez votre logement et les besoins de vos animaux. Échangez sur les contacts vétérinaires et les solutions de relais avant de confirmer.",
    "endPrimary": {
        "label": "Publier mon annonce de garde",
        "href": "/inscription?role=owner&redirect=%2Fsits%2Fcreate",
        "role": "owner"
    }
},
  [GRENOBLE_VET_CONTACT_ARTICLE_SLUG]: {
    "midText": "Vous préparez une garde à venir ?",
    "midPrimary": {
        "label": "Publier mon annonce de garde",
        "href": "/inscription?role=owner&redirect=%2Fsits%2Fcreate",
        "role": "owner"
    },
    "endHeading": "Organiser une prochaine garde chez vous",
    "endText": "Présentez vos dates, votre logement et les besoins des animaux pour préparer les échanges et les consignes avant votre absence.",
    "endPrimary": {
        "label": "Publier mon annonce de garde",
        "href": "/inscription?role=owner&redirect=%2Fsits%2Fcreate",
        "role": "owner"
    }
},

  [SAVOIE_ANIMALS_OWNER_ARTICLE_SLUG]: {
    "midText": "Vous envisagez un gardien hébergé pour vos animaux en Savoie ?",
    "midPrimary": {
        "label": "Publier mon annonce de garde",
        "href": "/inscription?role=owner&redirect=%2Fsits%2Fcreate",
        "role": "owner"
    },
    "endHeading": "Vous préparez une garde de vos animaux chez vous ?",
    "endText": "Présentez votre logement, les dates et les soins et sorties nécessaires pour échanger avec les personnes intéressées par un séjour en Savoie.",
    "endPrimary": {
        "label": "Publier mon annonce de garde",
        "href": "/inscription?role=owner&redirect=%2Fsits%2Fcreate",
        "role": "owner"
    }
},
  [HAUTE_SAVOIE_STAY_OWNER_ARTICLE_SLUG]: {
    "midText": "Vous souhaitez accueillir un gardien dans votre logement en Haute-Savoie ?",
    "midPrimary": {
        "label": "Publier mon annonce de garde",
        "href": "/inscription?role=owner&redirect=%2Fsits%2Fcreate",
        "role": "owner"
    },
    "endHeading": "Vous préparez une garde de votre appartement, maison ou chalet ?",
    "endText": "Décrivez le logement, les accès, vos dates et les tâches nécessaires pour préparer les échanges avec les personnes intéressées.",
    "endPrimary": {
        "label": "Publier mon annonce de garde",
        "href": "/inscription?role=owner&redirect=%2Fsits%2Fcreate",
        "role": "owner"
    }
},

  [FRANCE_PRACTICAL_OWNER_ARTICLE_SLUG]: {
    "midText": "Vous envisagez de confier votre logement pendant une absence ?",
    "midPrimary": {
        "label": "Publier mon annonce de garde",
        "href": "/inscription?role=owner&redirect=%2Fsits%2Fcreate",
        "role": "owner"
    },
    "endHeading": "Vous souhaitez proposer une garde adaptée à votre logement ?",
    "endText": "Décrivez les dates, les accès et les besoins de la maison et des animaux pour préparer les échanges avec les personnes intéressées.",
    "endPrimary": {
        "label": "Publier mon annonce de garde",
        "href": "/inscription?role=owner&redirect=%2Fsits%2Fcreate",
        "role": "owner"
    }
},
  [SUMMER_OWNER_ARTICLE_SLUG]: {
    "midText": "Vous préparez une garde de votre maison pour l’été ?",
    "midPrimary": {
        "label": "Publier mon annonce de garde",
        "href": "/inscription?role=owner&redirect=%2Fsits%2Fcreate",
        "role": "owner"
    },
    "endHeading": "Vous souhaitez accueillir un gardien pendant vos vacances d’été ?",
    "endText": "Présentez le logement, les dates et les besoins de vos animaux pour préparer un séjour compatible avec les soins et les tâches prévus.",
    "endPrimary": {
        "label": "Publier mon annonce de garde",
        "href": "/inscription?role=owner&redirect=%2Fsits%2Fcreate",
        "role": "owner"
    }
},

  [LYON_HUB_OWNER_ARTICLE_SLUG]: {
    "midText": "Vous envisagez un gardien hébergé pour vos animaux à Lyon ?",
    "midPrimary": {
        "label": "Publier mon annonce de garde",
        "href": "/inscription?role=owner&redirect=%2Fsits%2Fcreate",
        "role": "owner"
    },
    "endHeading": "Vous souhaitez proposer un séjour dans votre logement ?",
    "endText": "Présentez vos dates, votre logement à Lyon et les besoins de vos animaux pour échanger avec les personnes intéressées.",
    "endPrimary": {
        "label": "Publier mon annonce de garde",
        "href": "/inscription?role=owner&redirect=%2Fsits%2Fcreate",
        "role": "owner"
    }
},
  [WEST_LYON_OWNER_ARTICLE_SLUG]: {
    "midText": "Vous souhaitez accueillir un gardien dans votre maison de l’Ouest lyonnais ?",
    "midPrimary": {
        "label": "Publier mon annonce de garde",
        "href": "/inscription?role=owner&redirect=%2Fsits%2Fcreate",
        "role": "owner"
    },
    "endHeading": "Vous préparez une garde de votre maison et de vos animaux ?",
    "endText": "Décrivez le logement, les accès, les dates et les tâches convenues pour préparer un séjour compatible avec les besoins de chacun.",
    "endPrimary": {
        "label": "Publier mon annonce de garde",
        "href": "/inscription?role=owner&redirect=%2Fsits%2Fcreate",
        "role": "owner"
    }
},

  [CROIX_ROUSSE_OWNER_ARTICLE_SLUG]: {
    "midText": "Vous souhaitez accueillir un gardien à la Croix-Rousse ?",
    "midPrimary": {
        "label": "Publier mon annonce de garde",
        "href": "/inscription?role=owner&redirect=%2Fsits%2Fcreate",
        "role": "owner"
    },
    "endHeading": "Vous préparez une garde dans les pentes ou sur le plateau ?",
    "endText": "Présentez votre logement, les accès, vos dates et les besoins de vos animaux pour échanger avec les personnes intéressées par un séjour chez vous.",
    "endPrimary": {
        "label": "Publier mon annonce de garde",
        "href": "/inscription?role=owner&redirect=%2Fsits%2Fcreate",
        "role": "owner"
    }
},
  [PRESQUILE_CAT_OWNER_ARTICLE_SLUG]: {
    "midText": "Vous envisagez un gardien hébergé pour votre chat sur la Presqu’île ?",
    "midPrimary": {
        "label": "Publier mon annonce de garde",
        "href": "/inscription?role=owner&redirect=%2Fsits%2Fcreate",
        "role": "owner"
    },
    "endHeading": "Vous souhaitez préparer une garde de votre chat chez vous ?",
    "endText": "Décrivez votre appartement, les dates et les besoins de votre chat pour échanger avec les personnes intéressées par un séjour sur la Presqu’île.",
    "endPrimary": {
        "label": "Publier mon annonce de garde",
        "href": "/inscription?role=owner&redirect=%2Fsits%2Fcreate",
        "role": "owner"
    }
},

  [LYON_HOLIDAY_DOG_OWNER_ARTICLE_SLUG]: {
    "midText": "Vous souhaitez que votre chien reste chez vous à Lyon pendant vos vacances ?",
    "midPrimary": {
        "label": "Publier mon annonce de garde",
        "href": "/inscription?role=owner&redirect=%2Fsits%2Fcreate",
        "role": "owner"
    },
    "endHeading": "Vous préparez une garde à domicile pour vos vacances ?",
    "endText": "Présentez votre logement à Lyon, vos dates et les sorties et soins nécessaires pour échanger avec les personnes intéressées par un séjour chez vous.",
    "endPrimary": {
        "label": "Publier mon annonce de garde",
        "href": "/inscription?role=owner&redirect=%2Fsits%2Fcreate",
        "role": "owner"
    }
},
  [LYON_CAT_OWNER_ARTICLE_SLUG]: {
    "midText": "Vous envisagez un gardien hébergé pour votre chat à Lyon ?",
    "midPrimary": {
        "label": "Publier mon annonce de garde",
        "href": "/inscription?role=owner&redirect=%2Fsits%2Fcreate",
        "role": "owner"
    },
    "endHeading": "Vous souhaitez accueillir un gardien auprès de votre chat ?",
    "endText": "Décrivez votre logement, les dates et les besoins de votre chat pour préparer les échanges avec les personnes intéressées.",
    "endPrimary": {
        "label": "Publier mon annonce de garde",
        "href": "/inscription?role=owner&redirect=%2Fsits%2Fcreate",
        "role": "owner"
    }
},

  [ENTRUST_HOME_OWNER_ARTICLE_SLUG]: {
    "midText": "Vous souhaitez accueillir un gardien chez vous pendant votre absence ?",
    "midPrimary": {
        "label": "Publier mon annonce de garde",
        "href": "/inscription?role=owner&redirect=%2Fsits%2Fcreate",
        "role": "owner"
    },
    "endHeading": "Vous préparez une garde de votre maison ?",
    "endText": "Présentez les dates, le logement et les tâches à assurer pour échanger avec les personnes intéressées par un séjour chez vous.",
    "endPrimary": {
        "label": "Publier mon annonce de garde",
        "href": "/inscription?role=owner&redirect=%2Fsits%2Fcreate",
        "role": "owner"
    }
},
  [ABSENCE_SITUATIONS_OWNER_ARTICLE_SLUG]: {
    "midText": "Vous préparez une prochaine garde à domicile ?",
    "midPrimary": {
        "label": "Publier mon annonce de garde",
        "href": "/inscription?role=owner&redirect=%2Fsits%2Fcreate",
        "role": "owner"
    },
    "endHeading": "Vous envisagez un gardien hébergé pour une prochaine absence ?",
    "endText": "Décrivez vos dates, le logement proposé et les besoins de vos animaux pour préparer une garde compatible avec leur quotidien.",
    "endPrimary": {
        "label": "Publier mon annonce de garde",
        "href": "/inscription?role=owner&redirect=%2Fsits%2Fcreate",
        "role": "owner"
    }
},

  [AT_HOME_OWNER_ARTICLE_SLUG]: {
    "midText": "Vous souhaitez faire garder vos animaux chez vous ?",
    "midPrimary": {
        "label": "Publier mon annonce de garde",
        "href": "/inscription?role=owner&redirect=%2Fsits%2Fcreate",
        "role": "owner"
    },
    "endHeading": "Vous préparez une garde de vos animaux à domicile ?",
    "endText": "Présentez votre logement, les dates et les besoins de chaque animal pour échanger avec les personnes intéressées par un séjour chez vous.",
    "endPrimary": {
        "label": "Publier mon annonce de garde",
        "href": "/inscription?role=owner&redirect=%2Fsits%2Fcreate",
        "role": "owner"
    }
},
  [WELFARE_OWNER_ARTICLE_SLUG]: {
    "midText": "Vous préparez une prochaine garde pour votre animal ?",
    "midPrimary": {
        "label": "Publier mon annonce de garde",
        "href": "/inscription?role=owner&redirect=%2Fsits%2Fcreate",
        "role": "owner"
    },
    "endHeading": "Vous cherchez une garde adaptée pour une prochaine absence ?",
    "endText": "Décrivez les besoins de votre animal, vos dates et le logement proposé pour préparer le séjour d’un gardien chez vous.",
    "endPrimary": {
        "label": "Publier mon annonce de garde",
        "href": "/inscription?role=owner&redirect=%2Fsits%2Fcreate",
        "role": "owner"
    }
},

  [WELCOME_OWNER_ARTICLE_SLUG]: {
    midText: "Vous préparez une prochaine garde ?",
    midPrimary: { label: "Publier mon annonce de garde", href: "/inscription?role=owner&redirect=%2Fsits%2Fcreate", role: "owner" },
    endHeading: "Vous cherchez encore un gardien pour une prochaine absence ?",
    endText: "Décrivez votre logement, les dates et les tâches prévues pour échanger avec les personnes intéressées avant d’organiser leur arrivée.",
    endPrimary: { label: "Publier mon annonce de garde", href: "/inscription?role=owner&redirect=%2Fsits%2Fcreate", role: "owner" },
  },
  [DEPARTURE_OWNER_ARTICLE_SLUG]: {
    midText: "Vous n’avez pas encore confirmé votre garde ?",
    midPrimary: { label: "Publier mon annonce de garde", href: "/inscription?role=owner&redirect=%2Fsits%2Fcreate", role: "owner" },
    endHeading: "Vous n’avez pas encore trouvé de gardien ?",
    endText: "Présentez vos dates et les besoins de vos animaux pour préparer une garde à l’avance. La publication d’une annonce ne constitue pas une prise en charge confirmée.",
    endPrimary: { label: "Publier mon annonce de garde", href: "/inscription?role=owner&redirect=%2Fsits%2Fcreate", role: "owner" },
  },
  [INCIDENT_OWNER_ARTICLE_SLUG]: {
    midText: "Vous préparez une prochaine garde à l’avance ?",
    midPrimary: { label: "Publier mon annonce de garde", href: "/inscription?role=owner&redirect=%2Fsits%2Fcreate", role: "owner" },
    endHeading: "Vous préparez une prochaine absence ?",
    endText: "Décrivez vos dates, le logement et les tâches à convenir pour organiser une garde à l’avance. Une annonce ne remplace pas une aide immédiate si un problème est en cours.",
    endPrimary: { label: "Publier mon annonce de garde", href: "/inscription?role=owner&redirect=%2Fsits%2Fcreate", role: "owner" },
  },
  [HOSPITAL_OWNER_ARTICLE_SLUG]: {
    midText: "Vous avez le temps d’organiser une garde avant votre hospitalisation ?",
    midPrimary: { label: "Publier mon annonce de garde", href: "/inscription?role=owner&redirect=%2Fsits%2Fcreate", role: "owner" },
    endHeading: "Votre hospitalisation est prévue et vous préparez la garde ?",
    endText: "Présentez les dates connues et les besoins de votre animal. Si une prise en charge est nécessaire aujourd’hui, organisez d’abord un relais confirmé.",
    endPrimary: { label: "Publier mon annonce de garde", href: "/inscription?role=owner&redirect=%2Fsits%2Fcreate", role: "owner" },
  },
  [TRUST_OWNER_ARTICLE_SLUG]: {
    midText: "Vous préparez la garde de votre maison ?",
    midPrimary: { label: "Publier mon annonce de garde", href: "/inscription?role=owner&redirect=%2Fsits%2Fcreate", role: "owner" },
    endHeading: "Présentez votre besoin pour préparer une garde qui vous convient",
    endText: "Décrivez votre logement, les dates et les tâches prévues, puis échangez avec les personnes intéressées sur l’organisation du séjour.",
    endPrimary: { label: "Publier mon annonce de garde", href: "/inscription?role=owner&redirect=%2Fsits%2Fcreate", role: "owner" },
  },
  [AGREEMENT_OWNER_ARTICLE_SLUG]: {
    midText: "Vous souhaitez organiser une garde chez vous ?",
    midPrimary: { label: "Publier mon annonce de garde", href: "/inscription?role=owner&redirect=%2Fsits%2Fcreate", role: "owner" },
    endHeading: "Commencez par décrire la garde dont vous avez besoin",
    endText: "Indiquez vos dates, le logement et les tâches à convenir. L’accord de garde sera proposé après confirmation du séjour.",
    endPrimary: { label: "Publier mon annonce de garde", href: "/inscription?role=owner&redirect=%2Fsits%2Fcreate", role: "owner" },
  },
  [DOG_OWNER_ARTICLE_SLUG]: {
    midText: "Vous envisagez une garde de votre chien chez vous ?",
    midPrimary: { label: "Publier mon annonce de garde", href: "/inscription?role=owner&redirect=%2Fsits%2Fcreate", role: "owner" },
    endHeading: "Vous cherchez un gardien pour votre chien à domicile ?",
    endText: "Présentez vos dates, votre logement, les habitudes de votre chien et la présence nécessaire pour échanger avec les personnes intéressées.",
    endPrimary: { label: "Publier mon annonce de garde", href: "/inscription?role=owner&redirect=%2Fsits%2Fcreate", role: "owner" },
  },
  [CAT_OWNER_ARTICLE_SLUG]: {
    midText: "Vous souhaitez accueillir un gardien pour votre chat ?",
    midPrimary: { label: "Publier mon annonce de garde", href: "/inscription?role=owner&redirect=%2Fsits%2Fcreate", role: "owner" },
    endHeading: "Votre chat reste chez lui pendant votre absence ?",
    endText: "Décrivez vos dates, le logement proposé et les soins de votre chat pour préparer le séjour d’un gardien chez vous.",
    endPrimary: { label: "Publier mon annonce de garde", href: "/inscription?role=owner&redirect=%2Fsits%2Fcreate", role: "owner" },
  },
  [FRANCE_EXPAT_OWNER_ARTICLE_SLUG]: {
    midText: "Vous cherchez un gardien pour votre maison restée en France ?",
    midPrimary: { label: "Publier mon annonce de garde", href: "/inscription?role=owner&redirect=%2Fsits%2Fcreate", role: "owner" },
    endHeading: "Vous préparez la garde de votre maison en France ?",
    endText: "Présentez votre logement, vos dates et les tâches prévues, puis échangez avec les personnes intéressées pour préparer leur arrivée.",
    endPrimary: { label: "Publier mon annonce de garde", href: "/inscription?role=owner&redirect=%2Fsits%2Fcreate", role: "owner" },
  },
  [RECIPROCAL_OWNER_ARTICLE_SLUG]: {
    midText: "Vous souhaitez présenter votre besoin de garde ?",
    midPrimary: { label: "Publier mon annonce de garde", href: "/inscription?role=owner&redirect=%2Fsits%2Fcreate", role: "owner" },
    endHeading: "Commencez par la garde dont votre maison a besoin",
    endText: "Décrivez le logement, vos dates et les tâches prévues. Un éventuel retour de garde se discutera et se confirmera séparément.",
    endPrimary: { label: "Publier mon annonce de garde", href: "/inscription?role=owner&redirect=%2Fsits%2Fcreate", role: "owner" },
  },
  [PLANTS_OWNER_ARTICLE_SLUG]: {
    midText: "Vous cherchez un gardien pour votre maison et vos plantes ?",
    midPrimary: { label: "Publier mon annonce de garde", href: "/inscription?role=owner&redirect=%2Fsits%2Fcreate", role: "owner" },
    endHeading: "Vous souhaitez une présence dans votre maison pendant votre absence ?",
    endText: "Présentez le logement, vos dates et les soins de vos plantes à convenir, avec les autres tâches de garde prévues.",
    endPrimary: { label: "Publier mon annonce de garde", href: "/inscription?role=owner&redirect=%2Fsits%2Fcreate", role: "owner" },
  },
  [SECURITY_OWNER_ARTICLE_SLUG]: {
    midText: "Vous envisagez d’accueillir un gardien pendant votre absence ?",
    midPrimary: { label: "Publier mon annonce de garde", href: "/inscription?role=owner&redirect=%2Fsits%2Fcreate", role: "owner" },
    endHeading: "Vous préférez que quelqu’un habite votre maison ?",
    endText: "Décrivez votre logement, vos dates et les tâches courantes prévues pour échanger avec les personnes intéressées par la garde.",
    endPrimary: { label: "Publier mon annonce de garde", href: "/inscription?role=owner&redirect=%2Fsits%2Fcreate", role: "owner" },
  },
  [WINTER_OWNER_ARTICLE_SLUG]: {
    midText: "Vous cherchez quelqu’un pour votre chalet cet hiver ?",
    midPrimary: { label: "Publier mon annonce de garde", href: "/inscription?role=owner&redirect=%2Fsits%2Fcreate", role: "owner" },
    endHeading: "Vous préparez une absence de votre chalet ?",
    endText: "Présentez vos dates, le logement, les conditions d’accès et les tâches prévues pour échanger avec les personnes intéressées.",
    endPrimary: { label: "Publier mon annonce de garde", href: "/inscription?role=owner&redirect=%2Fsits%2Fcreate", role: "owner" },
  },
  [GARDEN_OWNER_ARTICLE_SLUG]: {
    midText: "Vous cherchez un gardien pour votre maison et votre jardin ?",
    midPrimary: { label: "Publier mon annonce de garde", href: "/inscription?role=owner&redirect=%2Fsits%2Fcreate", role: "owner" },
    endHeading: "Votre maison et votre jardin ont besoin d’un relais ?",
    endText: "Indiquez vos dates, le logement proposé et les soins courants du jardin à convenir, avec ou sans animaux.",
    endPrimary: { label: "Publier mon annonce de garde", href: "/inscription?role=owner&redirect=%2Fsits%2Fcreate", role: "owner" },
  },
  [CHRISTMAS_OWNER_ARTICLE_SLUG]: {
    midText: "Vous cherchez un gardien pour Noël ou le Nouvel An ?",
    midPrimary: { label: "Publier mon annonce de garde", href: "/inscription?role=owner&redirect=%2Fsits%2Fcreate", role: "owner" },
    endHeading: "Vous préparez un départ pendant les fêtes ?",
    endText: "Présentez votre maison, vos dates et la présence attendue pendant les réveillons, puis échangez avec les personnes intéressées.",
    endPrimary: { label: "Publier mon annonce de garde", href: "/inscription?role=owner&redirect=%2Fsits%2Fcreate", role: "owner" },
  },
  [WEEKEND_OWNER_ARTICLE_SLUG]: {
    midText: "Vous cherchez quelqu’un pour votre maison le temps d’un week-end ?",
    midPrimary: { label: "Publier mon annonce de garde", href: "/inscription?role=owner&redirect=%2Fsits%2Fcreate", role: "owner" },
    endHeading: "Votre prochain week-end se prépare ?",
    endText: "Indiquez vos dates, les besoins de votre maison et les horaires à couvrir pour organiser la garde avec les personnes intéressées.",
    endPrimary: { label: "Publier mon annonce de garde", href: "/inscription?role=owner&redirect=%2Fsits%2Fcreate", role: "owner" },
  },
  [LISTING_OWNER_ARTICLE_SLUG]: {
    midText: "Vous préparez une annonce de garde pour votre maison ?",
    midPrimary: { label: "Publier mon annonce de garde", href: "/inscription?role=owner&redirect=%2Fsits%2Fcreate", role: "owner" },
    endHeading: "Votre besoin de garde est prêt à être présenté ?",
    endText: "Rassemblez vos dates, les photos du logement et les tâches prévues, puis présentez votre garde aux personnes intéressées.",
    endPrimary: { label: "Publier mon annonce de garde", href: "/inscription?role=owner&redirect=%2Fsits%2Fcreate", role: "owner" },
  },
  [PREPARATION_OWNER_ARTICLE_SLUG]: {
    midText: "Vous préparez votre maison et cherchez encore un gardien ?",
    midPrimary: { label: "Publier mon annonce de garde", href: "/inscription?role=owner&redirect=%2Fsits%2Fcreate", role: "owner" },
    endHeading: "Vous cherchez encore quelqu’un pour votre maison ?",
    endText: "Présentez votre logement, vos dates et les tâches prévues. Les consignes détaillées se transmettront ensuite à la personne retenue.",
    endPrimary: { label: "Publier mon annonce de garde", href: "/inscription?role=owner&redirect=%2Fsits%2Fcreate", role: "owner" },
  },
  [CHOOSING_OWNER_ARTICLE_SLUG]: {
    midText: "Vous cherchez un gardien pour votre maison ?",
    midPrimary: { label: "Publier mon annonce de garde", href: "/inscription?role=owner&redirect=%2Fsits%2Fcreate", role: "owner" },
    endHeading: "Votre besoin de garde est prêt à être présenté ?",
    endText: "Décrivez votre maison, vos dates et les tâches prévues, puis échangez avec les personnes intéressées pour choisir votre gardien.",
    endPrimary: { label: "Publier mon annonce de garde", href: "/inscription?role=owner&redirect=%2Fsits%2Fcreate", role: "owner" },
  },
  [NO_PETS_OWNER_ARTICLE_SLUG]: {
    midText: "Vous souhaitez faire garder votre maison sans animaux ?",
    midPrimary: { label: "Publier mon annonce de garde", href: "/inscription?role=owner&redirect=%2Fsits%2Fcreate", role: "owner" },
    endHeading: "Votre maison a besoin d’attention pendant votre absence ?",
    endText: "Présentez votre logement, vos dates et les tâches à assurer, même sans animaux à garder, puis échangez avec les personnes intéressées.",
    endPrimary: { label: "Publier mon annonce de garde", href: "/inscription?role=owner&redirect=%2Fsits%2Fcreate", role: "owner" },
  },
  [PENSION_OWNER_ARTICLE_SLUG]: {
    midText: "Vous envisagez un gardien hébergé chez vous pour votre chien ?",
    midPrimary: { label: "Publier mon annonce de garde", href: "/inscription?role=owner&redirect=%2Fsits%2Fcreate", role: "owner" },
    endHeading: "Vous préférez faire garder votre chien à la maison ?",
    endText: "Présentez votre logement, vos dates et les besoins de votre chien, puis échangez avec les personnes intéressées par la garde.",
    endPrimary: { label: "Publier mon annonce de garde", href: "/inscription?role=owner&redirect=%2Fsits%2Fcreate", role: "owner" },
  },
  [LONG_STAY_OWNER_ARTICLE_SLUG]: {
    midText: "Vous cherchez un gardien pour plusieurs semaines ?",
    midPrimary: { label: "Publier mon annonce de garde", href: "/inscription?role=owner&redirect=%2Fsits%2Fcreate", role: "owner" },
    endHeading: "Vous préparez deux semaines d’absence ou davantage ?",
    endText: "Indiquez toutes vos dates, les besoins de vos animaux et le logement proposé pour organiser votre garde avec les personnes intéressées.",
    endPrimary: { label: "Publier mon annonce de garde", href: "/inscription?role=owner&redirect=%2Fsits%2Fcreate", role: "owner" },
  },
  [CALEDONIE_OWNER_ARTICLE_SLUG]: {
    midText: "Vous cherchez un gardien pour votre maison en Nouvelle-Calédonie ?",
    midPrimary: { label: "Publier mon annonce de garde", href: "/inscription?role=owner&redirect=%2Fsits%2Fcreate", role: "owner" },
    endHeading: "Vous préparez une absence du Caillou ?",
    endText: "Présentez votre logement, vos dates et le quotidien de vos animaux, puis échangez avec les personnes intéressées.",
    endPrimary: { label: "Publier mon annonce de garde", href: "/inscription?role=owner&redirect=%2Fsits%2Fcreate", role: "owner" },
  },
  [TAHITI_OWNER_ARTICLE_SLUG]: {
    midText: "Vous cherchez un gardien pour votre maison à Tahiti ?",
    midPrimary: { label: "Publier mon annonce de garde", href: "/inscription?role=owner&redirect=%2Fsits%2Fcreate", role: "owner" },
    endHeading: "Vous préparez une absence à Tahiti ?",
    endText: "Présentez votre commune, vos dates et les besoins de votre maison et de vos animaux.",
    endPrimary: { label: "Publier mon annonce de garde", href: "/inscription?role=owner&redirect=%2Fsits%2Fcreate", role: "owner" },
  },
  [REUNION_OWNER_ARTICLE_SLUG]: {
    midText: "Vous cherchez quelqu’un pour votre maison à La Réunion ?",
    midPrimary: { label: "Publier mon annonce de garde", href: "/inscription?role=owner&redirect=%2Fsits%2Fcreate", role: "owner" },
    endHeading: "Vous préparez votre départ de La Réunion ?",
    endText: "Présentez votre commune, vos dates et votre maison, puis échangez avec les personnes intéressées.",
    endPrimary: { label: "Publier mon annonce de garde", href: "/inscription?role=owner&redirect=%2Fsits%2Fcreate", role: "owner" },
  },
  [EXPAT_OWNER_ARTICLE_SLUG]: {
    midText: "Vous préparez une absence ? Présentez votre maison et les besoins de vos animaux.",
    midPrimary: { label: "Publier mon annonce de garde", href: "/inscription?role=owner&redirect=%2Fsits%2Fcreate", role: "owner" },
    endHeading: "Vous préparez votre prochain départ ?",
    endText: "Présentez votre maison, vos dates et les besoins de vos animaux, puis faites connaissance avec les personnes intéressées.",
    endPrimary: { label: "Publier mon annonce de garde", href: "/inscription?role=owner&redirect=%2Fsits%2Fcreate", role: "owner" },
  },
  "oser-demander-coup-de-main-pres-de-chez-soi": {
  "midText": "Vous avez une aide ponctuelle à organiser ?",
  "midPrimary": {
    "label": "Demander un coup de main",
    "href": "/petites-missions/creer",
    "role": "entraide"
  },
  "endHeading": "Décrire une première demande simplement",
  "endText": "Présentez le besoin, le secteur et les conditions utiles. Vous déciderez ensuite avec la personne intéressée si l’échange convient à chacun.",
  "endPrimary": {
    "label": "Demander un coup de main",
    "href": "/petites-missions/creer",
    "role": "entraide"
  }
},
  "idees-coups-de-main-entraide-pres-de-chez-soi": {
  "midText": "Vous avez une première idée de coup de main ?",
  "midPrimary": {
    "label": "Découvrir l’entraide près de chez moi",
    "href": "/petites-missions",
    "role": "entraide"
  },
  "endHeading": "Choisir un premier coup de main",
  "endText": "Consultez les besoins, présentez vos savoir-faire ou préparez une demande précise. L’échange se construit ensuite avec les personnes intéressées.",
  "endPrimary": {
    "label": "Découvrir l’entraide près de chez moi",
    "href": "/petites-missions",
    "role": "entraide"
  }
},
  "se-sentir-utile-pres-de-chez-soi": {
  "midText": "Vous souhaitez donner un coup de main ?",
  "midPrimary": {
    "label": "Proposer mon aide",
    "href": "/profile?section=savoir-faire",
    "role": "entraide"
  },
  "endHeading": "Présenter ce que vous savez et souhaitez faire",
  "endText": "Présentez vos compétences et vos limites. Les conditions de chaque coup de main se conviennent ensuite avec la personne concernée.",
  "endPrimary": {
    "label": "Proposer mon aide",
    "href": "/profile?section=savoir-faire",
    "role": "entraide"
  }
},
  "petites-missions-entraide-guardiens": {
  "midText": "Vous avez une aide ponctuelle à organiser ?",
  "midPrimary": {
    "label": "Demander un coup de main",
    "href": "/petites-missions/creer",
    "role": "entraide"
  },
  "endHeading": "Décrire votre besoin ponctuel",
  "endText": "Précisez la tâche, le lieu et les conditions utiles, puis échangez avec les personnes intéressées avant de convenir de l’organisation.",
  "endPrimary": {
    "label": "Demander un coup de main",
    "href": "/petites-missions/creer",
    "role": "entraide"
  }
},
  "petites-missions-entraide-guide": {
    midText: "Un coup de main à demander, ou du temps à donner ?",
    midPrimary: { label: "Demander un coup de main", href: "/petites-missions/creer", role: "entraide" },
    midSecondary: { label: "Proposer mon aide", href: "/profile?section=savoir-faire", role: "entraide" },
    endHeading: "Le premier coup de main est souvent le plus simple",
    endText: "Publiez votre demande en quelques minutes : les membres du coin la reçoivent le lendemain matin. Pour aider, dites sur votre profil ce que vous savez faire.",
    endPrimary: { label: "Demander un coup de main", href: "/petites-missions/creer", role: "entraide" },
    endSecondary: { label: "Voir les coups de main près de chez moi", href: "/petites-missions", role: "entraide" },
  },
  "bricolage-montage-meubles-entraide-grenoble-lyon": {
  "midText": "Vous avez un petit montage à préparer ?",
  "midPrimary": {
    "label": "Demander un coup de main",
    "href": "/petites-missions/creer",
    "role": "entraide"
  },
  "endHeading": "Décrire le coup de main dont vous avez besoin",
  "endText": "Indiquez le meuble, les gestes attendus, le matériel et les accès. Échangez sur les limites et les conditions avant de convenir du rendez-vous.",
  "endPrimary": {
    "label": "Demander un coup de main",
    "href": "/petites-missions/creer",
    "role": "entraide"
  }
},
  "courses-aide-domicile-entraide-senior-lyon": {
  "midText": "Vous avez une aide ponctuelle à organiser ?",
  "midPrimary": {
    "label": "Demander un coup de main",
    "href": "/petites-missions/creer",
    "role": "entraide"
  },
  "endHeading": "Décrire une aide ponctuelle, avec la personne concernée",
  "endText": "Précisez la tâche, le lieu et les conditions utiles, puis échangez avec les personnes intéressées avant de convenir de l’organisation.",
  "endPrimary": {
    "label": "Demander un coup de main",
    "href": "/petites-missions/creer",
    "role": "entraide"
  }
},
  "demenagement-entraide-locale-france": {
  "midText": "Vous avez une aide ponctuelle à organiser ?",
  "midPrimary": {
    "label": "Demander un coup de main",
    "href": "/petites-missions/creer",
    "role": "entraide"
  },
  "endHeading": "Préparer une demande d’aide au déménagement",
  "endText": "Décrivez les objets, les accès et la tâche proposée. Confirmez les conditions avec la personne qui accepte, sans compter sur une réponse avant cet échange.",
  "endPrimary": {
    "label": "Demander un coup de main",
    "href": "/petites-missions/creer",
    "role": "entraide"
  }
},
  "jardinage-entraide-locale-grenoble": {
  "midText": "Vous avez une aide ponctuelle à organiser ?",
  "midPrimary": {
    "label": "Demander un coup de main",
    "href": "/petites-missions/creer",
    "role": "entraide"
  },
  "endHeading": "Décrire votre coup de main au jardin à Grenoble",
  "endText": "Précisez la tâche, le lieu et les conditions utiles, puis échangez avec les personnes intéressées avant de convenir de l’organisation.",
  "endPrimary": {
    "label": "Demander un coup de main",
    "href": "/petites-missions/creer",
    "role": "entraide"
  }
},
  "jardinage-entraide-quartier-annecy": {
  "midText": "Vous avez une aide ponctuelle à organiser ?",
  "midPrimary": {
    "label": "Demander un coup de main",
    "href": "/petites-missions/creer",
    "role": "entraide"
  },
  "endHeading": "Préparer votre demande de jardinage à Annecy",
  "endText": "Précisez la tâche, les accès et le matériel. Échangez sur les conditions et les règles du lieu avant de convenir du coup de main.",
  "endPrimary": {
    "label": "Demander un coup de main",
    "href": "/petites-missions/creer",
    "role": "entraide"
  }
},
  "jardinage-entraide-quartier-lyon": {
  "midText": "Vous avez une aide ponctuelle à organiser ?",
  "midPrimary": {
    "label": "Demander un coup de main",
    "href": "/petites-missions/creer",
    "role": "entraide"
  },
  "endHeading": "Décrire votre coup de main au jardin à Lyon",
  "endText": "Précisez une tâche limitée, le matériel et les accès, puis échangez avec les personnes intéressées avant de convenir des conditions.",
  "endPrimary": {
    "label": "Demander un coup de main",
    "href": "/petites-missions/creer",
    "role": "entraide"
  }
},
  "reseau-entraide-quartier-lyon-aura": {
  "midText": "Vous cherchez une première occasion d’échanger ?",
  "midPrimary": {
    "label": "Découvrir l’entraide près de chez moi",
    "href": "/petites-missions",
    "role": "entraide"
  },
  "endHeading": "Découvrir un premier échange près de chez vous",
  "endText": "Consultez les besoins et choisissez ce qui correspond à vos capacités et disponibilités. Les conditions se construisent ensuite avec la personne intéressée.",
  "endPrimary": {
    "label": "Découvrir l’entraide près de chez moi",
    "href": "/petites-missions",
    "role": "entraide"
  }
},
  "chantier-participatif-projet-collectif-cadre-legal": {
  "midText": "Vous préparez un projet participatif ?",
  "midPrimary": {
    "label": "Décrire mon projet participatif",
    "href": "/projets/publier",
    "role": "projet"
  },
  "endHeading": "Préparer un projet dans le cadre de Guardiens",
  "endText": "Après vérification des activités, des conditions d’accueil et de vos assurances, décrivez ce que vous souhaitez partager et transmettre.",
  "endPrimary": {
    "label": "Décrire mon projet participatif",
    "href": "/projets/publier",
    "role": "projet"
  }
},
  "technologie-recreer-lien-pres-de-chez-soi": {
  "midText": "Vous avez envie de commencer un échange ?",
  "midPrimary": {
    "label": "Découvrir l’entraide près de chez moi",
    "href": "/petites-missions",
    "role": "entraide"
  },
  "endHeading": "Découvrir une première occasion de s’entraider",
  "endText": "Consultez les besoins, présentez vos savoir-faire ou préparez votre demande. Les conditions se conviennent ensuite avec la personne intéressée.",
  "endPrimary": {
    "label": "Découvrir l’entraide près de chez moi",
    "href": "/petites-missions",
    "role": "entraide"
  }
},

  "chantier-participatif-low-tech-participer-lancer-projet": {
  "midText": "Vous préparez un projet participatif ?",
  "midPrimary": {
    "label": "Consulter les projets participatifs",
    "href": "/projets",
    "role": "projet"
  },
  "endHeading": "Trouver un projet adapté à votre niveau",
  "endText": "Lisez les savoir-faire et les conditions proposées, puis échangez avec le porteur avant d’organiser votre venue.",
  "endPrimary": {
    "label": "Consulter les projets participatifs",
    "href": "/projets",
    "role": "projet"
  }
},

  "c-est-quoi-le-house-sitting": {
    midText: "Vous partez bientôt et vous cherchez quelqu'un pour veiller sur votre maison ?",
    midPrimary: { label: "Faire garder ma maison", href: "/inscription?role=owner", role: "owner" },
    midSecondary: { label: "Devenir gardien", href: "/devenir-home-sitter", role: "sitter" },
    endHeading: "Préparez votre annonce de garde",
    endText: "Décrivez vos dates, votre logement et vos animaux : les gardiens intéressés vous écrivent, vous choisissez après échange.",
    endPrimary: { label: "Préparer mon annonce", href: "/inscription?role=owner", role: "owner" },
    endSecondary: { label: "Je veux garder une maison", href: "/devenir-home-sitter", role: "sitter" },
  },

  "apprendre-menuiserie-permaculture-ecoconstruction-gratuitement": {
  "midText": "Vous souhaitez apprendre en participant à un projet ?",
  "midPrimary": {
    "label": "Consulter les projets participatifs",
    "href": "/projets",
    "role": "projet"
  },
  "endHeading": "Chercher un projet adapté à votre niveau",
  "endText": "Lisez les savoir-faire attendus et transmis, puis échangez sur les tâches et les conditions avant de proposer votre participation.",
  "endPrimary": {
    "label": "Consulter les projets participatifs",
    "href": "/projets",
    "role": "projet"
  }
},
};

/**
 * Routes réservées aux membres : un visiteur anonyme qui clique tombe sur un
 * mur. On passe par la page d'inscription, qui renvoie vers la cible après
 * création du compte. Un membre déjà connecté est envoyé directement vers la
 * cible par PublicOnlyRoute, qui lit le paramètre redirect.
 */
// Lot X3c : « Proposer mon aide » mène aux savoir-faire du profil (adresse
// unique du lot E1), réservée aux membres comme les autres cibles.
const ROUTES_MEMBRES = ["/projets/publier", "/petites-missions/creer", "/sits/create", "/dashboard", "/profile"];

/** Réécrit une destination réservée aux membres en passage par l'inscription. */
export function rewriteMemberHref(href: string): string {
  if (!href.startsWith("/")) return href;
  const path = href.split(/[?#]/)[0];
  if (!ROUTES_MEMBRES.includes(path)) return href;
  return `/inscription?redirect=${encodeURIComponent(href)}`;
}

/** Applique la réécriture aux liens internes du contenu markdown rendu. */
export function rewriteMemberLinksInHtml(html: string): string {
  return html.replace(/href="(\/[^"]*)"/g, (full, href: string) => {
    const rewritten = rewriteMemberHref(href);
    return rewritten === href ? full : `href="${rewritten}"`;
  });
}

function withRewrittenHrefs(copy: CtaCopy): CtaCopy {
  const link = <T extends { label: string; href: string; role: string } | undefined>(btn: T): T =>
    (btn ? { ...btn, href: rewriteMemberHref(btn.href) } : btn) as T;
  return {
    ...copy,
    midPrimary: link(copy.midPrimary),
    midSecondary: link(copy.midSecondary),
    endPrimary: link(copy.endPrimary),
    endSecondary: link(copy.endSecondary),
  };
}

/**
 * Articles guides refondus (mise en page de lecture dédiée) : ancres portées
 * par les titres, liens éditoriaux soulignés, tableau ajusté. Liste fermée,
 * les autres articles gardent le rendu historique.
 */
export const GUIDE_ARTICLE_SLUGS = new Set<string>([
  SIAMOIS_OWNER_ARTICLE_SLUG,

  PERSAN_OWNER_ARTICLE_SLUG,

  MAINE_COON_OWNER_ARTICLE_SLUG,
  MALINOIS_OWNER_ARTICLE_SLUG,

  LABRADOR_OWNER_ARTICLE_SLUG,

  GOLDEN_OWNER_ARTICLE_SLUG,

  CAVALIER_OWNER_ARTICLE_SLUG,

  BORDER_COLLIE_OWNER_ARTICLE_SLUG,
  BOULEDOGUE_FRANCAIS_OWNER_ARTICLE_SLUG,

  BERGER_ALLEMAND_OWNER_ARTICLE_SLUG,
  BERGER_AUSTRALIEN_OWNER_ARTICLE_SLUG,

  ...PROJECT_GUIDE_ARTICLE_SLUGS,
  BENGAL_OWNER_ARTICLE_SLUG,

  ...RESOURCE_GUIDE_ARTICLE_SLUGS,
  ...MIXED_GUIDE_ARTICLE_SLUGS,
  ANNECY_WALKS_OWNER_ARTICLE_SLUG,
  GRENOBLE_WALKS_OWNER_ARTICLE_SLUG,

  VILLES_CHIEN_OWNER_ARTICLE_SLUG,

  ...ENTRAIDE_GUIDE_ARTICLE_SLUGS,
  VILLEURBANNE_OWNER_ARTICLE_SLUG,

  VALENCE_OWNER_ARTICLE_SLUG,
  VENISSIEUX_OWNER_ARTICLE_SLUG,

  GRENOBLE_STAY_OWNER_ARTICLE_SLUG,
  SAINT_ETIENNE_OWNER_ARTICLE_SLUG,

  AIX_HOME_OWNER_ARTICLE_SLUG,
  FARM_HOME_OWNER_ARTICLE_SLUG,

  ...SITTER_GUIDE_ARTICLE_SLUGS,
  LYON_VET_CONTACT_ARTICLE_SLUG,

  ANNECY_VET_CONTACT_ARTICLE_SLUG,
  GRENOBLE_VET_CONTACT_ARTICLE_SLUG,

  SAVOIE_ANIMALS_OWNER_ARTICLE_SLUG,
  HAUTE_SAVOIE_STAY_OWNER_ARTICLE_SLUG,

  FRANCE_PRACTICAL_OWNER_ARTICLE_SLUG,
  SUMMER_OWNER_ARTICLE_SLUG,

  LYON_HUB_OWNER_ARTICLE_SLUG,
  WEST_LYON_OWNER_ARTICLE_SLUG,

  CROIX_ROUSSE_OWNER_ARTICLE_SLUG,
  PRESQUILE_CAT_OWNER_ARTICLE_SLUG,

  LYON_HOLIDAY_DOG_OWNER_ARTICLE_SLUG,
  LYON_CAT_OWNER_ARTICLE_SLUG,

  ENTRUST_HOME_OWNER_ARTICLE_SLUG,
  ABSENCE_SITUATIONS_OWNER_ARTICLE_SLUG,

  AT_HOME_OWNER_ARTICLE_SLUG,
  WELFARE_OWNER_ARTICLE_SLUG,

  WELCOME_OWNER_ARTICLE_SLUG,
  DEPARTURE_OWNER_ARTICLE_SLUG,
  INCIDENT_OWNER_ARTICLE_SLUG,
  HOSPITAL_OWNER_ARTICLE_SLUG,
  TRUST_OWNER_ARTICLE_SLUG,
  AGREEMENT_OWNER_ARTICLE_SLUG,
  DOG_OWNER_ARTICLE_SLUG,
  CAT_OWNER_ARTICLE_SLUG,
  FRANCE_EXPAT_OWNER_ARTICLE_SLUG,
  RECIPROCAL_OWNER_ARTICLE_SLUG,
  PLANTS_OWNER_ARTICLE_SLUG,
  SECURITY_OWNER_ARTICLE_SLUG,
  WINTER_OWNER_ARTICLE_SLUG,
  GARDEN_OWNER_ARTICLE_SLUG,
  CHRISTMAS_OWNER_ARTICLE_SLUG,
  WEEKEND_OWNER_ARTICLE_SLUG,
  LISTING_OWNER_ARTICLE_SLUG,
  PREPARATION_OWNER_ARTICLE_SLUG,
  CHOOSING_OWNER_ARTICLE_SLUG,
  NO_PETS_OWNER_ARTICLE_SLUG,
  "c-est-quoi-le-house-sitting",
  "expat-proprietaire-faire-garder-maison-etranger",
  REUNION_OWNER_ARTICLE_SLUG,
  TAHITI_OWNER_ARTICLE_SLUG,
  CALEDONIE_OWNER_ARTICLE_SLUG,
  "pension-chien-alternatives-guide",
  "vacances-longues-garde-animal-2-semaines",
  "parcs-chiens-lyon-guide-complet",
  "garde-animaux-haute-savoie-guide",
  "pet-sitting-clermont-ferrand",
  "chien-reactif-agressif-garde-solutions",
  "house-sitting-cadre-juridique-france",
]);

/** Déplace l'ancre vide `<h2><a id="x"></a>Titre` sur le titre lui-même. */
export function hoistHeadingAnchors(html: string): string {
  return html.replace(/<(h[23])>\s*<a id="([a-z0-9-]+)"><\/a>/g, '<$1 id="$2">');
}

function ctaCopyPour(slug?: string): CtaCopy {
  return withRewrittenHrefs((slug && CTA_PAR_SLUG[slug]) || CTA_DEFAUT);
}


/** Inject mid-article CTA after the 2nd <h2> */
function injectCTA(html: string, slug?: string): string {
  let h2Count = 0;
  const slugAttr = slug ? ` data-article-slug="${slug}"` : "";
  const copy = ctaCopyPour(slug);
  return html.replace(/<h2/g, (match) => {
    h2Count++;
    if (h2Count === 3) {
      // `data-cta-block="mid"` permet de masquer le bloc côté CSS pour les
      // utilisateurs logués (cf. .article-rich-content [data-cta-block="mid"]).
      return `<div class="article-cta-block" data-cta-block="mid"><div class="article-cta-inner"><p class="article-cta-text">${copy.midText}</p><div class="article-cta-buttons"><a href="${copy.midPrimary.href}" class="article-cta-btn article-cta-btn-primary" data-article-cta="true" data-cta-position="mid" data-cta-role="${copy.midPrimary.role}"${slugAttr}>${copy.midPrimary.label}</a>${copy.midSecondary ? `<a href="${copy.midSecondary.href}" class="article-cta-btn article-cta-btn-secondary" data-article-cta="true" data-cta-position="mid" data-cta-role="${copy.midSecondary.role}"${slugAttr}>${copy.midSecondary.label}</a>` : ""}</div></div></div>\n${match}`;
    }
    return match;
  });
}

/** Transform :::saviez-vous ... ::: blocks */
function transformFactBoxes(content: string): string {
  return content.replace(
    /:::saviez-vous\s*\n([\s\S]*?):::/g,
    (_, inner) => `<div class="fact-box"><div class="fact-box-icon">💡</div><div class="fact-box-content"><p class="fact-box-label">Le saviez-vous ?</p>${marked.parse(inner.trim(), { async: false })}</div></div>`
  );
}

/** Transform :::faq ... ::: blocks into visual Q/A HTML */
function transformFaqBlocks(content: string, omitHeading = false): string {
  return content.replace(
    /:::faq\s*\n([\s\S]*?):::/g,
    (_, inner: string) => {
      const lines = inner.split("\n");
      // Guides ciblés : le titre FAQ est le H2 #faq du markdown, on ne
      // rajoute pas l'intitulé par défaut (un seul titre FAQ).
      let html = omitHeading
        ? '<div class="article-faq-block">'
        : '<div class="article-faq-block"><h2 class="article-faq-heading">Foire aux questions</h2>';
      let currentQ = "";
      let currentA: string[] = [];

      const flush = () => {
        if (currentQ && currentA.length) {
          const answer = marked.parse(currentA.join("\n").trim(), { async: false }) as string;
          html += `<div class="article-faq-item"><h3 class="article-faq-question">${currentQ}</h3><div class="article-faq-answer">${answer}</div></div>`;
        }
        currentQ = "";
        currentA = [];
      };

      for (const line of lines) {
        const qMatch = line.trim().match(/^(?:\*\*(.+?)\*\*|#{2,4}\s+(.+?))\s*$/);
        if (qMatch) {
          flush();
          currentQ = (qMatch[1] ?? qMatch[2]).trim();
        } else if (currentQ) {
          currentA.push(line);
        }
      }
      flush();
      html += '</div>';
      return html;
    }
  );
}

/** Add banded backgrounds to H2 sections */
function addBandedSections(html: string): string {
  const parts = html.split(/(?=<h2)/);
  return parts.map((part, i) => {
    if (i > 0 && i % 2 === 0 && part.startsWith('<h2')) {
      return `<div class="article-banded-section">${part}</div>`;
    }
    return part;
  }).join('');
}

/** Add end-of-article CTA */
function addEndCTA(html: string, slug?: string): string {
  const slugAttr = slug ? ` data-article-slug="${slug}"` : "";
  const copy = ctaCopyPour(slug);
  return html + `<div class="article-cta-block article-cta-end"><div class="article-cta-inner"><p class="article-cta-heading">${copy.endHeading}</p><p class="article-cta-text">${copy.endText}</p><div class="article-cta-buttons"><a href="${copy.endPrimary.href}" class="article-cta-btn article-cta-btn-primary" data-article-cta="true" data-cta-position="end" data-cta-role="${copy.endPrimary.role}"${slugAttr}>${copy.endPrimary.label}</a>${copy.endSecondary ? `<a href="${copy.endSecondary.href}" class="article-cta-btn article-cta-btn-secondary" data-article-cta="true" data-cta-position="end" data-cta-role="${copy.endSecondary.role}"${slugAttr}>${copy.endSecondary.label}</a>` : ""}</div></div></div>`;
}

interface ArticleRendererProps {
  content: string;
  userRole?: "owner" | "sitter" | "both";
  /** Slug de l'article, utilisé pour instrumenter les CTAs (data-article-slug). */
  slug?: string;
  /**
   * Valeurs des variables dynamiques (placeholders {{...}}), issues de
   * useContentStats. Sans la prop, le rendu est identique à ceci près que
   * d'éventuelles accolades résiduelles sont retirées plutôt qu'affichées.
   */
  placeholderValues?: Record<string, PlaceholderValue>;
}

/**
 * Adapte UNIQUEMENT les CTAs end-article (data-cta-position="end") au rôle.
 *
 * Les liens éditoriaux placés à la main dans le markdown
 * (ex. `[s'inscrire](/inscription?role=owner)` dans un paragraphe pédagogique)
 * ne sont JAMAIS touchés, ils n'ont pas l'attribut `data-cta-position="end"`.
 *
 * Le CTA mid-article n'est pas réécrit non plus : il est masqué en CSS pour
 * les utilisateurs logués via le sélecteur `[data-cta-block="mid"]`.
 */
function adaptEndCTAsForRole(html: string, role?: "owner" | "sitter" | "both", slug?: string): string {
  if (!role) return html;

  // Capture une balise <a ... data-cta-position="end" ...> avec son inner text,
  // en ignorant les balises sans cet attribut. Le DOTALL ([\s\S]) couvre les
  // attributs sur plusieurs lignes par sécurité.
  return html.replace(
    /<a\b([^>]*?\bdata-cta-position="end"[^>]*?)>([^<]*)<\/a>/g,
    (full, attrs: string, _inner: string) => {
      const dataRole =
        attrs.match(/\bdata-cta-role="([^"]+)"/)?.[1] || null;

      if (PROJECT_GUIDE_ARTICLE_SLUGS.has(slug ?? "") && dataRole === "projet") {
        const href = CTA_PAR_SLUG[slug!].endPrimary.href;
        const newAttrs = attrs.replace(/href="[^"]*"/, `href="${href}"`);
        return `<a${newAttrs}>${_inner}</a>`;
      }
      if (MIXED_GUIDE_ARTICLE_SLUGS.has(slug ?? "") && (dataRole === "owner" || dataRole === "sitter")) {
        const href = dataRole === "owner" ? "/sits/create" : "/profile";
        const newAttrs = attrs.replace(/href="[^"]*"/, `href="${href}"`);
        return `<a${newAttrs}>${_inner}</a>`;
      }
      if (ENTRAIDE_GUIDE_ARTICLE_SLUGS.has(slug ?? "") && dataRole === "entraide") {
        const href = CTA_PAR_SLUG[slug!].endPrimary.href;
        const newAttrs = attrs.replace(/href="[^"]*"/, `href="${href}"`);
        return `<a${newAttrs}>${_inner}</a>`;
      }

      if (SITTER_PROFILE_GUIDE_ARTICLE_SLUGS.has(slug ?? "") && dataRole === "sitter") {
        const newAttrs = attrs.replace(/href="[^"]*"/, 'href="/profile"');
        return `<a${newAttrs}>${_inner}</a>`;
      }
      if (SITTER_GUIDE_ARTICLE_SLUGS.has(slug ?? "") && dataRole === "sitter") return full;

      // Sur ces guides propriétaires, un membre gardien peut aussi préparer sa propre garde.
      if (OWNER_GUIDE_ARTICLE_SLUGS.has(slug ?? "") && dataRole === "owner") {
        const newAttrs = attrs.replace(/href="[^"]*"/, 'href="/sits/create"');
        return `<a${newAttrs}>${_inner}</a>`;
      }

      // owner logué → tous les CTAs end pointent vers une action proprio utile
      if (role === "owner" || role === "both") {
        if (dataRole === "owner") {
          const newAttrs = attrs.replace(/href="[^"]*"/, 'href="/sits/create"');
          return `<a${newAttrs}>Publier une annonce →</a>`;
        }
        if (dataRole === "sitter") {
          const newAttrs = attrs.replace(/href="[^"]*"/, 'href="/search"');
          return `<a${newAttrs}>Trouver une garde près de chez vous →</a>`;
        }
      }
      // sitter logué → tous les CTAs end pointent vers la recherche de gardes
      if (role === "sitter") {
        if (dataRole === "sitter" || dataRole === "owner") {
          const newAttrs = attrs.replace(/href="[^"]*"/, 'href="/search"');
          return `<a${newAttrs}>Trouver une garde près de chez vous →</a>`;
        }
      }
      return full;
    }
  );
}

/** Strip leading H1 from content to avoid double-H1 */
function stripLeadingH1(md: string): string {
  return md.replace(/^#\s+.+\n+/, "");
}

/**
 * Enveloppe chaque tableau dans un conteneur à défilement horizontal.
 * Sans cela, un tableau comparatif déborde du viewport sur mobile et casse
 * la mise en page de la page entière.
 */
function wrapTables(html: string): string {
  return html.replace(
    /<table[\s\S]*?<\/table>/g,
    (table) => `<div class="article-table-scroll" role="region" tabindex="0">${table}</div>`,
  );
}


export default function ArticleRenderer({ content, userRole, slug, placeholderValues }: ArticleRendererProps) {
  // Substitution des variables dynamiques AVANT toute autre transformation,
  // donc avant marked.parse.
  const interpolated = interpolatePlaceholders(content, placeholderValues ?? {});
  const withoutH1 = stripLeadingH1(interpolated);
  const preprocessed = transformFaqBlocks(
    transformFactBoxes(withoutH1),
    PROJECT_GUIDE_ARTICLE_SLUGS.has(slug ?? "") || RESOURCE_GUIDE_ARTICLE_SLUGS.has(slug ?? "") || MIXED_GUIDE_ARTICLE_SLUGS.has(slug ?? "") || ENTRAIDE_GUIDE_ARTICLE_SLUGS.has(slug ?? "") || slug === "c-est-quoi-le-house-sitting" ||
      slug === SIAMOIS_OWNER_ARTICLE_SLUG ||
      slug === PERSAN_OWNER_ARTICLE_SLUG ||
      slug === MAINE_COON_OWNER_ARTICLE_SLUG || slug === MALINOIS_OWNER_ARTICLE_SLUG ||
      slug === LABRADOR_OWNER_ARTICLE_SLUG ||
      slug === GOLDEN_OWNER_ARTICLE_SLUG ||
      slug === CAVALIER_OWNER_ARTICLE_SLUG ||
      slug === BORDER_COLLIE_OWNER_ARTICLE_SLUG || slug === BOULEDOGUE_FRANCAIS_OWNER_ARTICLE_SLUG ||
      slug === BERGER_ALLEMAND_OWNER_ARTICLE_SLUG || slug === BERGER_AUSTRALIEN_OWNER_ARTICLE_SLUG ||
      slug === BENGAL_OWNER_ARTICLE_SLUG ||
      slug === ANNECY_WALKS_OWNER_ARTICLE_SLUG || slug === GRENOBLE_WALKS_OWNER_ARTICLE_SLUG ||
      slug === VILLES_CHIEN_OWNER_ARTICLE_SLUG ||
      slug === VILLEURBANNE_OWNER_ARTICLE_SLUG ||
      slug === VALENCE_OWNER_ARTICLE_SLUG || slug === VENISSIEUX_OWNER_ARTICLE_SLUG ||
      slug === GRENOBLE_STAY_OWNER_ARTICLE_SLUG || slug === SAINT_ETIENNE_OWNER_ARTICLE_SLUG ||
      slug === AIX_HOME_OWNER_ARTICLE_SLUG || slug === FARM_HOME_OWNER_ARTICLE_SLUG || SITTER_GUIDE_ARTICLE_SLUGS.has(slug ?? "") ||
      slug === LYON_VET_CONTACT_ARTICLE_SLUG ||
      slug === ANNECY_VET_CONTACT_ARTICLE_SLUG || slug === GRENOBLE_VET_CONTACT_ARTICLE_SLUG ||
      slug === SAVOIE_ANIMALS_OWNER_ARTICLE_SLUG || slug === HAUTE_SAVOIE_STAY_OWNER_ARTICLE_SLUG ||
      slug === FRANCE_PRACTICAL_OWNER_ARTICLE_SLUG || slug === SUMMER_OWNER_ARTICLE_SLUG ||
      slug === LYON_HUB_OWNER_ARTICLE_SLUG || slug === WEST_LYON_OWNER_ARTICLE_SLUG ||
      slug === CROIX_ROUSSE_OWNER_ARTICLE_SLUG || slug === PRESQUILE_CAT_OWNER_ARTICLE_SLUG ||
      slug === LYON_HOLIDAY_DOG_OWNER_ARTICLE_SLUG || slug === LYON_CAT_OWNER_ARTICLE_SLUG ||
      slug === ENTRUST_HOME_OWNER_ARTICLE_SLUG || slug === ABSENCE_SITUATIONS_OWNER_ARTICLE_SLUG ||
      slug === AT_HOME_OWNER_ARTICLE_SLUG || slug === WELFARE_OWNER_ARTICLE_SLUG ||
      slug === LISTING_OWNER_ARTICLE_SLUG || slug === PREPARATION_OWNER_ARTICLE_SLUG ||
      slug === CHRISTMAS_OWNER_ARTICLE_SLUG || slug === WEEKEND_OWNER_ARTICLE_SLUG ||
      slug === WINTER_OWNER_ARTICLE_SLUG || slug === GARDEN_OWNER_ARTICLE_SLUG ||
      slug === PLANTS_OWNER_ARTICLE_SLUG || slug === SECURITY_OWNER_ARTICLE_SLUG ||
      slug === FRANCE_EXPAT_OWNER_ARTICLE_SLUG || slug === RECIPROCAL_OWNER_ARTICLE_SLUG ||
      slug === DOG_OWNER_ARTICLE_SLUG || slug === CAT_OWNER_ARTICLE_SLUG ||
      slug === TRUST_OWNER_ARTICLE_SLUG || slug === AGREEMENT_OWNER_ARTICLE_SLUG ||
      slug === INCIDENT_OWNER_ARTICLE_SLUG || slug === HOSPITAL_OWNER_ARTICLE_SLUG ||
      slug === WELCOME_OWNER_ARTICLE_SLUG || slug === DEPARTURE_OWNER_ARTICLE_SLUG,
  );
  let html = marked.parse(preprocessed, { async: false }) as string;

  html = resolveArticleImages(html);
  html = rewriteMemberLinksInHtml(html);
  if (OWNER_GUIDE_ARTICLE_SLUGS.has(slug ?? "")) {
    // Le parcours propriétaire est rendu par l'en-tête et le bloc final.
    html = html.replace(/<p><strong><a href="\/inscription\?role=owner(?:&amp;|&)redirect=%2Fsits%2Fcreate">Publier mon annonce de garde<\/a><\/strong><\/p>\s*/g, "");
  } else if (!SITTER_GUIDE_ARTICLE_SLUGS.has(slug ?? "") && !ENTRAIDE_GUIDE_ARTICLE_SLUGS.has(slug ?? "") && !MIXED_GUIDE_ARTICLE_SLUGS.has(slug ?? "") && !RESOURCE_GUIDE_ARTICLE_SLUGS.has(slug ?? "") && !PROJECT_GUIDE_ARTICLE_SLUGS.has(slug ?? "")) {
    html = injectCTA(html, slug);
  }
  html = addBandedSections(html);
  html = addEndCTA(html, slug);
  html = adaptEndCTAsForRole(html, userRole, slug);
  html = wrapTables(html);
  const isGuide = !!slug && GUIDE_ARTICLE_SLUGS.has(slug);
  if (isGuide) {
    html = hoistHeadingAnchors(html);
    html = html.replace(
      /<div class="article-table-scroll" role="region" tabindex="0">/g,
      '<p class="article-table-hint">Faites glisser le tableau pour voir toutes les colonnes.</p><div class="article-table-scroll" role="region" tabindex="0" aria-label="Tableau comparatif, défilement horizontal">',
    );
  }


  // Sanitize against XSS (e.g. <script>, onerror=) before injection.
  const safeHtml = DOMPurify.sanitize(html, {
    ADD_ATTR: ["target", "rel", "data-user-logged-in", "loading", "decoding"],
  });

  // `data-user-logged-in` permet de masquer le CTA mid en CSS pour les
  // utilisateurs connectés (cf. règle dans index.css).
  return (
    <div
      className={isGuide ? "article-rich-content article-guide" : "article-rich-content"}
      data-user-logged-in={userRole ? "true" : "false"}
      dangerouslySetInnerHTML={{ __html: safeHtml }}
    />
  );
}

