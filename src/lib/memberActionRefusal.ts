/**
 * Lot REC2 : un refus de la base affiché à un membre laisse une trace.
 *
 * Avant ce lot, tout refus levé par RAISE EXCEPTION (P0001) ou par une règle
 * d'accès (42501) restait invisible : ni journal, ni événement. Le 21/11/2026,
 * aucune garde confirmée ne pouvait être annulée et rien ne le disait.
 */

/** Refus levé volontairement par la base, lu dans la réponse PostgREST. */
export function isDatabaseRefusal(url: string, status: number, pgCode: string | undefined): boolean {
  if (!/\/rest\/v1\//.test(url)) return false;
  return (status === 400 && pgCode === "P0001") || (status === 403 && pgCode === "42501");
}

/** « rpc:create_avis_annulation » ou « table:profiles », sans paramètre ni identifiant. */
export function refusalTarget(url: string): string {
  const rpc = url.match(/\/rest\/v1\/rpc\/([a-z0-9_]+)/i);
  if (rpc) return `rpc:${rpc[1]}`;
  const table = url.match(/\/rest\/v1\/([a-z0-9_]+)/i);
  return table ? `table:${table[1]}` : "inconnu";
}

/**
 * Messages des garde-fous internes : un membre qui les lit est bloqué par une
 * protection, et non par une règle qu'on lui explique. Chaque occurrence part
 * au journal des erreurs.
 */
const GUARD_MESSAGE = /champs? sensibles?|modification interdite|immutable|only the .+ can|not authorized|is locked|réservé à l['’]équipe|forbidden_transition|must_use_/i;

export function isGuardRefusal(message: string | undefined): boolean {
  return Boolean(message && GUARD_MESSAGE.test(message));
}

/** Message nettoyé pour le journal : 160 signes, sans identifiant ni email. */
export function cleanRefusalMessage(message: string | undefined): string {
  return String(message ?? "")
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, "[id]")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email]")
    .slice(0, 160);
}
