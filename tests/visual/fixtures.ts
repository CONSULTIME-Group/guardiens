/**
 * Fixtures partagées pour les tests visuels de /sits/:id.
 *
 * Chaque scénario décrit un sit complet (sit + owner + property + pets + reviews +
 * applications + sitter context) ainsi que l'identité du visiteur (owner ou sitter).
 *
 * Les IDs sont stables et choisis pour être lisibles dans les logs de test.
 */

export type ScenarioId =
  | "draft-owner"
  | "published-owner"
  | "published-sitter"
  | "published-sitter-with-photos"
  | "cancelled-sitter"
  | "completed-sitter";

export interface Scenario {
  id: ScenarioId;
  /** Sit ID utilisé dans l'URL /sits/:id */
  sitId: string;
  /** Profil retourné par useAuth() — détermine si on est owner ou sitter */
  viewer: {
    id: string;
    email: string;
    role: "owner" | "sitter" | "both";
    firstName: string;
    lastName: string;
  };
  /** activeRole pour useAuth() */
  activeRole: "owner" | "sitter";
  /** Données injectées dans le mock client.from() */
  data: {
    sit: any;
    owner: any;
    ownerProfile: any;
    property: any;
    pets: any[];
    reviews: any[];
    applications: any[];
  };
}

const OWNER_ID = "00000000-0000-0000-0000-000000000001";
const SITTER_ID = "00000000-0000-0000-0000-000000000002";
const PROPERTY_ID = "00000000-0000-0000-0000-000000000010";

const baseOwner = {
  id: OWNER_ID,
  first_name: "Camille",
  last_name: "Martin",
  avatar_url: null,
  city: "Annecy",
  postal_code: "74000",
  bio: "Maman de deux chats persans, je voyage régulièrement pour le travail.",
  role: "owner",
  identity_verified: true,
  is_founder: true,
  reputation_status: "Confirmé",
  trust_score: 78,
  member_since: "2025-01-15",
};

const baseOwnerProfile = {
  user_id: OWNER_ID,
  logement_description: "Appartement T3 lumineux avec balcon vue lac.",
  expectations: "Présence quotidienne, jeux et caresses, photos régulières.",
};

const baseProperty = {
  id: PROPERTY_ID,
  user_id: OWNER_ID,
  // Schéma réel : enum property_type, enum property_environment
  type: "apartment",
  environment: "city_center",
  rooms_count: 3,
  bedrooms_count: 2,
  car_required: false,
  accessible: true,
  description: "Appartement T3 lumineux avec balcon vue lac.",
  region_highlights: "Quartier calme, à 10 min à pied du lac d'Annecy.",
  equipments: ["wifi", "washing_machine", "dishwasher"],
  photos: [],
};

const basePets = [
  {
    id: "pet-1",
    property_id: PROPERTY_ID,
    name: "Mochi",
    species: "cat",
    age: 4,
    breed: "Persan",
    character: "Très calme, aime les caresses derrière les oreilles.",
    photo_url: null,
    walk_duration: "none",
    alone_duration: "long",
    medication: null,
    activity_level: "low",
  },
  {
    id: "pet-2",
    property_id: PROPERTY_ID,
    name: "Soba",
    species: "cat",
    age: 6,
    breed: "Persan",
    character: "Plus indépendant, adore les fenêtres ensoleillées.",
    photo_url: null,
    walk_duration: "none",
    alone_duration: "long",
    medication: null,
    activity_level: "medium",
  },
];

const baseReviews = [
  {
    id: "review-1",
    sit_id: "n/a",
    reviewer_id: SITTER_ID,
    reviewee_id: OWNER_ID,
    // Schéma réel : `overall_rating` (int 1-5), pas `rating`
    overall_rating: 5,
    comment: "Super accueil, animaux adorables, à recommander !",
    created_at: "2025-08-12T10:00:00Z",
    published: true,
    review_type: "garde",
    moderation_status: "approved",
    reviewer: { first_name: "Lou", avatar_url: null },
  },
];

function makeSit(overrides: Partial<any>): any {
  return {
    id: overrides.id,
    user_id: OWNER_ID,
    property_id: PROPERTY_ID,
    title: "Garde de mes deux chats persans",
    start_date: "2026-05-10",
    end_date: "2026-05-20",
    flexible_dates: false,
    specific_expectations: "Brossage quotidien apprécié.",
    open_to: ["pet_sitting"],
    max_applications: 5,
    accepting_applications: true,
    logement_override: null,
    animaux_override: null,
    created_at: "2026-04-01T08:00:00Z",
    ...overrides,
  };
}

export const SCENARIOS: Record<ScenarioId, Scenario> = {
  "draft-owner": {
    id: "draft-owner",
    sitId: "11111111-1111-1111-1111-111111111111",
    viewer: {
      id: OWNER_ID,
      email: "camille@test.local",
      role: "owner",
      firstName: "Camille",
      lastName: "Martin",
    },
    activeRole: "owner",
    data: {
      sit: makeSit({
        id: "11111111-1111-1111-1111-111111111111",
        status: "draft",
      }),
      owner: baseOwner,
      ownerProfile: baseOwnerProfile,
      property: baseProperty,
      pets: basePets,
      reviews: baseReviews,
      applications: [],
    },
  },
  "published-owner": {
    id: "published-owner",
    sitId: "22222222-2222-2222-2222-222222222222",
    viewer: {
      id: OWNER_ID,
      email: "camille@test.local",
      role: "owner",
      firstName: "Camille",
      lastName: "Martin",
    },
    activeRole: "owner",
    data: {
      sit: makeSit({
        id: "22222222-2222-2222-2222-222222222222",
        status: "published",
      }),
      owner: baseOwner,
      ownerProfile: baseOwnerProfile,
      property: baseProperty,
      pets: basePets,
      reviews: baseReviews,
      applications: [
        {
          id: "app-1",
          sit_id: "22222222-2222-2222-2222-222222222222",
          sitter_id: SITTER_ID,
          status: "pending",
          created_at: "2026-04-15T10:00:00Z",
        },
        {
          id: "app-2",
          sit_id: "22222222-2222-2222-2222-222222222222",
          sitter_id: "00000000-0000-0000-0000-000000000003",
          status: "viewed",
          created_at: "2026-04-16T09:00:00Z",
        },
      ],
    },
  },
  "published-sitter": {
    id: "published-sitter",
    sitId: "55555555-5555-5555-5555-555555555555",
    viewer: {
      id: SITTER_ID,
      email: "lou@test.local",
      role: "sitter",
      firstName: "Lou",
      lastName: "Petit",
    },
    activeRole: "sitter",
    data: {
      sit: makeSit({
        id: "55555555-5555-5555-5555-555555555555",
        status: "published",
      }),
      owner: baseOwner,
      ownerProfile: baseOwnerProfile,
      property: baseProperty,
      pets: basePets,
      reviews: baseReviews,
      applications: [],
    },
  },
  "cancelled-sitter": {
    id: "cancelled-sitter",
    sitId: "33333333-3333-3333-3333-333333333333",
    viewer: {
      id: SITTER_ID,
      email: "lou@test.local",
      role: "sitter",
      firstName: "Lou",
      lastName: "Petit",
    },
    activeRole: "sitter",
    data: {
      sit: makeSit({
        id: "33333333-3333-3333-3333-333333333333",
        status: "cancelled",
      }),
      owner: baseOwner,
      ownerProfile: baseOwnerProfile,
      property: baseProperty,
      pets: basePets,
      reviews: baseReviews,
      applications: [],
    },
  },
  "completed-sitter": {
    id: "completed-sitter",
    sitId: "44444444-4444-4444-4444-444444444444",
    viewer: {
      id: SITTER_ID,
      email: "lou@test.local",
      role: "sitter",
      firstName: "Lou",
      lastName: "Petit",
    },
    activeRole: "sitter",
    data: {
      sit: makeSit({
        id: "44444444-4444-4444-4444-444444444444",
        status: "completed",
        start_date: "2026-02-10",
        end_date: "2026-02-20",
        accepting_applications: false,
      }),
      owner: baseOwner,
      ownerProfile: baseOwnerProfile,
      property: baseProperty,
      pets: basePets,
      reviews: baseReviews,
      applications: [
        {
          id: "app-4",
          sit_id: "44444444-4444-4444-4444-444444444444",
          sitter_id: SITTER_ID,
          status: "accepted",
          created_at: "2026-02-01T10:00:00Z",
        },
      ],
    },
  },
};

/**
 * Récupère le scénario depuis l'URL search param `?scenario=...`.
 * Renvoie null si non trouvé — le mock client se comportera comme un client vide.
 */
export function getScenarioFromUrl(): Scenario | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const id = params.get("scenario") as ScenarioId | null;
  if (!id) return null;
  return SCENARIOS[id] ?? null;
}
