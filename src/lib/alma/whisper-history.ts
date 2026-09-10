/**
 * Journalisation d'un whisper Alma dans `alma_whisper_history`.
 *
 * Cause du défaut corrigé : seuls les whispers proactifs créaient une ligne,
 * et la clôture visait la ligne par `whisper_type`. Les whispers demandés
 * par la personne (conseil, fait culturel, repli) n'avaient donc aucune
 * ligne à mettre à jour, et `action_taken` restait vide.
 *
 * Désormais chaque whisper affiché crée sa ligne, son identifiant est
 * mémorisé, et la clôture met à jour exactement cette ligne.
 */
import type { AlmaDismissReason, AlmaWhisper } from "@/lib/alma/whisper-types";

export interface WhisperHistoryInsert {
  user_id: string;
  whisper_type: string;
  surface: string;
  session_id: string;
  metadata: Record<string, unknown> | null;
}

export function buildHistoryInsert(args: {
  userId: string;
  whisper: Pick<AlmaWhisper, "type" | "surface" | "metadata">;
  sessionId: string;
}): WhisperHistoryInsert {
  return {
    user_id: args.userId,
    whisper_type: args.whisper.type,
    surface: args.whisper.surface,
    session_id: args.sessionId,
    metadata: (args.whisper.metadata as Record<string, unknown> | undefined) ?? null,
  };
}

export interface WhisperHistoryPatch {
  dismissed_reason: AlmaDismissReason;
  action_taken?: string;
}

/**
 * `action_taken` est renseigné pour tout clic volontaire sur une action,
 * y compris quand l'identifiant d'action arrive sans motif explicite.
 */
export function buildHistoryPatch(
  reason: AlmaDismissReason,
  actionId?: string,
): WhisperHistoryPatch {
  const patch: WhisperHistoryPatch = { dismissed_reason: reason };
  if (actionId) patch.action_taken = actionId;
  return patch;
}
