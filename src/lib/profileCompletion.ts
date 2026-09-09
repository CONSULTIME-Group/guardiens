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
  /** Nombre réel de photos de galerie gardien. Prime sur has_sitter_gallery. */
  sitter_gallery_count?: number;
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
  /**
   * Lien profond vers la section du formulaire qui porte ce critère.
   * Conventions distinctes selon l'espace :
   *  - propriétaire : /owner-profile?section=<id brut de SECTIONS_BASE>
   *  - gardien : /profile?section=<clé française de SECTION_PARAM_MAP>
   */
  href: string;
}

export interface CompletionResult {
  score: number;
  items: CompletionItem[];
  missing: CompletionItem[];
}

/** Item manquant qui rapporte le plus de points, pour cibler un CTA. */
export function topMissingItem(result: CompletionResult): CompletionItem | null {
  return [...result.missing].sort((a, b) => b.points - a.points)[0] ?? null;
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

  // Galerie : le barème distingue « au moins une photo » (4 pts) de
  // « galerie fournie » (3 photos ou plus, 10 pts). Parité SQL.
  const galleryCount = d.sitter_gallery_count ?? (d.has_sitter_gallery ? 1 : 0);
  const galleryPoints = galleryCount >= 3 ? 10 : galleryCount >= 1 ? 4 : 0;
  const galleryOk = galleryCount >= 3;

  // Le rayon d'intervention ne rapporte plus de points depuis le barème du
  // 30/08/2026. Le champ reste utilisé par la recherche et l'entraide.
  const items: CompletionItem[] = [
    { key: "location", label: "Nom et localisation", points: 15, ok: locationOk(d), href: "/profile?section=identite" },
    { key: "avatar", label: "Photo de profil", points: 20, ok: !!d.avatar_url, href: "/profile?section=identite" },
    { key: "bio", label: "Bio d'au moins 50 caractères", points: 15, ok: (d.bio?.length ?? 0) >= 50, href: "/profile?section=identite" },
    { key: "competences", label: "Compétences", points: 15, ok: (d.competences?.length ?? 0) > 0, href: "/profile?section=competences" },
    { key: "lifestyle", label: "Style de vie", points: 10, ok: (d.lifestyle?.length ?? 0) > 0, href: "/profile?section=profil" },
    { key: "gallery", label: "Galerie de 3 photos ou plus", points: 10, ok: galleryOk, hint: galleryCount > 0 && !galleryOk ? `${galleryCount} photo${galleryCount > 1 ? "s" : ""} pour l'instant.` : undefined, href: "/profile?section=galerie" },
    { key: "identity", label: "Vérification d'identité", points: 5, ok: !!d.identity_verified, hint: "Traitée par notre équipe après envoi de vos documents.", href: "/profile?section=identite" },
    { key: "affinity", label: "Profil d'affinité (au moins 3 signaux)", points: 10, ok: affinityOk, hint: `Complété à ${affinityCount}/4.`, href: "/profile?section=profil" },
  ];

  const baseScore = items.reduce((s, i) => s + (i.ok ? i.points : 0), 0);
  // Parité SQL : affinity partiel donne 3/6 points même sous le seuil,
  // galerie partielle donne 4 points dès la première photo.
  const partialAffinity = affinityOk ? 0 : affinityPoints(affinityCount);
  const score = Math.min(
    100,
    baseScore
      - (affinityOk ? 10 : 0) + (affinityOk ? 10 : partialAffinity)
      + (galleryOk ? 0 : galleryPoints),
  );

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
    { key: "location", label: "Nom et localisation", points: 10, ok: locationOk(d), href: "/owner-profile?section=identity" },
    { key: "avatar", label: "Photo de profil", points: 10, ok: !!d.avatar_url, href: "/owner-profile?section=identity" },
    { key: "bio", label: "Bio d'au moins 50 caractères", points: 10, ok: (d.bio?.length ?? 0) >= 50, href: "/owner-profile?section=identity" },
    { key: "owner_competences", label: "Compétences propriétaire", points: 10, ok: (d.owner_competences?.length ?? 0) > 0, href: "/owner-profile?section=skills" },
    { key: "pet", label: "Au moins un animal renseigné", points: 20, ok: !!d.has_pet, href: "/owner-profile?section=animals" },
    { key: "property_desc", label: "Description du logement (>= 50 caractères)", points: 10, ok: (d.property_description?.length ?? 0) >= 50, href: "/owner-profile?section=housing" },
    { key: "gallery", label: "Une photo de galerie", points: 15, ok: !!d.has_owner_gallery, href: "/owner-profile?section=gallery" },
    { key: "identity", label: "Vérification d'identité", points: 5, ok: !!d.identity_verified, hint: "Traitée par notre équipe après envoi de vos documents.", href: "/owner-profile?section=identity" },
    { key: "affinity", label: "Profil d'affinité (au moins 3 signaux)", points: 10, ok: affinityOk, hint: `Complété à ${affinityCount}/5.`, href: "/owner-profile?section=rules" },
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
