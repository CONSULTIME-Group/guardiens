/**
 * Lot ES-S (16/11/2026, conseil Entraide & sorties, décision 1 de Jérémie « ok ») :
 * un besoin d'entraide qui dit une détresse personnelle (deuil, dépression,
 * maladie grave, violence) ne s'affiche pas aux visiteurs non connectés ni aux
 * robots : listes publiques du hub, des pages villes, vitrine de l'accueil,
 * sitemap et balise robots de la fiche. Les membres connectés le voient.
 *
 * Pourquoi : le 16/11/2026, le premier besoin servi à un visiteur, en titre
 * d'une page indexée, était « Aide pour le ménage, je suis en grosse dépression
 * et viens de perdre mon mari ». La fiche était en noindex, le hub ne l'était pas.
 *
 * Détection par mots entiers sur le texte sans accents ni casse. Un faux
 * positif masque seulement le besoin aux visiteurs, jamais aux membres.
 */
const SENSITIVE_PATTERNS = [
  /\bdepress/,
  /\bdeprim/,
  /\bdeuil\b/,
  /\bdeces\b/,
  /\bdecede/,
  /\bveu(f|ve)s?\b/,
  /\b(perdu|perdre|perte de) (mon|ma) (mari|femme|epoux|epouse|conjoint|conjointe|compagnon|compagne|fils|fille|enfant|pere|mere)\b/,
  /\bsuicid/,
  /\bidees noires\b/,
  /\benvie de mourir\b/,
  /\bcancer/,
  /\bchimio/,
  /\btumeur/,
  /\bpalliatif/,
  /\bfin de vie\b/,
  /\bburn ?-?out\b/,
  /\bharcel/,
  /\bviolence/,
  /\bviolente?s?\b/,
  /\bagress(e|ee|ion)s?\b/,
  /\bhospitalis/,
];

/** Texte en minuscules, sans accents, apostrophes et tirets réduits à des espaces. */
export function normalizeSensitiveText(text) {
  return String(text || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[’'`\-_]/g, " ")
    .replace(/\s+/g, " ");
}

/** Vrai si l'un des textes (titre, description) dit une détresse personnelle. */
export function isSensitiveMissionText(...parts) {
  const text = normalizeSensitiveText(parts.filter(Boolean).join(" "));
  if (!text.trim()) return false;
  return SENSITIVE_PATTERNS.some((pattern) => pattern.test(text));
}

/** Filtre de liste publique : garde tout pour un membre, retire les besoins sensibles pour un visiteur. */
export function visibleToPublic(mission, isAuthenticated) {
  if (isAuthenticated) return true;
  return !isSensitiveMissionText(mission?.title, mission?.description);
}
