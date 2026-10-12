/**
 * Lot F2 (12/10/2026) : le temps réel Supabase ne fait jamais tomber une page.
 *
 * Quand le navigateur refuse de créer le WebSocket (réseau filtrant,
 * navigateur restreint, page traduite par un service tiers), realtime-js
 * lève une erreur synchrone dans connect(), appelée par channel.subscribe()
 * depuis un useEffect : React démonte toute la page. Cas réel : fiches
 * gardien publiques, 5 plantages les 11 et 12/10/2026.
 *
 * On enveloppe connect() une seule fois : l'erreur est notée en console, la
 * page continue avec ses lectures classiques, sans mise à jour en direct.
 */
type RealtimeLike = { connect: (...args: unknown[]) => unknown; __guardiensGuarded?: boolean };

export function guardRealtimeConnect(client: { realtime?: unknown } | null | undefined): boolean {
  const rt = client?.realtime as RealtimeLike | undefined;
  if (!rt || typeof rt.connect !== "function" || rt.__guardiensGuarded) return false;
  const original = rt.connect.bind(rt);
  rt.connect = (...args: unknown[]) => {
    try {
      return original(...args);
    } catch (error) {
      console.warn("[realtime] connexion impossible, la page continue sans temps réel", error);
      return undefined;
    }
  };
  rt.__guardiensGuarded = true;
  return true;
}
