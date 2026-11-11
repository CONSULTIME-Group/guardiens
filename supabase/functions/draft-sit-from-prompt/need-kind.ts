// Lot ANN1 (11/11/2026) : Alma trie le besoin avant de rédiger.
//
// Une annonce de garde = le gardien s'installe au domicile du propriétaire
// pendant son absence. Un service ponctuel autour d'un animal ou de la maison
// (ramener, promener, passer nourrir, pension chez l'aidant, trajet) est un
// coup de main et se publie dans l'Entraide (règle de Jérémie du 11/10/2026).

export const NEED_KINDS = ["garde", "coup_de_main", "incertain"] as const;
export type NeedKind = (typeof NEED_KINDS)[number];

/** Consigne ajoutée au prompt système de draft-sit-from-prompt. */
export const NEED_KIND_RULE = `TRI DU BESOIN (champ need_kind, à remplir en premier) :
- "garde" : le propriétaire s'absente et une personne s'installe chez lui (elle dort sur place) pour veiller sur ses animaux ou sa maison.
- "coup_de_main" : un service ponctuel, sans personne installée au domicile : ramener ou conduire un animal, une promenade, un passage pour nourrir ou arroser, une pension chez l'aidant, un trajet, des courses, un moment de jardinage.
- "incertain" : la phrase ne permet pas de savoir si une personne s'installe au domicile.
Si need_kind vaut "coup_de_main" ou "incertain", laissez tous les autres champs vides.`;

/** Consigne quand le propriétaire a confirmé une garde à son domicile. */
export const CONFIRMED_HOME_RULE = `Le propriétaire a confirmé qu'il s'agit d'une garde à son domicile : need_kind vaut "garde".`;

/**
 * Décision finale. Une garde confirmée par le propriétaire l'emporte ; une
 * valeur absente ou inconnue du modèle vaut « garde », comportement d'avant
 * le lot (aucun brouillon perdu sur une réponse mal formée).
 */
export function resolveNeedKind(raw: unknown, confirmedHome: boolean): NeedKind {
  if (confirmedHome) return "garde";
  const v = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  return (NEED_KINDS as readonly string[]).includes(v) ? (v as NeedKind) : "garde";
}

/** Champs rédigés exigés pour écrire un brouillon de garde. */
export function hasSitDraftFields(parsed: Record<string, unknown> | null | undefined): boolean {
  if (!parsed) return false;
  const long = (v: unknown, min: number) => typeof v === "string" && v.trim().length >= min;
  return long(parsed.title, 8) && long(parsed.specific_expectations, 40) && long(parsed.daily_routine, 40) && long(parsed.owner_message, 40);
}
