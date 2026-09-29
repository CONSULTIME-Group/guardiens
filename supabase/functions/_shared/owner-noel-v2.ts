// Noël 2026 devient l'étape J+7 de la séquence propriétaire v2 (lot N6).
//
// Répartition de l'audience Noël :
// - groupe témoin exclu (isOwnerV2Holdout) ;
// - dernière réponse printemps, été ou plus tard : exclu (relancé à sa période) ;
// - dernière réponse noel ou hiver : mode « répondant » ;
// - aucune réponse : variantes A et B, avec les cinq boutons de période.

import { isOwnerV2Holdout, remainingPhrase, type Readiness } from "./owner-departure-logic.ts";
import { ownerReadiness } from "./owner-readiness.ts";
import { isUnderPressure } from "./owner-campaign-pressure.ts";
import type { NoelTemplateData, SitterRow } from "./owner-noel-audience.ts";

// deno-lint-ignore no-explicit-any
type Client = any;
const IN_CHUNK = 150;

export type NoelResponderPeriod = "noel" | "hiver";
export interface IntentLite { user_id: string; period: string; answered_at: string; source?: string | null }

/** Dernière réponse par membre (answered_at le plus récent). */
export function latestIntentByUser(rows: IntentLite[]): Map<string, string> {
  const best = new Map<string, IntentLite>();
  for (const r of rows) {
    // Réponses marquées robot de messagerie : hors répartition (lot N7).
    if (r.source === "scanner_suspect") continue;
    const cur = best.get(r.user_id);
    if (!cur || r.answered_at > cur.answered_at) best.set(r.user_id, r);
  }
  return new Map([...best].map(([k, v]) => [k, v.period]));
}

export interface NoelV2Split<T> {
  rows: T[];
  responders: Map<string, NoelResponderPeriod>;
  holdoutExcluded: number;
  otherPeriodExcluded: number;
  pressureExcluded: number;
}

export function splitNoelV2Audience<T extends { id: string; email?: string | null }>(
  rows: T[], latest: Map<string, string>, recentCounts: Map<string, number> = new Map(),
): NoelV2Split<T> {
  let holdoutExcluded = 0, otherPeriodExcluded = 0, pressureExcluded = 0;
  const kept: T[] = [];
  const responders = new Map<string, NoelResponderPeriod>();
  for (const r of rows) {
    if (isOwnerV2Holdout(r.id)) { holdoutExcluded++; continue; }
    const p = latest.get(r.id);
    if (p === "printemps" || p === "ete" || p === "plus_tard") { otherPeriodExcluded++; continue; }
    if (isUnderPressure(recentCounts, r.email)) { pressureExcluded++; continue; }
    if (p === "noel" || p === "hiver") responders.set(r.id, p);
    kept.push(r);
  }
  return { rows: kept, responders, holdoutExcluded, otherPeriodExcluded, pressureExcluded };
}

export async function loadLatestIntents(client: Client, ids: string[]): Promise<Map<string, string>> {
  const rows: IntentLite[] = [];
  for (let i = 0; i < ids.length; i += IN_CHUNK) {
    const { data, error } = await client.from("owner_departure_intents")
      .select("user_id, period, answered_at, source").in("user_id", ids.slice(i, i + IN_CHUNK));
    if (error) throw new Error(`departure intents lookup failed: ${error.message}`);
    rows.push(...((data ?? []) as IntentLite[]));
  }
  return latestIntentByUser(rows);
}

const joinFr = (parts: string[]) =>
  parts.length <= 1 ? (parts[0] ?? "") : `${parts.slice(0, -1).join(", ")} et ${parts[parts.length - 1]}`;

const HOUSING_DONE: Record<string, string> = {
  house: "votre maison", apartment: "votre appartement", farm: "votre ferme", chalet: "votre chalet", other: "votre logement",
};

/** « votre maison, Mila et Rex, votre commune » : seulement ce qui est réellement renseigné. */
export function donePhrase(r: Readiness, petNames: string[], propertyType: string | null): string {
  const parts: string[] = [];
  const logement = r.items.find((i) => i.key === "logement");
  if (logement?.done) parts.push(HOUSING_DONE[String(propertyType ?? "")] ?? "votre logement");
  parts.push(...petNames.filter((n) => n.trim() !== ""));
  if (r.items.find((i) => i.key === "commune")?.done) parts.push("votre commune");
  return joinFr(parts);
}

export interface ResponderExtra {
  mode: "responder";
  period: NoelResponderPeriod;
  percent: number;
  done: string;
  todo: string;
}

/** Données complètes du mode répondant : readiness + bloc gardiens (A ou B). */
export async function buildResponderData(
  client: Client,
  userId: string,
  period: NoelResponderPeriod,
  noel: NoelTemplateData,
  pool?: SitterRow[],
): Promise<NoelTemplateData & ResponderExtra> {
  const r = await ownerReadiness(client, userId, pool);
  const { data: props } = await client.from("properties").select("type").eq("user_id", userId).limit(1);
  const type = (props?.[0]?.type as string | undefined) ?? null;
  return {
    ...noel,
    mode: "responder",
    period,
    percent: r.readiness.percent,
    done: donePhrase(r.readiness, r.petNames, type),
    todo: remainingPhrase(r.readiness.todo),
  };
}
