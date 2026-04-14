export interface Pet {
  id: string;
  name: string;
  species: string;
  breed: string | null;
  age: number | null;
  photo_url: string | null;
  property_id: string;
}

export interface SitRow {
  id: string;
  title: string;
  status: string;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  property_id: string;
  user_id: string;
  cancelled_by: string | null;
  applications: { id: string; status: string; sitter_id: string }[];
}

export interface SitterInfo {
  id: string;
  first_name: string | null;
  avatar_url: string | null;
  identity_verified: boolean;
  completed_sits_count: number;
  avgNote?: number;
}

export interface AppRow {
  id: string;
  status: string;
  sitter_id: string;
  sit_id: string;
  created_at: string;
  sitter: SitterInfo | null;
  sit: { title: string; start_date: string | null; end_date: string | null } | null;
}

export interface SmallMission {
  id: string;
  title: string;
  category: string;
  status?: string;
  city: string | null;
  created_at: string;
  small_mission_responses?: { id: string; status: string }[];
}

export interface HighlightRow {
  id: string;
  text: string;
  photo_url: string | null;
  sitter: { first_name: string | null; avatar_url: string | null } | null;
}

export interface OnboardingChecks {
  hasName: boolean;
  hasAvatar: boolean;
  hasBio: boolean;
  hasIdentity: boolean;
  hasProperty: boolean;
  hasPets: boolean;
  hasSit: boolean;
}
