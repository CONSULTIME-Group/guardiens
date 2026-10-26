/**
 * Lot E23 : un email d'entraide envoyé à l'auteur d'un besoin, sans lien
 * profond, mène à la fiche avec ?vous=auteur (authorMissionUrl, côté fonctions).
 */
export const AUTHOR_RETURN_PARAM = "vous";
export const AUTHOR_RETURN_VALUE = "auteur";

export function isAuthorReturn(params: URLSearchParams): boolean {
  return params.get(AUTHOR_RETURN_PARAM) === AUTHOR_RETURN_VALUE;
}
