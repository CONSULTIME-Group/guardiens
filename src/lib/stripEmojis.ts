/**
 * Retire silencieusement les emojis et caractères décoratifs des textes
 * saisis par les utilisateurs (charte éditoriale : pas d'emoji dans le
 * contenu). Garde serveur : `public.strip_emojis` + trigger
 * `validate_small_mission` (autorité finale).
 *
 * Utilisé côté client pour un rendu propre immédiat à la saisie / à la
 * soumission. Ne remplace pas la garde serveur.
 */
const EMOJI_RE =
  /[\u{2600}-\u{27BF}\u{1F000}-\u{1FAFF}\u{FE0F}\u{200D}\u{2705}\u{2713}\u{2714}\u{270C}]/gu;

export function stripEmojis(input: string | null | undefined): string {
  if (!input) return "";
  return input.replace(EMOJI_RE, "").replace(/\s+/g, " ").trim();
}
