export interface LocalSpot {
  name: string;
  type: "parc" | "balade" | "quartier" | "vétérinaire" | "marché";
  tip: string;
}

export type ZoneProfile = "montagne" | "urbain" | "périurbain";

export interface CityData {
  slug: string;
  name: string;
  department: string;
  departmentCode: string;
  region: "Auvergne-Rhône-Alpes";
  coordinates: { lat: number; lng: number };
  zoneProfile: ZoneProfile;
  keywordPrimary: string;
  keywordSecondary: string[];
  h1: string;
  metaDescription: string;
  localSpots: LocalSpot[];
  riskProfile: string[];
  expertiseTips: string[];
  heroImageAlt: string;
}

export const CITIES: CityData[] = [
  {
    slug: "annecy",
    name: "Annecy",
    department: "Haute-Savoie",
    departmentCode: "74",
    region: "Auvergne-Rhône-Alpes",
    coordinates: { lat: 45.8992, lng: 6.1294 },
    zoneProfile: "montagne",
    keywordPrimary: "house-sitting Annecy",
    keywordSecondary: [
      "garde maison Annecy",
      "pet sitting Haute-Savoie",
      "gardien de maison Annecy",
      "home sitter Annecy",
    ],
    h1: "House-sitting à Annecy : partez l'esprit libre",
    metaDescription:
      "Trouvez un home sitter de confiance à Annecy et en Haute-Savoie. Gardiens vérifiés, locaux, disponibles en 15 min. 0 € pour les propriétaires.",
    localSpots: [
      {
        name: "Lac d'Annecy",
        type: "balade",
        tip: "Tour complet : 40 km, idéal pour les chiens actifs tôt le matin avant l'affluence.",
      },
      {
        name: "Forêt du Crêt du Maure",
        type: "parc",
        tip: "Sentiers ombragés, zéro laisse obligatoire sur les pistes forestières balisées.",
      },
      {
        name: "Vieille-Ville d'Annecy",
        type: "quartier",
        tip: "Traversée possible avec un chien calme, terrasses dog-friendly rue Sainte-Claire.",
      },
    ],
    riskProfile: [
      "Verglas et neige : octobre–avril, notamment sur les hauteurs de Seynod et Cran-Gevrier",
      "Affluence touristique juillet–août : accès lac saturé le week-end",
    ],
    expertiseTips: [
      "Nos gardiens Annecy connaissent les périodes de gel et anticipent la gestion du chauffage et des canalisations.",
      "Pour les résidences secondaires côté lac, nos gardiens gèrent le courrier et les accès même hors saison.",
    ],
    heroImageAlt:
      "House-sitting Annecy - Lac d'Annecy et Haute-Savoie - Guardiens",
  },
  {
    slug: "lyon",
    name: "Lyon",
    department: "Rhône",
    departmentCode: "69",
    region: "Auvergne-Rhône-Alpes",
    coordinates: { lat: 45.764, lng: 4.8357 },
    zoneProfile: "urbain",
    keywordPrimary: "garde chien Lyon",
    keywordSecondary: [
      "pet sitter Lyon",
      "home sitting Lyon",
      "home sitter Lyon",
      "garde animaux Lyon",
      "gardien maison Lyon",
      "house-sitting Lyon",
    ],
    h1: "Garde de chien et de chat à Lyon : la plateforme de confiance des propriétaires",
    metaDescription:
      "Faites garder votre chien ou votre chat à Lyon par un home sitter de proximité vérifié. Inscription à 0 € pour les propriétaires. Sans commission.",
    localSpots: [
      {
        name: "Parc de la Tête d'Or",
        type: "parc",
        tip: "Entrée libre, laisse obligatoire. 105 hectares de pelouses et sentiers ombragés, idéal pour les promenades matinales.",
      },
      {
        name: "Quais de Saône (rive droite)",
        type: "balade",
        tip: "3 km piétons sans voiture de Saint-Paul à Île Barbe. Parfait pour les promenades du soir avec un chien calme.",
      },
      {
        name: "Berges du Rhône",
        type: "balade",
        tip: "5 km de promenade aménagée, zones enherbées pour les chiens. Ambiance familiale le week-end.",
      },
    ],
    riskProfile: [
      "Canicule urbaine : îlot de chaleur persistant juillet-août, logements non climatisés fréquents",
      "Pics de pollution aux particules : automne-hiver, vigilance pour les animaux sensibles",
    ],
    expertiseTips: [
      "Nos gardiens lyonnais connaissent les règles de copropriété et les horaires de sorties adaptés à la chaleur urbaine.",
      "Pour les logements en étage sans ascenseur ou sans jardin, nos gardiens adaptent le rythme des sorties.",
    ],
    heroImageAlt:
      "Garde de chien et de chat à Lyon - Vue panoramique depuis Fourvière - Guardiens",
  },
  {
    slug: "grenoble",
    name: "Grenoble",
    department: "Isère",
    departmentCode: "38",
    region: "Auvergne-Rhône-Alpes",
    coordinates: { lat: 45.1885, lng: 5.7245 },
    zoneProfile: "urbain",
    keywordPrimary: "house-sitting Grenoble",
    keywordSecondary: [
      "garde maison Grenoble",
      "pet sitting Isère",
      "house sitter Grenoble",
      "home sitter Grenoble",
      "home sitting Grenoble",
    ],
    h1: "House-sitting à Grenoble : des gardiens dans votre quartier",
    metaDescription:
      "Home sitting à Grenoble : trouvez un home sitter de confiance en Isère. Gardiens vérifiés, locaux, disponibles rapidement. 0 € pour les propriétaires.",
    localSpots: [
      {
        name: "Parc Paul Mistral",
        type: "parc",
        tip: "Grand espace vert central, chiens acceptés en laisse. Idéal pour les races actives.",
      },
      {
        name: "Bastille (sentier piéton)",
        type: "balade",
        tip: "Montée à pied possible avec chiens de taille moyenne, sol irrégulier à signaler.",
      },
      {
        name: "Quartier Championnet",
        type: "quartier",
        tip: "Quartier calme, peu de circulation, adapté aux sorties matinales avec chiens craintifs.",
      },
    ],
    riskProfile: [
      "Pollution en cuvette : pic aux particules fréquent novembre–février, fenêtres fermées recommandées",
      "Enneigement ponctuel sur les hauteurs de Meylan et Eybens en hiver",
    ],
    expertiseTips: [
      "Nos gardiens grenoblois anticipent les épisodes de pollution et adaptent les sorties des animaux.",
      "Pour les logements en pente (Chartreuse, Vercors), nos gardiens maîtrisent les accès même en conditions hivernales.",
    ],
    heroImageAlt:
      "House-sitting Grenoble - Garde maison Isère - Guardiens",
  },
  {
    slug: "caluire-et-cuire",
    name: "Caluire-et-Cuire",
    department: "Rhône",
    departmentCode: "69",
    region: "Auvergne-Rhône-Alpes",
    coordinates: { lat: 45.796, lng: 4.851 },
    zoneProfile: "périurbain",
    keywordPrimary: "house-sitting Caluire-et-Cuire",
    keywordSecondary: [
      "garde maison Caluire",
      "pet sitting nord Lyon",
      "gardien maison Caluire",
    ],
    h1: "House-sitting à Caluire-et-Cuire : votre gardien de confiance",
    metaDescription:
      "Garde de maison et animaux à Caluire-et-Cuire. Gardiens vérifiés à 15 min. Résidences avec jardin, chiens et chats bienvenus. 0 € propriétaires.",
    localSpots: [
      {
        name: "Parc de Montribloud",
        type: "parc",
        tip: "Espace vert calme, peu fréquenté, idéal pour les chiens anxieux ou en rééducation.",
      },
      {
        name: "Rives de Saône (Rochetaillée)",
        type: "balade",
        tip: "Chemin naturel 4 km, sans voiture. Praticable toute l'année sauf crue hivernale.",
      },
      {
        name: "Centre-ville Caluire",
        type: "quartier",
        tip: "Commerces de proximité ouverts le dimanche matin — utile pour les urgences vétérinaires mineures.",
      },
    ],
    riskProfile: [
      "Inondations Saône : quais bas inondables décembre–mars, logements proches à surveiller",
      "Jardins avec piscine : fermeture sécurisée à vérifier avant chaque mission",
    ],
    expertiseTips: [
      "Nos gardiens Caluire connaissent les zones inondables et savent gérer les accès en période de crue.",
      "Pour les maisons avec jardin et piscine, nos gardiens appliquent le protocole de sécurité piscine standard.",
    ],
    heroImageAlt:
      "House-sitting Caluire-et-Cuire - Garde maison nord Lyon - Guardiens",
  },
  {
    slug: "chambery",
    name: "Chambéry",
    department: "Savoie",
    departmentCode: "73",
    region: "Auvergne-Rhône-Alpes",
    coordinates: { lat: 45.5646, lng: 5.9178 },
    zoneProfile: "montagne",
    keywordPrimary: "house-sitting Chambéry",
    keywordSecondary: [
      "garde maison Chambéry",
      "pet sitting Savoie",
      "gardien maison Chambéry",
      "home sitter Chambéry",
      "home sitting Chambéry",
    ],
    h1: "House-sitting à Chambéry : partez sans inquiétude",
    metaDescription:
      "Home sitting à Chambéry : trouvez un home sitter de confiance en Savoie. Gardiens vérifiés, locaux, disponibles rapidement. 0 € pour les propriétaires.",
    localSpots: [
      {
        name: "Lac du Bourget (rive sud)",
        type: "balade",
        tip: "Sentier plat 8 km, chiens acceptés. Parking gratuit à Brison-Saint-Innocent.",
      },
      {
        name: "Parc du Verney",
        type: "parc",
        tip: "Central, ombragé, point d'eau pour les chiens. Ouvert jusqu'à 21h en été.",
      },
      {
        name: "Les Halles de l'Île",
        type: "quartier",
        tip: "Marchés mardi et samedi matin — excellent ancrage de proximité pour les gardiens locaux.",
      },
    ],
    riskProfile: [
      "Verglas fréquent novembre–mars, notamment sur les hauteurs de Jacob-Bellecombette",
      "Brouillard matinal automnal persistent : vigilance pour les sorties tôt le matin",
    ],
    expertiseTips: [
      "Nos gardiens chambériens anticipent le verglas et adaptent les horaires de sorties animaux en conséquence.",
      "Pour les résidences avec cave ou sous-sol humide, nos gardiens vérifient les pompes de relevage en hiver.",
    ],
    heroImageAlt:
      "House-sitting Chambéry - Garde maison Savoie - Guardiens",
  },
];
