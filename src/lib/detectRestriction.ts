/**
 * Détecte, dans un texte libre saisi par le propriétaire (owner_message ou
 * specific_expectations), des restrictions courantes concernant les
 * accompagnants du gardien (animaux ou enfants).
 *
 * Sert de repli tant que les propriétaires n'ont pas renseigné les nouveaux
 * champs structurés `sits.accepts_sitter_pets` / `sits.accepts_sitter_children`
 * (défaut 'discuss'). Retourne true dès qu'un mot-clé restrictif est repéré.
 */

const PET_PATTERNS: RegExp[] = [
  /\bpas\s+d[e']?\s*animal/i,
  /\bpas\s+d[e']?\s*animaux/i,
  /\bsans\s+animal/i,
  /\bsans\s+animaux/i,
  /\bsans\s+chien/i,
  /\bsans\s+chat/i,
  /\bpas\s+d[e']?\s*chien/i,
  /\bpas\s+d[e']?\s*chat/i,
  /\bseul(?:\.e|e|s)?\b/i,
];

const CHILDREN_PATTERNS: RegExp[] = [
  /\bpas\s+d[e']?\s*enfant/i,
  /\bpas\s+d[e']?\s*enfants/i,
  /\bsans\s+enfant/i,
  /\bsans\s+enfants/i,
];

export function detectRestrictionInText(
  text: string | null | undefined,
  kind: "pets" | "children",
): boolean {
  if (!text) return false;
  const patterns = kind === "pets" ? PET_PATTERNS : CHILDREN_PATTERNS;
  return patterns.some((re) => re.test(text));
}
