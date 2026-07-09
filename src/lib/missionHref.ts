/**
 * Helper : construit l'URL canonique d'une petite mission.
 * Préfère le slug lisible ; retombe sur l'UUID pour la rétrocompatibilité.
 */
export function missionHref(m: { slug?: string | null; id: string } | null | undefined): string {
  if (!m) return "/petites-missions";
  return `/petites-missions/${m.slug || m.id}`;
}

/** Vrai UUID v4-ish : sert à détecter si un paramètre d'URL est un id ou un slug. */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}
