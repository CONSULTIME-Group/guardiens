/**
 * Lot HOME7 (13 novembre 2026). Une adresse d'annonce se termine par un
 * identifiant court de six caractères (« …-saint-vulbas-f5e13d »). Quand un
 * membre colle son lien dans un message sans espace après lui, le premier mot
 * de la phrase suivante entre dans l'adresse (« …-f5e13dPartagez ») et la
 * page répond « annonce introuvable ». Une adresse d'annonce est toujours en
 * minuscules : tout ce qui suit l'identifiant à partir d'une majuscule est
 * du texte collé.
 */
const GLUED = /^(.*-[0-9a-f]{6})[A-ZÀ-Ý].*$/;

export function stripGluedText(param: string): string {
  const m = GLUED.exec(param);
  return m ? m[1] : param;
}
