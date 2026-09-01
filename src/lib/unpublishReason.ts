/**
 * Libellé unique du motif de dépublication d'une annonce de garde.
 *
 * La colonne sits.last_unpublished_reason contient soit l'un des codes
 * ci-dessous, soit du texte libre saisi par le propriétaire (choix « autre »).
 * Source unique, à réutiliser partout, ne pas dupliquer.
 */

export const UNPUBLISH_REASON_LABELS: Record<string, string> = {
  found_offline: "vous aviez trouvé une solution hors plateforme",
  found_onplatform: "vous aviez trouvé un gardien via Guardiens",
  plans_changed: "vos dates ou vos plans avaient changé",
  no_relevant_apps: "vous n'aviez pas reçu de candidature adaptée",
  other: "autre raison",
};

/** Libellé neutre, pour l'admin, à la troisième personne. */
export const UNPUBLISH_REASON_ADMIN_LABELS: Record<string, string> = {
  found_offline: "Solution trouvée hors plateforme",
  found_onplatform: "Gardien trouvé via Guardiens",
  plans_changed: "Dates ou plans changés",
  no_relevant_apps: "Aucune candidature adaptée",
  other: "Autre raison",
};

const MAX_FREE_TEXT = 120;

const quoteFreeText = (value: string): string => {
  const clean = value.trim();
  const truncated = clean.length > MAX_FREE_TEXT ? `${clean.slice(0, MAX_FREE_TEXT)}…` : clean;
  return `« ${truncated} »`;
};

/**
 * Phrase adressée au propriétaire, à insérer après « Dépubliée le 25 août, ».
 * Retourne null si aucun motif n'est enregistré.
 */
export const unpublishReasonSentence = (reason: string | null | undefined): string | null => {
  if (!reason) return null;
  return UNPUBLISH_REASON_LABELS[reason] ?? quoteFreeText(reason);
};

/** Libellé court pour l'admin et les exports. */
export const unpublishReasonAdminLabel = (reason: string | null | undefined): string => {
  if (!reason) return "";
  return UNPUBLISH_REASON_ADMIN_LABELS[reason] ?? quoteFreeText(reason);
};
