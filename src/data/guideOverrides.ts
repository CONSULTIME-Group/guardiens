/**
 * Guides locaux refondus (lots SEO du 01/10/2026), liste fermée : lyon, annecy,
 * rennes, clermont-ferrand.
 *
 * Les lignes de city_guides et city_guide_places restent intactes en base.
 * Ce fichier ne fait que deux choses pour ces guides :
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
  /** true seulement si une source dit que les chiens sont admis ; sinon inconnu, aucun badge. */
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

/** Commerces et cliniques : rien n'est affirmé au-delà du nom et de l'adresse. */
export const COMMERCIAL_CATEGORIES = new Set(["vet", "pet_shop", "dog_friendly_cafe", "dog_friendly_restaurant"]);
export const COMMERCIAL_DESCRIPTION: Record<string, string> = {
  vet: "Cabinet vétérinaire référencé dans OpenStreetMap, adresse indicative.",
  pet_shop: "Animalerie référencée dans OpenStreetMap, adresse indicative.",
  dog_friendly_cafe: "Établissement référencé dans OpenStreetMap, accueil des chiens non vérifié.",
  dog_friendly_restaurant: "Établissement référencé dans OpenStreetMap, accueil des chiens non vérifié.",
};
const C = { tips: COMMERCIAL_TIP };

export const GUIDE_OVERRIDES: Record<string, GuideOverride> = {
  lyon: {
    metaTitle: "Sortir avec un chien à Lyon : règles de laisse, aires canines, parcs | Guardiens",
    metaDescription: "Laisse, aires canines de la Tête d'Or et de Blandan, berges du Rhône : les règles pour sortir avec un chien à Lyon, avec leurs sources.",
    h1: "Sortir avec un chien à Lyon : règles et repères locaux",
    intro: "En ville, la laisse est la règle. Lyon compte des aires canines aménagées, notamment au parc de la Tête d'Or (près du vélodrome), au parc Blandan (derrière les terrains de sport) et près du Clos Layat dans le 8e, et de nombreux parcs acceptent les chiens tenus en laisse. Les panneaux à l'entrée de chaque parc font foi.",
    idealFor: "Utile pour un gardien qui découvre Lyon ou un propriétaire qui prépare les consignes de sortie de son chien.",
    leashRule: "Oui. Les chiens doivent être tenus en laisse en ville, y compris sur les berges du Rhône ; des aires canines et des espaces canins de liberté sur les quais hauts permettent de les lâcher.",
    leashRuleSource: "ONLYLYON Tourisme",
    sources: [
      { label: "Lyon avec un chien, ONLYLYON Tourisme", url: "https://www.visiterlyon.com/lyon-pratique/bons-plans/lyon-avec-un-chien" },
      { label: "Les berges du Rhône, ONLYLYON Tourisme", url: "https://www.visiterlyon.com/sortir/parcs-jardins-et-lieux-de-balade/les-berges-du-rhone" },
      { label: "Le parc de la Tête d'Or, Ville de Lyon", url: "https://www.lyon.fr/sortir-et-decouvrir/profiter-de-la-nature-en-ville/le-parc-de-la-tete-dor" },
    ],
    keyPoints: [
      "Aires canines : parc de la Tête d'Or, parc Blandan, Clos Layat (8e) ; d'autres parcs disposent de leur propre aire.",
      "Autour de Lyon : le parc de la Feyssine (Villeurbanne) et le Grand Parc de Miribel-Jonage accueillent les chiens tenus en laisse.",
      "Transports en commun : petit chien dans un panier ; pour un grand chien, vérifiez les conditions de transport auprès du réseau TCL avant le trajet.",
      "Ramassage des déjections : sacs à prévoir, distributeurs non garantis partout.",
    ],
    places: {
      "0a3581bd-8dc1-4f4b-b101-efec619346e4": {
        description: "Grand parc municipal. Une aire canine se trouve près du vélodrome ; ailleurs, chien en laisse et zones interdites signalées sur place.",
        tips: "Repérez l'aire canine avant la première sortie avec le chien.",
        dogs_welcome: true,
        leash_required: true,
      },
      "d1985e2e-3fc2-4eb0-b6f6-a77a7911c01b": {
        description: "Promenade aménagée qui relie le parc de la Tête d'Or au parc de Gerland, réservée aux modes doux. Chien en laisse, espaces canins de liberté sur les quais hauts.",
        tips: "Très fréquentée par les vélos et les trottinettes : laisse courte aux heures d'affluence.",
        dogs_welcome: true,
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
    h1: "Sortir avec un chien à Annecy : règles et repères locaux",
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
        dogs_welcome: true,
        leash_required: null,
      },
      "c20e304a-f01b-4b0e-93bc-0db9bfde975a": {
        description: "Massif cité par l'Office de tourisme comme idée de balade avec un chien. Les règles de laisse dépendent des communes et des espaces traversés : aucune autorisation générale sans laisse.",
        tips: "Suivez l'affichage sur place et gardez le chien près de vous, loin des troupeaux et de la faune.",
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

  rennes: {
    metaTitle: "Sortir avec un chien à Rennes : laisse, espaces canins, parcs | Guardiens",
    metaDescription: "Laisse dans les parcs, trois types d'espaces canins, espace partagé des Prairies Saint-Martin : les règles pour sortir avec un chien à Rennes, sourcées.",
    h1: "Sortir avec un chien à Rennes : règles et repères locaux",
    intro: "À Rennes, les chiens sont admis dans tous les parcs et jardins de la Ville, tenus en laisse. Ils peuvent être lâchés dans les espaces canins, dont la carte est publiée par Rennes Métropole. Les lieux ci-dessous sont des repères, pas une liste complète : l'affichage à l'entrée fait foi.",
    idealFor: "Utile pour un gardien qui découvre Rennes ou un propriétaire qui prépare les consignes de sortie de son chien.",
    leashRule: "Oui dans les parcs et jardins, sauf dans les espaces canins où la laisse n'est pas obligatoire.",
    leashRuleSource: "Ville et Rennes Métropole",
    sources: [
      { label: "Animaux en ville : tout ce qu'il faut savoir, Rennes Métropole", url: "https://environnement-sante.metropole.rennes.fr/animaux-en-ville-tout-ce-qu-il-faut-savoir/" },
    ],
    keyPoints: [
      "Espaces canins : petits espaces surtout pour les besoins et les petits chiens, laisse non obligatoire.",
      "Espaces canins libres : grands espaces clos pour que le chien se dépense, laisse non obligatoire.",
      "Espace canin partagé : un seul pour l'instant, aux Prairies Saint-Martin, clôturé et ouvert aux autres usagers.",
      "Déjections ramassées partout ; la personne qui promène le chien en reste responsable.",
    ],
    places: {
      "6d89b356-78cc-4144-adbc-ac708665b4e0": { description: "Grand parc de la Ville au nord-est. Chiens admis en laisse, comme dans tous les parcs rennais, sauf dans les espaces canins signalés.", tips: "Repérez sur la carte de Rennes Métropole l'espace canin le plus proche.", dogs_welcome: true, leash_required: true },
      "691b44a3-694f-4a2a-b10b-f6385cf4f5dc": { description: "Parc de la Ville. Chiens admis en laisse, comme dans tous les parcs rennais.", tips: "L'affichage à l'entrée fait foi.", dogs_welcome: true, leash_required: true },
      "374e7050-f0f5-4771-a557-8c3d84e1d2ab": { description: "Parc de la Ville au sud-ouest. Chiens admis en laisse, comme dans tous les parcs rennais.", tips: "L'affichage à l'entrée fait foi.", dogs_welcome: true, leash_required: true },
      "e46c8dbd-bf30-4dd0-825f-6cfd3546f832": { description: "Parc de la Ville. Chiens admis en laisse, comme dans tous les parcs rennais.", tips: "L'affichage à l'entrée fait foi.", dogs_welcome: true, leash_required: true },
      "6440a244-a5be-4c05-9971-d35c40e79de6": { description: "Seul espace canin partagé de Rennes à ce jour : clôturé, mais ouvert aux autres usagers. Ailleurs dans le parc, laisse obligatoire.", tips: "Gardez le rappel sous contrôle : l'espace est partagé.", dogs_welcome: true, leash_required: null },
      "1edbd60b-b853-4d59-b6c9-49715a46d6c3": C, "80e8bbb1-f5cf-4abd-bcb3-fd5107a66a41": C, "5ed380cb-5938-450d-b4cc-d8a5e564d9c0": C, "b0fcbf8b-9aa2-4d4c-8f0e-8f7d657149a6": C,
      "eb46d472-8172-4a93-ae34-ffe4786caaa4": C, "1a84ee16-c73f-4fb8-a327-6360a42d8ed7": C, "2442f93d-eec8-4ce4-9ba7-da6a38858d5c": C,
    },
  },
  "clermont-ferrand": {
    metaTitle: "Sortir avec un chien à Clermont-Ferrand : laisse, volcans | Guardiens",
    metaDescription: "Chaîne des Puys en laisse, secteurs interdits, tour du lac d'Aydat, parcs en ville à vérifier sur place : les repères pour sortir avec un chien autour de Clermont.",
    h1: "Sortir avec un chien à Clermont-Ferrand : règles et repères locaux",
    intro: "Nous n'avons pas trouvé de règle officielle récente, parc par parc, pour les jardins de Clermont-Ferrand : en ville, l'affichage à l'entrée fait foi et nous ne présentons aucun parc comme ouvert aux chiens. Autour de la ville, l'Office de tourisme donne des règles claires pour la Chaîne des Puys et le lac d'Aydat.",
    idealFor: "Utile pour un gardien qui découvre Clermont-Ferrand ou un propriétaire qui prépare les consignes de sortie de son chien.",
    leashRule: "Oui sur tout le périmètre Chaîne des Puys et faille de Limagne, avec des secteurs interdits même en laisse. En ville, suivez l'affichage de chaque parc.",
    leashRuleSource: "Clermont Auvergne Tourisme",
    sources: [
      { label: "Volcans d'Auvergne, Clermont Auvergne Tourisme", url: "https://www.clermontauvergnetourisme.com/volcan-auvergne/" },
      { label: "Lac d'Aydat, Clermont Auvergne Tourisme", url: "https://www.clermontauvergnetourisme.com/lac-aydat/" },
    ],
    keyPoints: [
      "Chaîne des Puys et faille de Limagne : chien tenu en laisse sur l'ensemble du périmètre.",
      "Certains secteurs, comme le puy de Combegrasse, sont interdits aux chiens même en laisse.",
      "Lac d'Aydat : animaux interdits sur la plage et ses abords, tour du lac possible avec un chien en laisse.",
      "Parcs de Clermont-Ferrand : règles à lire à l'entrée de chaque parc.",
    ],
    places: {
      "29f7ed5a-ab47-4651-af58-b188b6e37db5": { description: "Hors de la ville. Sur le périmètre Chaîne des Puys et faille de Limagne, le chien est tenu en laisse ; certains secteurs, comme le puy de Combegrasse, lui sont interdits.", tips: "Vérifiez l'affichage au départ de chaque sentier.", dogs_welcome: true, leash_required: true },
      "0b143663-61fd-43b2-8524-c68f3376851d": C, "e04b3a80-c3de-4771-a67d-c51b6f5dcc2d": C, "05cb6b30-af60-4778-b51c-e7c1c88f904a": C, "f36c1d2f-ee58-41e9-9c81-42cca3794b7a": C,
      "4c5fc130-fbc9-4211-97b2-ce514242a5f5": C, "c4a82b3e-4336-4f98-8b51-9dc9cd185a66": C, "e3867a03-aabb-4010-9e26-f44fddb29e11": C,
    },
  },
};
