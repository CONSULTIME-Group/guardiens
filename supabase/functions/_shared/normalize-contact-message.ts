/**
 * Nettoie un message collé depuis un traitement de texte : espaces insécables,
 * tabulations, suites d'espaces, espaces en début et fin de ligne, sauts de
 * ligne répétés. Sert à la validation et à l'enregistrement, jamais à la
 * saisie affichée. Source unique, partagée par le site et les fonctions
 * serveur (lot J2-B) ; src/lib/normalizeContactMessage.ts la ré-exporte.
 */
export const normalizeContactMessage = (raw: string): string =>
  raw
    .replace(/\r\n?/g, "\n")
    .replace(/[\u00A0\u202F\t]/g, " ")
    .replace(/ {2,}/g, " ")
    .split("\n")
    .map((line) => line.trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
