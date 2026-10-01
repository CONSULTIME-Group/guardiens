/**
 * Guides locaux refondus (lot SEO 01/10/2026), liste fermée : lyon, annecy.
 *
 * Les lignes de city_guides et city_guide_places restent intactes en base.
 * Ce fichier ne fait que deux choses pour ces deux guides :
 * - remplacer les textes d'en-tête et la règle de laisse par une version
 *   sourcée (sources officielles citées) ;
 * - restreindre les lieux affichés à une sélection dédupliquée, avec des
 *   conseils corrigés. Un lieu absent de `places` n'est pas affiché : il n'est
 *   plus présenté comme une recommandation sans preuve.
 * Les autres guides gardent le rendu et les données historiques.
 */

export interface GuideSource {
  label: string;
  url: string;
}

export interface GuidePlaceOverride {
  tips?: string;
  description?: string;
  dogs_welcome?: boolean;
  leash_required?: boolean | null;
}

export interface GuideOverride {
  metaTitle: string;
  metaDescription: string;
  h1: string;
  intro: string;
  idealFor: string;
  leashRule: string;
  leashRuleSource: string;
  sources: GuideSource[];
  /** Points concrets, lus tels quels, visibles en HTML. */
  keyPoints: string[];
  /** Lieux retenus par identifiant, avec corrections éventuelles. */
  places: Record<string, GuidePlaceOverride>;
}

const COMMERCIAL_TIP = "Établissement référencé dans OpenStreetMap. Appelez avant de vous déplacer : horaires et accueil non garantis.";

export const GUIDE_OVERRIDES: Record<string, GuideOverride> = {
  lyon: {
    metaTitle: "Sortir avec un chien à Lyon : règles de laisse, aires canines, parcs | Guardiens",
    metaDescription: "Laisse, aires canines de la Tête d'Or et de Blandan, berges du Rhône, transports TCL : les règles pour sortir avec un chien à Lyon, avec leurs sources.",
    h1: "Sortir avec un chien à Lyon : règles et lieux vérifiés",
    intro: "En ville, la laisse est la règle. Lyon compte des aires canines aménagées, notamment au parc de la Tête d'Or (près du vélodrome), au parc Blandan (derrière les terrains de sport) et près du Clos Layat dans le 8e, et de nombreux parcs acceptent les chiens tenus en laisse. Les panneaux à l'entrée de chaque parc font foi.",
    idealFor: "Utile pour un gardien qui découvre Lyon ou un propriétaire qui prépare les consignes de sortie de son chien.",
    leashRule: "Oui. Les chiens doivent être tenus en laisse en ville, y compris sur les berges du Rhône ; des aires canines et des espaces canins de liberté sur les quais hauts permettent de les lâcher.",
    leashRuleSource: "ONLYLYON Tourisme",
    sources: [
      { label: "Lyon avec un chien, ONLYLYON Tourisme", url: "https://www.visiterlyon.com/lyon-pratique/bons-plans/lyon-avec-un-chien" },
      { label: "Les berges du Rhône, ONLYLYON Tourisme", url: "https://www.visiterlyon.com/sortir/parcs-jardins-et-lieux-de-balade/les-berges-du-rhone" },
      { label: "Le parc de la Tête d'Or, Ville de Lyon", url: "https://www.lyon.fr/sortir-et-decouvrir/profiter-de-la-nature-en-ville/le-parc-de-la-tete-d-or" },
    ],
    keyPoints: [
      "Aires canines : parc de la Tête d'Or, parc Blandan, Clos Layat (8e) ; d'autres parcs disposent de leur propre aire.",
      "Autour de Lyon : le parc de la Feyssine (Villeurbanne) et le Grand Parc de Miribel-Jonage accueillent les chiens tenus en laisse.",
      "Transports TCL : chien dans un panier, ou ticket dédié pour les chiens de plus de 6 kg ; le maître a aussi son titre de transport. Détails sur le site TCL.",
      "Ramassage des déjections : sacs à prévoir, distributeurs non garantis partout.",
    ],
    places: {
      "0a3581bd-8dc1-4f4b-b101-efec619346e4": {
        description: "Grand parc municipal. Une aire canine se trouve près du vélodrome ; ailleurs, chien en laisse et zones interdites signalées sur place.",
        tips: "Repérez l'aire canine avant la première sortie avec le chien.",
        leash_required: true,
      },
      "d1985e2e-3fc2-4eb0-b6f6-a77a7911c01b": {
        description: "Promenade aménagée qui relie le parc de la Tête d'Or au parc de Gerland, réservée aux modes doux. Chien en laisse, espaces canins de liberté sur les quais hauts.",
        tips: "Très fréquentée par les vélos et les trottinettes : laisse courte aux heures d'affluence.",
        leash_required: true,
      },
      "a0f5b3d5-1659-4d6c-b0c9-34718cb76d6b": { tips: COMMERCIAL_TIP },
      "c260a477-62b9-4cfb-8aff-676dfca72159": { tips: COMMERCIAL_TIP },
      "de087479-3081-4b74-96a7-92c65eaf8494": { tips: COMMERCIAL_TIP },
      "4436695e-202d-49a9-8233-86dc00dbab04": { tips: COMMERCIAL_TIP },
      "dfb21090-06df-42ea-b610-0363a6533752": { tips: COMMERCIAL_TIP },
      "5eb9907a-2282-491b-a68d-8d06d50e6570": { tips: COMMERCIAL_TIP },
    },
  },
  annecy: {
    metaTitle: "Sortir avec un chien à Annecy : laisse, lac, sites autorisés | Guardiens",
    metaDescription: "Laisse, plages du lac interdites aux chiens, sites sans laisse hors période du 15 avril au 30 juin, parcs fermés aux animaux : les règles à Annecy, sourcées.",
    h1: "Sortir avec un chien à Annecy : règles et lieux vérifiés",
    intro: "À Annecy, l'Office de tourisme demande de tenir les chiens en laisse en ville comme en balade, et les plages autour du lac n'acceptent pas les chiens. Un arrêté municipal autorise la promenade sans laisse sur quatre sites précis, sauf du 15 avril au 30 juin. Certains parcs, comme le parc du Haras, sont interdits aux animaux.",
    idealFor: "Utile pour un gardien qui découvre Annecy ou un propriétaire qui prépare les consignes de sortie de son chien.",
    leashRule: "Oui en règle générale. Quatre sites listés par l'arrêté municipal CN-2025-281 admettent les chiens sans laisse, à portée de voix, sauf du 15 avril au 30 juin où la laisse est obligatoire en tout lieu.",
    leashRuleSource: "Ville d'Annecy, arrêté CN-2025-281",
    sources: [
      { label: "Que faire au lac d'Annecy avec un chien, Lac Annecy Tourisme", url: "https://www.lac-annecy.com/idees-de-sejour/que-faire-au-lac-d-annecy-avec-un-chien/" },
      { label: "Arrêté CN-2025-281 sur les espaces naturels, Ville d'Annecy", url: "https://www.annecy.fr/fileadmin/mediatheque_annecy/Actes_administratifs/Arretes-municipaux/2025/2025_juillet/CN_2025_281.pdf" },
      { label: "Règlement du parc du Haras CN-2026-564, Ville d'Annecy", url: "https://www.annecy.fr/api/fileadmin/mediatheque_annecy/Ma_ville/Grands_projets/CN_2026_564.pdf" },
    ],
    keyPoints: [
      "Sites sans laisse (hors 15 avril au 30 juin) : une portion du parcours gymnique des Glaisins, la prairie à côté du parking de Sainte-Catherine, une portion de la promenade du Thiou, une portion de la prairie Fier Erbe.",
      "Sur ces sites, le chien reste à moins de 100 mètres, à portée de regard et de voix, et revient à l'appel.",
      "Plages du lac : chiens non admis.",
      "Parc du Haras : animaux interdits, même en laisse, sauf chiens guides.",
      "Ramassage des déjections obligatoire dans les espaces naturels.",
    ],
    places: {
      "7a25ad21-3133-4847-a5ec-bd144836ed32": {
        description: "Balade citadine le long du Thiou. Une portion figure parmi les sites où les chiens peuvent être promenés sans laisse.",
        tips: "Sans laisse seulement sur la portion signalée et hors période du 15 avril au 30 juin.",
        leash_required: null,
      },
      "c20e304a-f01b-4b0e-93bc-0db9bfde975a": {
        description: "Massif forestier cité par l'Office de tourisme comme idée de balade, soumis à l'arrêté municipal sur les espaces naturels.",
        tips: "Laisse obligatoire du 15 avril au 30 juin ; le reste de l'année, gardez le chien près de vous, loin de la faune et des jeunes plants.",
        leash_required: null,
      },
      "8b27289a-b792-43f5-a49e-c152985b9c1d": { tips: COMMERCIAL_TIP },
      "7594bb90-bc3d-418e-903b-d268f27caae9": { tips: COMMERCIAL_TIP },
      "623425b5-9848-4739-83fb-d61d59c52244": { tips: COMMERCIAL_TIP },
      "8ad7e157-1cc2-432a-bdce-9a61b074a221": { tips: COMMERCIAL_TIP },
      "d56e8e12-dd77-4b94-aa8f-54f205259b61": { tips: COMMERCIAL_TIP },
      "9ca58d24-0748-450d-a1f0-7def16121898": { tips: COMMERCIAL_TIP },
    },
  },
};
