/**
 * Barème client, ALIGNÉ mot pour mot sur la fonction SQL
 * `public.calculate_profile_completion` (voir migrations).
 *
 * Sert deux besoins :
 *  1. Pédagogie (liste des items manquants avec leurs points).
 *  2. Fixation du barème via test Vitest, pour éviter tout drift silencieux
 *     entre le serveur (source de vérité) et l'UI.
 *
 * Règle d'or : si le SQL change, ce fichier ET le test associé changent.
 */

export type ProfileRole = "owner" | "sitter";

export interface ProfileCompletionInput {
  role: ProfileRole;
  first_name?: string | null;
  postal_code?: string | null;
  city?: string | null;
  country?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  identity_verified?: boolean | null;

  // Sitter
  competences?: string[] | null;
  lifestyle?: string[] | null;
  geographic_radius?: number | null;
  has_sitter_gallery?: boolean;
  interests?: string[] | null;
  languages?: string[] | null;
  life_pace?: string | null;
  animal_types?: string[] | null;

  // Owner
  owner_competences?: string[] | null;
  has_pet?: boolean;
  property_description?: string | null;
  has_owner_gallery?: boolean;
  home_ambiance?: string[] | null;
  preferred_sitter_types?: string[] | null;
}

export interface CompletionItem {
  key: string;
  label: string;
  points: number;
  ok: boolean;
  hint?: string;
}

export interface CompletionResult {
  score: number;
  items: CompletionItem[];
  missing: CompletionItem[];
}

const affinityPoints = (count: number): number =>
  count >= 3 ? 10 : count === 2 ? 6 : count === 1 ? 3 : 0;

function locationOk(d: ProfileCompletionInput): boolean {
  const isFR = (d.country || "FR") === "FR";
  return (
    !!d.first_name &&
    (isFR ? !!d.postal_code : !!d.city)
  );
}

/** Barème Gardien : total = 100. */
export function computeSitterCompletion(d: ProfileCompletionInput): CompletionResult {
  const affinityChecks = [
    (d.interests?.length ?? 0) >= 3,
    (d.languages?.length ?? 0) > 0,
    !!d.life_pace,
    (d.animal_types?.length ?? 0) > 0,
  ];
  const affinityCount = affinityChecks.filter(Boolean).length;
  const affinityOk = affinityCount >= 3;

  const items: CompletionItem[] = [
    { key: "location", label: "Nom et localisation", points: 15, ok: locationOk(d) },
    { key: "avatar", label: "Photo de profil", points: 15, ok: !!d.avatar_url },
    { key: "bio", label: "Bio d'au moins 50 caractères", points: 10, ok: (d.bio?.length ?? 0) >= 50 },
    { key: "competences", label: "Compétences", points: 15, ok: (d.competences?.length ?? 0) > 0 },
    { key: "lifestyle", label: "Style de vie", points: 10, ok: (d.lifestyle?.length ?? 0) > 0 },
    { key: "radius", label: "Rayon de mobilité", points: 15, ok: (d.geographic_radius ?? 0) > 0 },
    { key: "gallery", label: "Une photo de galerie", points: 5, ok: !!d.has_sitter_gallery },
    { key: "identity", label: "Vérification d'identité", points: 5, ok: !!d.identity_verified, hint: "Traitée par notre équipe après envoi de vos documents." },
    { key: "affinity", label: "Profil d'affinité (au moins 3 signaux)", points: 10, ok: affinityOk, hint: `Complété à ${affinityCount}/4.` },
  ];
  const baseScore = items.reduce((s, i) => s + (i.ok ? i.points : 0), 0);
  // Parité SQL : affinity partiel donne 3/6 points même sous le seuil.
  const partialAffinity = affinityOk ? 0 : affinityPoints(affinityCount);
  const score = Math.min(100, baseScore - (items.find(i => i.key === "affinity")!.ok ? 10 : 0) + (affinityOk ? 10 : partialAffinity));
  return { score, items, missing: items.filter(i => !i.ok) };
}

/** Barème Propriétaire : total = 100. */
export function computeOwnerCompletion(d: ProfileCompletionInput): CompletionResult {
  const affinityChecks = [
    (d.interests?.length ?? 0) >= 3,
    (d.languages?.length ?? 0) > 0,
    !!d.life_pace,
    (d.home_ambiance?.length ?? 0) > 0,
    (d.preferred_sitter_types?.length ?? 0) > 0,
  ];
  const affinityCount = affinityChecks.filter(Boolean).length;
  const affinityOk = affinityCount >= 3;

  const items: CompletionItem[] = [
    { key: "location", label: "Nom et localisation", points: 10, ok: locationOk(d) },
    { key: "avatar", label: "Photo de profil", points: 10, ok: !!d.avatar_url },
    { key: "bio", label: "Bio d'au moins 50 caractères", points: 10, ok: (d.bio?.length ?? 0) >= 50 },
    { key: "owner_competences", label: "Compétences propriétaire", points: 10, ok: (d.owner_competences?.length ?? 0) > 0 },
    { key: "pet", label: "Au moins un animal renseigné", points: 20, ok: !!d.has_pet },
    { key: "property_desc", label: "Description du logement (>= 50 caractères)", points: 10, ok: (d.property_description?.length ?? 0) >= 50 },
    { key: "gallery", label: "Une photo de galerie", points: 15, ok: !!d.has_owner_gallery },
    { key: "identity", label: "Vérification d'identité", points: 5, ok: !!d.identity_verified, hint: "Traitée par notre équipe après envoi de vos documents." },
    { key: "affinity", label: "Profil d'affinité (au moins 3 signaux)", points: 10, ok: affinityOk, hint: `Complété à ${affinityCount}/5.` },
  ];
  const baseScore = items.reduce((s, i) => s + (i.ok ? i.points : 0), 0);
  const partialAffinity = affinityOk ? 0 : affinityPoints(affinityCount);
  const score = Math.min(100, baseScore - (items.find(i => i.key === "affinity")!.ok ? 10 : 0) + (affinityOk ? 10 : partialAffinity));
  return { score, items, missing: items.filter(i => !i.ok) };
}

/**
 * Comptes 'both' : parité avec la migration qui prend le MAX des deux branches.
 */
export function computeProfileCompletion(
  role: ProfileRole | "both",
  d: ProfileCompletionInput,
): CompletionResult {
  if (role === "owner") return computeOwnerCompletion(d);
  if (role === "sitter") return computeSitterCompletion(d);
  const a = computeOwnerCompletion({ ...d, role: "owner" });
  const b = computeSitterCompletion({ ...d, role: "sitter" });
  return a.score >= b.score ? a : b;
}

/** Sommes maximales par rôle, fixées pour éviter tout drift silencieux. */
export const BAREME_MAX = {
  sitter: 100,
  owner: 100,
} as const;
