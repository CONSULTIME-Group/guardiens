// Modération champ par champ du formulaire d'annonce.
//
// La concaténation de tous les textes avant l'appel de modération rendait le
// refus illisible : le propriétaire savait que quelque chose bloquait, jamais
// où. Ici, chaque champ est évalué séparément, ce qui permet d'afficher
// l'erreur sous le champ concerné et d'y amener directement.

import { moderateContent, type ModerationVerdict } from "@/lib/moderation";

export type ModeratedFieldKey =
  | "title"
  | "absenceReason"
  | "sitterExpectations"
  | "dailyRoutine"
  | "ownerMessage"
  | "flexibleNotes";

export interface ModeratedFieldMeta {
  label: string;
  anchor: string;
  step: number;
}

export const MODERATED_FIELDS: Record<ModeratedFieldKey, ModeratedFieldMeta> = {
  title: { label: "Titre de l'annonce", anchor: "title-field", step: 0 },
  absenceReason: {
    label: "Pourquoi vous avez besoin d'un gardien",
    anchor: "absence-reason-field",
    step: 0,
  },
  sitterExpectations: {
    label: "Ce que vous attendez du gardien",
    anchor: "expectations-field",
    step: 0,
  },
  dailyRoutine: { label: "Une journée type", anchor: "daily-routine-field", step: 0 },
  ownerMessage: { label: "Un mot de vous", anchor: "owner-message-field", step: 0 },
  flexibleNotes: {
    label: "Précisions sur vos dates flexibles",
    anchor: "flexible-notes-field",
    step: 1,
  },
};

export type FieldVerdicts = Partial<Record<ModeratedFieldKey, ModerationVerdict>>;

export interface SitFieldModerationResult {
  verdicts: FieldVerdicts;
  blocked: ModeratedFieldKey[];
  warned: ModeratedFieldKey[];
}

/**
 * Évalue en parallèle chaque champ non vide. Un champ vide n'est jamais envoyé
 * à la modération, cela évite un appel inutile et un verdict sans objet.
 */
export async function moderateSitFields(
  values: Partial<Record<ModeratedFieldKey, string | null | undefined>>,
): Promise<SitFieldModerationResult> {
  const entries = (Object.keys(MODERATED_FIELDS) as ModeratedFieldKey[])
    .map((key) => [key, (values[key] ?? "").trim()] as const)
    .filter(([, text]) => text.length > 0);

  const results = await Promise.all(
    entries.map(async ([key, text]) => [key, await moderateContent("sit", text)] as const),
  );

  const verdicts: FieldVerdicts = {};
  const blocked: ModeratedFieldKey[] = [];
  const warned: ModeratedFieldKey[] = [];
  results.forEach(([key, verdict]) => {
    verdicts[key] = verdict;
    if (verdict.status === "block") blocked.push(key);
    else if (verdict.status === "warning") warned.push(key);
  });

  return { verdicts, blocked, warned };
}

/** Phrase affichée sous le champ refusé, factuelle et jamais culpabilisante. */
export function describeFieldRefusal(verdict: ModerationVerdict | undefined): string {
  const reasons = (verdict?.reasons ?? []).filter(Boolean);
  if (reasons.length > 0) return reasons.join(" · ");
  return "Ce passage ne peut pas être publié tel quel, retirez les coordonnées ou reformulez.";
}
