/**
 * Logique pure de la page « Ma ligne d'entraide ».
 * Partagée entre l'edge function `ma-ligne` et les tests Vitest.
 */

/** Identifiant logique des liens « ma ligne » (table helps_line_tokens). */
export const HELPS_WITH_TOKEN_ACTION = "helps_with";
export const HELPS_WITH_MAX_LENGTH = 200;
export const HELPS_WITH_TOKEN_DAYS = 30;

/**
 * Copie serveur de MONEY_RX (src/lib/missionContentGuards.ts).
 * Test de parité : src/__tests__/ma-ligne.test.ts.
 */
export const SERVER_MONEY_RX =
  /[€£$]|\b(?:eur|chf)\b|\d+\s*(?:euros?|balles|roros)\b|\bpaypal\b|\blydia\b|\bpaylib\b|\bvirement\b|\bcesu\b|\ben\s+especes\b|\ben\s+esp[èe]ces\b|\ben\s+liquide\b|\b(?:par|un)\s+ch[èe]que\b|\bde\s+l'heure\b/i;

export type LineValidation =
  | { ok: true; value: string }
  | { ok: false; reason: "empty" | "too_long" | "money" };

export function validateHelpsWith(raw: unknown): LineValidation {
  const value = typeof raw === "string" ? raw.replace(/\s+/g, " ").trim() : "";
  if (!value) return { ok: false, reason: "empty" };
  if (value.length > HELPS_WITH_MAX_LENGTH) return { ok: false, reason: "too_long" };
  if (SERVER_MONEY_RX.test(value.toLowerCase().replace(/[’]/g, "'"))) {
    return { ok: false, reason: "money" };
  }
  return { ok: true, value };
}

export interface TokenRow {
  profile_id: string | null;
  expires_at: string | null;
  revoked_at: string | null;
}

export type TokenState = "valid" | "expired" | "revoked" | "invalid";

/**
 * Jeton réutilisable (table `helps_line_tokens`) : `revoked_at` renseigné
 * signifie révoqué ; il ne se consomme pas à l'écriture.
 */
export function tokenState(row: TokenRow | null, now: Date = new Date()): TokenState {
  if (!row || !row.profile_id) return "invalid";
  if (row.revoked_at) return "revoked";
  if (!row.expires_at || new Date(row.expires_at).getTime() <= now.getTime()) return "expired";
  return "valid";
}

export const isWellFormedToken = (token: unknown): token is string =>
  typeof token === "string" && token.length >= 32 && token.length <= 200 && /^[a-f0-9]+$/i.test(token);

/** Plafonds sur fenêtre glissante de 10 minutes. */
export const RATE_LIMIT_WINDOW_MINUTES = 10;
export const RATE_LIMIT_PER_TOKEN = 12;
export const RATE_LIMIT_PER_IP = 40;

export const isRateLimited = (count: number, limit: number) => count >= limit;

export const lineUrlForToken = (token: string, campaign = "entraide_ligne") =>
  `https://guardiens.fr/ma-ligne/${token}?utm_source=email&utm_medium=email&utm_campaign=${campaign}`;
