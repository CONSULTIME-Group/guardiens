/**
 * Lot 0 : écritures de l'écran d'affinité obligatoire.
 *
 * Seules les colonnes affichées à l'écran ET renseignées sont envoyées :
 * un tableau vide ou une chaîne vide ne remplace jamais une valeur en base.
 */
type Role = "owner" | "sitter" | "both";

export interface AffinityWriteInput {
  userId: string;
  currentRole: Role | null;
  chosenRole: Role;
  needsPostal: boolean;
  postalCode: string;
  departementCode: string | null;
  showSitterBlock: boolean;
  showOwnerBlock: boolean;
  animalTypes: string[];
  workDuringSit: string;
  sitterType: string;
  presenceExpected: string;
  preferredSitterTypes: string[];
  homeAmbiance: string[];
  lifePace: string;
  interests: string[];
  languages: string[];
  /** Lot 2 (G2) : véhicule déclaré, facultatif ; null ou absent = non répondu, rien n'est écrit. */
  hasVehicle?: boolean | null;
}

type Row = Record<string, unknown>;

function filled(row: Row, values: Row): Row {
  for (const [k, v] of Object.entries(values)) {
    if (Array.isArray(v) ? v.length > 0 : typeof v === "string" ? v.trim() !== "" : v != null) row[k] = v;
  }
  return row;
}

export function buildAffinityWrites(i: AffinityWriteInput): { profile: Row | null; sitter: Row | null; owner: Row | null } {
  const profile: Row = {};
  if (i.currentRole !== i.chosenRole) profile.role = i.chosenRole;
  if (i.needsPostal && i.postalCode.trim()) {
    profile.postal_code = i.postalCode.trim();
    if (i.departementCode) profile.departement_code = i.departementCode;
  }
  const shared = { life_pace: i.lifePace, interests: i.interests, languages: i.languages };
  const sitter = i.showSitterBlock
    ? filled({ user_id: i.userId }, {
        animal_types: i.animalTypes,
        work_during_sit: i.workDuringSit,
        sitter_type: i.sitterType,
        has_vehicle: i.hasVehicle ?? null,
        ...shared,
      })
    : null;
  const owner = i.showOwnerBlock
    ? filled({ user_id: i.userId }, {
        presence_expected: i.presenceExpected,
        preferred_sitter_types: i.preferredSitterTypes,
        home_ambiance: i.homeAmbiance,
        ...shared,
      })
    : null;
  return { profile: Object.keys(profile).length ? profile : null, sitter, owner };
}
