/**
 * Personnes avec qui le propriétaire a une candidature ou une conversation
 * sur une annonce, proposées dans la fenêtre de retrait quand il déclare
 * avoir trouvé son gardien sur Guardiens. Logique pure, testée.
 */
export interface PlatformCandidate {
  sitterId: string;
  firstName: string;
  city: string | null;
  avatarUrl: string | null;
  /** Candidature encore ouverte (pending, viewed, discussing), acceptable. */
  applicationId: string | null;
}

export function buildPlatformCandidates(params: {
  openApplications: ReadonlyArray<{ id: string; sitter_id: string }>;
  conversationSitterIds: ReadonlyArray<string | null | undefined>;
  profiles: ReadonlyArray<{ id: string; first_name?: string | null; city?: string | null; avatar_url?: string | null }>;
  ownerId?: string | null;
}): PlatformCandidate[] {
  const byId = new Map(params.profiles.map((p) => [p.id, p]));
  const order: string[] = [];
  const appBySitter = new Map<string, string>();
  for (const a of params.openApplications) {
    if (!a.sitter_id) continue;
    if (!appBySitter.has(a.sitter_id)) {
      appBySitter.set(a.sitter_id, a.id);
      order.push(a.sitter_id);
    }
  }
  for (const id of params.conversationSitterIds) {
    if (!id || id === params.ownerId || order.includes(id)) continue;
    order.push(id);
  }
  const out = order.map((id) => {
    const p = byId.get(id);
    return {
      sitterId: id,
      firstName: (p?.first_name ?? "").trim() || "Membre",
      city: p?.city?.trim() || null,
      avatarUrl: p?.avatar_url || null,
      applicationId: appBySitter.get(id) ?? null,
    };
  });
  // Les personnes acceptables d'abord, l'ordre d'arrivée est conservé.
  return [...out.filter((c) => c.applicationId), ...out.filter((c) => !c.applicationId)];
}
