/**
 * Lot ALMA2c (10/11/2026) : contrôle de refus adapté aux longueurs d'un besoin.
 * Le seuil par défaut d'isLlmRefusal (60 caractères) rejetait tout titre court,
 * donc chaque brouillon. Titre : 8 caractères minimum ; description : 40.
 */
import { isLlmRefusal } from "../_shared/refusal-guard.ts";

export const TITLE_MIN = 8;
export const DESCRIPTION_MIN = 40;

export function isRefusedMissionDraft(title: string, description: string): boolean {
  return isLlmRefusal(title, TITLE_MIN) || isLlmRefusal(description, DESCRIPTION_MIN);
}
