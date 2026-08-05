/**
 * État d'affichage d'une carte "proposition d'appel vidéo".
 *
 * Règle produit : une seule proposition active par conversation à un instant
 * donné. La plus récente porte le bouton "Rejoindre l'appel", les précédentes
 * passent en état remplacé. Une proposition trop ancienne expire.
 *
 * Aucune donnée n'est modifiée en base : l'état est dérivé à la lecture.
 */
export const VIDEO_INVITE_TTL_MS = 4 * 60 * 60 * 1000; // 4 heures

export type VideoInviteState = "active" | "superseded" | "expired";

export const isVideoInvite = (msg: { metadata?: { kind?: string; room_url?: string } | null }): boolean =>
  msg.metadata?.kind === "video_call_invite" && Boolean(msg.metadata?.room_url);

export function latestVideoInviteId(
  messages: ReadonlyArray<{ id: string; created_at: string; metadata?: { kind?: string; room_url?: string } | null }>,
): string | null {
  let best: { id: string; t: number } | null = null;
  for (const m of messages) {
    if (!isVideoInvite(m)) continue;
    const t = new Date(m.created_at).getTime();
    if (!best || t >= best.t) best = { id: m.id, t };
  }
  return best?.id ?? null;
}

export function videoInviteState(
  msg: { id: string; created_at: string },
  latestId: string | null,
  now: number = Date.now(),
): VideoInviteState {
  if (msg.id !== latestId) return "superseded";
  const age = now - new Date(msg.created_at).getTime();
  return age > VIDEO_INVITE_TTL_MS ? "expired" : "active";
}
