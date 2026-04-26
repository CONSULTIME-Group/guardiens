/**
 * Static demo listings injected client-side into search results
 * when there are NO real listings yet.
 * These never hit the database — no FK issues.
 *
 * Each demo sit is enriched so it can be opened on a dedicated demo
 * detail page (/annonces/demo/:slug) showing the full Guardiens experience:
 * pets with breeds, host story, schedule, breed tips, local guide link…
 */

export type DemoPet = {
  species: "dog" | "cat" | "farm_animal" | "rabbit" | "bird" | "fish" | "rodent" | "horse" | "nac";
  name: string;
  breed?: string;
  age?: string;
  notes?: string;
};

export type DemoSit = {
  id: string;
  slug: string;
  is_demo: true;
  title: string;
  description: string;
  start_date: string | null;
  end_date: string | null;
  status: "published";
  created_at: string;
  is_urgent: boolean;
  user_id: "demo";
  property_id: "demo";
  latitude: number;
  longitude: number;
  durationDays: number;
  owner: {
    first_name: string;
    avatar_url: string | null;
    city: string;
    citySlug: string; // for guide link
    department: string;
    identity_verified: boolean;
    bio: string;
  };
  property: {
    type: "house" | "apartment";
    environment: string;
    environments: string[];
    photos: string[];
    rooms: number;
    surface_m2: number;
    description: string;
    amenities: string[];
  };
  pets: DemoPet[];
  schedule: {
    morning: string;
    midday: string;
    evening: string;
    notes: string;
  };
  ownerMessage: string;
  avgRating: null;
  reviewCount: 0;
  topBadges: string[];
  distance: null;
  isNew: false;
};

const today = new Date();
const addDays = (n: number) => {
  const d = new Date(today);
  d.setDate(d.getDate() + n);
  return d.toISOString();
};

export const DEMO_SITS: DemoSit[] = [
  {
    id: "demo-garde-001",
    slug: "lyon-laika-jardin",
    is_demo: true,
    title: "Maison avec jardin, Laïka la Malinoise et son drôle de trio",
    description:
      "Nous partons deux semaines en famille et cherchons un gardien bienveillant pour veiller sur notre maison et nos trois animaux : une malinoise sportive, un Maine Coon majestueux et Coco, notre perroquet gris du Gabon — un sacré personnage. Quartier calme et arboré du 6ᵉ, à deux pas du parc de la Tête d'Or. Maison spacieuse avec jardin clos, idéale pour Laïka qui adore les longues balades.",
    start_date: addDays(21),
    end_date: addDays(35),
    status: "published",
    created_at: today.toISOString(),
    is_urgent: false,
    user_id: "demo",
    property_id: "demo",
    latitude: 45.7676,
    longitude: 4.8344,
    durationDays: 14,
    owner: {
      first_name: "Nadia",
      avatar_url:
        "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&q=80",
      city: "Lyon 6e",
      citySlug: "lyon",
      department: "69",
      identity_verified: true,
      bio: "Maman de trois enfants et de trois compagnons à quatre pattes. Architecte d'intérieur. J'aime les gens qui prennent le temps de connaître les habitudes de chacun.",
    },
    property: {
      type: "house",
      environment: "city_center",
      environments: ["city", "garden"],
      photos: [
        "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=1200&q=80",
        "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&q=80",
        "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=1200&q=80",
      ],
      rooms: 5,
      surface_m2: 140,
      description:
        "Maison de ville lumineuse sur trois niveaux avec jardin clos de 80 m². Cuisine équipée ouverte, salon avec cheminée, bureau au calme. Wifi fibre, machine à café, vélos disponibles.",
      amenities: ["wifi", "garden", "washing_machine", "bikes", "coffee_machine"],
    },
    pets: [
      {
        species: "dog",
        name: "Laïka",
        breed: "Berger belge malinois",
        age: "5 ans",
        notes:
          "Très énergique et obéissante. Deux vraies sorties par jour (45 min le matin, 45 min le soir) + un peu de jeu de pister dans le jardin. Aboie aux livreurs mais s'arrête au mot.",
      },
      {
        species: "cat",
        name: "Milo",
        breed: "Maine Coon",
        age: "8 ans",
        notes: "Géant pataud de 9 kg. Brossage tous les 2 jours conseillé (poil long), sort dans le jardin la journée.",
      },
      {
        species: "bird",
        name: "Coco",
        breed: "Perroquet gris du Gabon",
        age: "12 ans",
        notes:
          "Imite les sonneries et le rire de ma fille. Sort de sa cage 1h le matin sous surveillance. Mange fruits frais + granulés (instructions détaillées sur place).",
      },
    ],
    schedule: {
      morning: "Sortie running ou vélo avec Laïka 45 min, gamelles, ouverture cage de Coco 1h.",
      midday: "Visite rapide au jardin, fontaine à eau à recharger, quelques mots à Coco — il adore.",
      evening: "Promenade Laïka 45 min, repas du soir, brossage de Milo, câlins obligatoires 🥰",
      notes:
        "Comptez environ 2h30 de présence active par jour. Laïka a besoin de se dépenser — un gardien sportif sera ravi.",
    },
    ownerMessage:
      "On confie nos animaux à un voisin de confiance plutôt qu'à une pension. Vous repartirez sûrement avec des cookies maison de mon mari et une connaissance fine du quartier !",
    topBadges: [],
    avgRating: null,
    reviewCount: 0,
    distance: null,
    isNew: false,
  },
  {
    id: "demo-garde-002",
    slug: "annecy-lac-basse-cour",
    is_demo: true,
    title: "Maison en bois face au lac, un âne, un cheval et la basse-cour",
    description:
      "Notre cabane en bois donne directement sur le lac d'Annecy. Cadre exceptionnel pour qui aime la nature, le calme et les animaux. Vous serez aux petits soins de Pompon notre âne du Cotentin, de Galaxie notre jument Mérens, des trois poules Marans, du chat Moustache et du potager en pleine saison.",
    start_date: addDays(45),
    end_date: addDays(59),
    status: "published",
    created_at: today.toISOString(),
    is_urgent: false,
    user_id: "demo",
    property_id: "demo",
    latitude: 45.8992,
    longitude: 6.1294,
    durationDays: 14,
    owner: {
      first_name: "Rania",
      avatar_url:
        "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&q=80",
      city: "Annecy",
      citySlug: "annecy",
      department: "74",
      identity_verified: true,
      bio: "Couple cinquantenaire passionné de permaculture. On reçoit toujours nos gardiens avec un panier de légumes du jardin et une bouteille de vin de Savoie.",
    },
    property: {
      type: "house",
      environment: "countryside",
      environments: ["lake", "countryside", "garden"],
      photos: [
        "https://images.unsplash.com/photo-1499678329028-101435549a4e?w=1200&q=80",
        "https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=1200&q=80",
        "https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=1200&q=80",
      ],
      rooms: 3,
      surface_m2: 90,
      description:
        "Cabane en mélèze restaurée, mezzanine, poêle à bois, terrasse plein sud face au lac. Sentier privatif jusqu'à la rive (5 min). Potager 60 m² + poulailler.",
      amenities: ["wifi", "garden", "lake_view", "wood_stove", "kayak"],
    },
    pets: [
      {
        species: "horse",
        name: "Galaxie",
        breed: "Jument Mérens",
        age: "11 ans",
        notes:
          "Vit au pré attenant. Foin matin et soir, vérifier l'abreuvoir. Pansage simple si vous aimez — pas obligatoire. Très docile, parfaite pour débuter au contact des chevaux.",
      },
      {
        species: "horse",
        name: "Pompon",
        breed: "Âne du Cotentin",
        age: "9 ans",
        notes:
          "Inséparable de Galaxie. Adore les caresses sur le chanfrein et les pommes en récompense. Pas de monte.",
      },
      {
        species: "farm_animal",
        name: "Plume, Câline & Rosette",
        breed: "Poules Marans",
        age: "2-4 ans",
        notes:
          "3 œufs/jour environ. Ouvrir le poulailler le matin, refermer après le coucher du soleil pour les protéger des renards.",
      },
      {
        species: "cat",
        name: "Moustache",
        breed: "Chat des forêts norvégiennes",
        age: "7 ans",
        notes:
          "Sort librement la journée, rentre dormir le soir. Brossage 2x/semaine recommandé (poil long).",
      },
    ],
    schedule: {
      morning:
        "Foin de Galaxie & Pompon, ouverture du poulailler, ramassage des œufs, gamelle de Moustache, arrosage potager (15 min).",
      midday: "Vérifier les abreuvoirs (chevaux + poules), possible cueillette tomates/courgettes.",
      evening: "Foin du soir aux équidés, fermeture poulailler après le coucher du soleil, repas Moustache.",
      notes:
        "Comptez 2h par jour. Aucune compétence équestre exigée — on vous montre tout à l'arrivée. Possibilité de baignade au lac juste devant !",
    },
    ownerMessage:
      "Vous repartirez avec des œufs, des légumes, et probablement l'envie de revenir. Notre maison est ouverte aux gens curieux et respectueux de la nature.",
    topBadges: [],
    avgRating: null,
    reviewCount: 0,
    distance: null,
    isNew: false,
  },
  {
    id: "demo-garde-003",
    slug: "grenoble-deux-chats-appart",
    is_demo: true,
    title: "Appartement lumineux, un husky câlin et une chatte sacrée",
    description:
      "Appartement de 75 m² au cœur de Grenoble, 4ᵉ étage avec balcon plein sud et vue sur la Bastille. Yuki notre husky sibérien et Milo notre Sacré de Birmanie forment un duo improbable et adorable. Cadre parfait pour qui aime la ville, la montagne à 30 min, et les animaux atypiques.",
    start_date: addDays(10),
    end_date: addDays(25),
    status: "published",
    created_at: today.toISOString(),
    is_urgent: false,
    user_id: "demo",
    property_id: "demo",
    latitude: 45.1885,
    longitude: 5.7245,
    durationDays: 15,
    owner: {
      first_name: "Giulia",
      avatar_url:
        "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400&q=80",
      city: "Grenoble",
      citySlug: "grenoble",
      department: "38",
      identity_verified: true,
      bio: "Chercheuse au CEA, italienne d'origine. Je voyage souvent pour le travail et je cherche des gardiens fiables pour mes deux petites filles à quatre pattes.",
    },
    property: {
      type: "apartment",
      environment: "city_center",
      environments: ["city"],
      photos: [
        "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200&q=80",
        "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=1200&q=80",
        "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=1200&q=80",
      ],
      rooms: 3,
      surface_m2: 75,
      description:
        "Appartement haussmannien rénové, parquet d'origine, cuisine ouverte. Balcon de 8 m² sécurisé pour les chattes. Métro à 3 minutes, quartier animé avec marché le dimanche.",
      amenities: ["wifi", "balcony", "washing_machine", "dishwasher", "elevator"],
    },
    pets: [
      {
        species: "dog",
        name: "Yuki",
        breed: "Husky sibérien",
        age: "4 ans",
        notes:
          "Très câlin et bavard (ouh-ouh sonores en accueil !). Deux belles sorties par jour obligatoires (1h le matin, 45 min le soir) — sinon il s'ennuie. Tenu en laisse hors zones autorisées : un husky, ça file comme une flèche.",
      },
      {
        species: "cat",
        name: "Milo",
        breed: "Sacré de Birmanie",
        age: "6 ans",
        notes:
          "Très câlin mais timide les premiers jours. Se cache sous le canapé puis vient ronronner. Brossage hebdo (poil mi-long).",
      },
    ],
    schedule: {
      morning: "Sortie Yuki 1h (parc Paul-Mistral à 5 min), gamelles, ouverture du balcon si beau temps.",
      midday: "Pause pipi rapide pour Yuki en bas de l'immeuble, Milo dort.",
      evening: "Repas à 18h précises, sortie Yuki 45 min, nettoyage litière, séance jeu/câlins 20 min.",
      notes:
        "Comptez 2h30 par jour. Yuki est l'attraction du quartier — préparez-vous à être abordé par tous les enfants !",
    },
    ownerMessage:
      "Yuki et Milo sont mes bébés. J'aime quand mes gardiens m'envoient une photo par jour, même rapide. En échange, je vous laisse mon vélo, mon Netflix et la liste de mes adresses préférées en ville !",
    topBadges: [],
    avgRating: null,
    reviewCount: 0,
    distance: null,
    isNew: false,
  },
];

export const DEMO_MISSIONS = [
  {
    id: "demo-mission-001",
    is_demo: true,
    title: "Arroser le potager pendant 10 jours",
    description:
      "Potager de 20m² avec tomates, courgettes et herbes aromatiques. 20 minutes par jour, matin ou soir.",
    category: "garden",
    exchange_offer: "Un panier de légumes frais à emporter",
    city: "Écully",
    postal_code: "69130",
    status: "open",
    duration_estimate: "20 min/jour",
    date_needed: null,
    created_at: today.toISOString(),
    user_id: "demo",
    latitude: 45.7797,
    longitude: 3.0863,
    owner: {
      first_name: "Giulia",
      avatar_url:
        "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=200&q=80",
      city: "Écully",
      identity_verified: true,
    },
    distance: null,
    isNew: false,
    response_count: 0,
  },
  {
    id: "demo-mission-002",
    is_demo: true,
    title: "Promener Figo le lundi et mercredi matin",
    description:
      "Figo est un border collie de 3 ans, très joueur. 45 minutes par sortie, parc à 5 minutes à pied.",
    category: "animals",
    exchange_offer: "Un repas maison ou des œufs du jardin",
    city: "Caluire-et-Cuire",
    postal_code: "69300",
    status: "open",
    duration_estimate: "45 min × 2/sem",
    date_needed: null,
    created_at: today.toISOString(),
    user_id: "demo",
    latitude: 45.7953,
    longitude: 4.8500,
    owner: {
      first_name: "David",
      avatar_url: null,
      city: "Caluire-et-Cuire",
      identity_verified: false,
    },
    distance: null,
    isNew: false,
    response_count: 0,
  },
  {
    id: "demo-mission-003",
    is_demo: true,
    title: "Tailler la haie et désherber l'allée — 2 après-midis",
    description:
      "Haie de 15 mètres à tailler et allée à désherber. Outils fournis, prévoir gants.",
    category: "garden",
    exchange_offer: "Un dîner à mon retour, avec plaisir",
    city: "Limonest",
    postal_code: "69760",
    status: "open",
    duration_estimate: "2h × 2",
    date_needed: null,
    created_at: today.toISOString(),
    user_id: "demo",
    latitude: 45.7640,
    longitude: 4.8357,
    owner: {
      first_name: "Sarah",
      avatar_url: null,
      city: "Limonest",
      identity_verified: true,
    },
    distance: null,
    isNew: false,
    response_count: 0,
  },
];

/** Threshold: hide demos when real listings reach this count */
export const DEMO_THRESHOLD = 5;

export const getDemoSitBySlug = (slug: string): DemoSit | null =>
  DEMO_SITS.find((s) => s.slug === slug) ?? null;

/**
 * Intercale des annonces de démo dans une liste de résultats réels.
 * Une démo est insérée tous les `step` éléments réels (par défaut 3),
 * en partant du début. Les démos restantes sont ajoutées à la fin.
 * Garantit que les démos sont visibles sur tous types de recherche
 * sans masquer les vraies annonces.
 */
export function interleaveDemos<T extends { id?: string }>(
  real: T[],
  demos: readonly T[],
  step = 3,
): T[] {
  if (!demos.length) return real;
  const out: T[] = [];
  let demoIdx = 0;
  for (let i = 0; i < real.length; i++) {
    out.push(real[i]);
    if ((i + 1) % step === 0 && demoIdx < demos.length) {
      out.push(demos[demoIdx++]);
    }
  }
  while (demoIdx < demos.length) out.push(demos[demoIdx++]);
  return out;
}

/**
 * Audite une liste mêlant annonces réelles et démos (déjà mélangée par
 * `interleaveDemos` ou un autre processus) et retourne :
 *  - les positions (1-indexées) où des démos sont attendues selon la règle
 *    « 1 démo toutes les 3 vraies annonces, surplus à la fin »,
 *  - les positions effectivement observées,
 *  - les écarts (manquantes / hors-règle) et le booléen `ok`.
 *
 * Sert au mode test démos pour signaler visuellement toute violation
 * causée par un filtre, un tri ou une pagination appliqué après l'intercalation.
 */
export function auditInterleave(
  list: ReadonlyArray<{ is_demo?: boolean }>,
  step = 3,
): {
  ok: boolean;
  expectedPositions: number[];
  observedPositions: number[];
  missingPositions: number[];
  unexpectedPositions: number[];
} {
  const observedPositions = list
    .map((it, i) => (it?.is_demo ? i + 1 : -1))
    .filter((p) => p !== -1);
  const realCount = list.length - observedPositions.length;
  const demoCount = observedPositions.length;

  const slotsByRule = realCount >= step ? Math.floor(realCount / step) : 0;
  const interleavedExpectedCount = Math.min(slotsByRule, demoCount);

  const expectedInterleavedPositions: number[] = [];
  for (let k = 1; k <= interleavedExpectedCount; k++) {
    // Position dans la liste finale = k réelles intercalées (step·k réelles + k démos déjà insérées)
    expectedInterleavedPositions.push((step + 1) * k);
  }
  const trailingDemosCount = Math.max(0, demoCount - interleavedExpectedCount);
  const expectedTrailingPositions: number[] = [];
  for (let k = 0; k < trailingDemosCount; k++) {
    expectedTrailingPositions.push(list.length - trailingDemosCount + 1 + k);
  }
  const expectedPositions = [
    ...expectedInterleavedPositions,
    ...expectedTrailingPositions,
  ];

  const missingPositions = expectedPositions.filter((p) => !observedPositions.includes(p));
  const unexpectedPositions = observedPositions.filter((p) => !expectedPositions.includes(p));

  return {
    ok: missingPositions.length === 0 && unexpectedPositions.length === 0,
    expectedPositions,
    observedPositions,
    missingPositions,
    unexpectedPositions,
  };
}
