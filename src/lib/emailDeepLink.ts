/**
 * Lot Y1 (P4-06) : issue d'un lien profond d'email, lue dans la réponse de
 * la fonction email-deep-link. Logique pure, testée dans src/__tests__/y1/.
 */
export type DeepLinkOutcome =
  | { kind: "session"; url: string; next: string }
  | { kind: "same_account"; next: string }
  | { kind: "other_account"; next: string }
  | { kind: "login"; next: string };

/** Destination interne seulement, jamais un autre domaine. */
export function safeDeepLinkPath(p: unknown): string {
  return typeof p === "string" && p.startsWith("/") && !p.startsWith("//") ? p : "/messages";
}

export function deepLinkOutcome(data: unknown): DeepLinkOutcome {
  const d = (data ?? {}) as Record<string, unknown>;
  const next = safeDeepLinkPath(d.next);
  if (d.ok === true && d.sameAccount === true) return { kind: "same_account", next };
  if (d.ok === true && typeof d.url === "string" && d.url.length > 0) return { kind: "session", url: d.url, next };
  if (d.ok === false && d.reason === "other_account") return { kind: "other_account", next };
  return { kind: "login", next };
}
