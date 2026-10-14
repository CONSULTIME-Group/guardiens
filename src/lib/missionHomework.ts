/**
 * Lot J2d (14/10/2026) : aide aux devoirs, conditions de l'article 7.4 des
 * CGU (version 9, en vigueur le 16/11/2026).
 *
 * Sur le modèle de src/lib/missionChildCare.ts : détection volontairement
 * étroite (aide aux devoirs, soutien ou accompagnement scolaire), qui affiche
 * un encadré d'information dans le formulaire de besoin, sans bloquer la
 * publication. La garde d'un mineur reste refusée par isChildCareRequest.
 */
const PATTERNS: RegExp[] = [
  /\baides?\s+aux?\s+devoirs?\b/i,
  /\b(?:soutien|accompagnement|aide)\s+scolaires?\b/i,
  /\b(?:faire|réviser|reviser|revoir)\s+(?:ses|les|mes|leurs|nos)\s+devoirs\b/i,
];

export function isHomeworkHelpRequest(title: string, description = ""): boolean {
  const text = `${title}\n${description}`;
  return PATTERNS.some((p) => p.test(text));
}

/** Savoir-faire concerné : « Aide aux devoirs », « Soutien scolaire en maths »… */
export function isHomeworkSkill(label: string | null | undefined): boolean {
  return /\bdevoirs?\b|\b(?:soutien|accompagnement|aide)\s+scolaires?\b/i.test(String(label ?? ""));
}

export const HOMEWORK_CONDITIONS_TITLE = "Aide aux devoirs : les conditions";

/** CGU 7.4, en quatre puces courtes. */
export const HOMEWORK_CONDITIONS: readonly string[] = [
  "Vous publiez ce besoin en tant que parent ou représentant légal de l'enfant, et vous restez le seul interlocuteur de la personne qui aide.",
  "Vous, ou un autre adulte du foyer, êtes présent pendant toute la séance : chez vous, dans un lieu ouvert au public ou à distance depuis votre logement.",
  "Les échanges avec l'enfant ont lieu pendant les séances, et ses coordonnées restent dans votre foyer.",
  "Indiquez dans votre besoin la classe et la matière. Le prénom, la photo, l'école et l'adresse de l'enfant restent hors de Guardiens.",
];

export const HOMEWORK_CONDITIONS_SOURCE = "Conditions d'utilisation, article 7.4";

/** Mention courte là où le savoir-faire « Aide aux devoirs » est choisi. */
export const HOMEWORK_SKILL_NOTE =
  "Aide aux devoirs : chaque séance se déroule en présence d'un parent ou d'un adulte du foyer de l'enfant, qui reste votre interlocuteur (conditions d'utilisation, article 7.4).";
