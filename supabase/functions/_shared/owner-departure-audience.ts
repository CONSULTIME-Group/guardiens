// Audience du préréglage « Propriétaires, question de départ » (lot N4).
// Même base que Noël 2026 (owner-noel-audience.ts), moins le groupe témoin,
// moins les membres ayant déjà répondu. Jetons /ma-periode : un par profil,
// 30 jours, réutilisables (même principe que helps_line_tokens).

import { DEPARTURE_TOKEN_DAYS, isOwnerV2Holdout } from "./owner-departure-logic.ts";

// deno-lint-ignore no-explicit-any
type Client = any;
const IN_CHUNK = 150;

export interface DepartureSplit<T> { rows: T[]; holdoutExcluded: number; alreadyAnswered: number }

/** Répartition pure : témoin d'abord, puis déjà répondu. */
export function splitDepartureAudience<T extends { id: string }>(rows: T[], answered: Set<string>): DepartureSplit<T> {
  let holdoutExcluded = 0, alreadyAnswered = 0;
  const kept: T[] = [];
  for (const r of rows) {
    if (isOwnerV2Holdout(r.id)) { holdoutExcluded++; continue; }
    if (answered.has(r.id)) { alreadyAnswered++; continue; }
    kept.push(r);
  }
  return { rows: kept, holdoutExcluded, alreadyAnswered };
}

export async function loadAnsweredIds(client: Client, ids: string[]): Promise<Set<string>> {
  const out = new Set<string>();
  for (let i = 0; i < ids.length; i += IN_CHUNK) {
    const { data, error } = await client.from("owner_departure_intents").select("user_id").in("user_id", ids.slice(i, i + IN_CHUNK));
    if (error) throw new Error(`departure intents lookup failed: ${error.message}`);
    for (const r of data ?? []) out.add(r.user_id as string);
  }
  return out;
}

function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Jeton actif réutilisé, sinon créé. Renvoie profil -> jeton. */
export async function mintDepartureTokens(client: Client, profileIds: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const ids = [...new Set(profileIds)];
  for (let i = 0; i < ids.length; i += IN_CHUNK) {
    const { data, error } = await client.from("departure_tokens").select("profile_id, token")
      .in("profile_id", ids.slice(i, i + IN_CHUNK)).is("revoked_at", null).gt("expires_at", new Date().toISOString());
    if (error) throw new Error(`departure token lookup failed: ${error.message}`);
    for (const r of data ?? []) out.set(r.profile_id as string, r.token as string);
  }
  const expires = new Date(Date.now() + DEPARTURE_TOKEN_DAYS * 86400000).toISOString();
  const rows: Array<{ token: string; profile_id: string; expires_at: string }> = [];
  for (const id of ids) {
    if (out.has(id)) continue;
    const token = generateToken();
    out.set(id, token);
    rows.push({ token, profile_id: id, expires_at: expires });
  }
  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await client.from("departure_tokens").insert(rows.slice(i, i + 500));
    if (error) throw new Error(`departure token mint failed: ${error.message}`);
  }
  return out;
}

export const periodBaseUrl = (token: string) => `https://guardiens.fr/ma-periode/${token}`;
