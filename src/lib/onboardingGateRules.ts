/**
 * Lot G1 (11/10/2026) : règles de la porte d'affinité (OnboardingGate).
 *
 * 1. Pages jamais interrompues : un membre doit toujours pouvoir lire ses
 *    messages, ouvrir une annonce, suivre ses candidatures et ses gardes,
 *    et gérer son compte. Cas réel du 05 au 09/10/2026 : une propriétaire
 *    (rôle both) n'a jamais pu lire ses 5 candidatures, chaque ouverture de
 *    message la renvoyait vers le questionnaire.
 * 2. « Plus tard » : la page d'affinité permet de reporter de 24 h. Pendant ce
 *    délai la porte ne redirige plus ; le questionnaire reste accessible.
 */

/** Préfixes des pages jamais interrompues par la porte. */
const ALWAYS_OPEN_PREFIXES = [
  // Parcours d'onboarding et de compte
  "/onboarding/affinity",
  "/logout",
  "/reset-password",
  "/bienvenue",
  "/arrivee",
  "/settings",
  // Échanges et engagements en cours
  "/messages",
  "/sits",
  "/mes-candidatures",
  "/propositions",
  "/notifications",
  "/review",
  "/mes-avis",
  "/house-guide",
  // Lot I1b (13/10/2026) : l'entraide, dont la page du besoin qu'on vient de
  // publier. Du 06 au 12/10, 5 auteurs renvoyés vers le questionnaire en
  // ouvrant leur propre besoin, l'une trois fois en deux minutes.
  "/petites-missions",
  // Lot X2 : les projets participatifs, page et candidatures du porteur (C-13).
  "/projets",
];

function matchesPrefix(path: string, prefix: string): boolean {
  return path === prefix || path.startsWith(prefix + "/") || path.startsWith(prefix + "?") || path.startsWith(prefix + "#");
}

/** Vrai si la porte ne doit jamais rediriger depuis ce chemin. */
export function isGateAlwaysOpenPath(path: string | null | undefined): boolean {
  if (!path) return false;
  return ALWAYS_OPEN_PREFIXES.some((p) => matchesPrefix(path, p));
}

const SNOOZE_KEY = "guardiens_affinity_snooze_until";
export const AFFINITY_SNOOZE_MS = 24 * 3600 * 1000;

/** Reporte la porte de 24 h (bouton « Plus tard »). */
export function snoozeAffinityOnboarding(now = Date.now()): void {
  try { localStorage.setItem(SNOOZE_KEY, String(now + AFFINITY_SNOOZE_MS)); } catch { /* stockage indisponible */ }
}

/** Vrai tant que le report de 24 h court. Stockage illisible : pas de report. */
export function isAffinityOnboardingSnoozed(now = Date.now()): boolean {
  try {
    const raw = localStorage.getItem(SNOOZE_KEY);
    if (!raw) return false;
    const until = Number(raw);
    return Number.isFinite(until) && until > now;
  } catch {
    return false;
  }
}

/** Efface le report (questionnaire rempli). */
export function clearAffinitySnooze(): void {
  try { localStorage.removeItem(SNOOZE_KEY); } catch { /* rien */ }
}
