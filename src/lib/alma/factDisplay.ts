/**
 * Lot ALMA1 (10/11/2026) : un fait d'Alma est compté « vu » quand il est
 * réellement à l'écran, aperçu rendu ou panneau ouvert sur lui, jamais à sa
 * mise en file. Avant ce lot, 475 faits étaient comptés vus sur /search en
 * 30 jours alors que l'aperçu n'y était pas rendu.
 */
import type { AlmaWhisper } from "./whisper-types";
import { HUMOR_FACT_TYPE } from "./factSurfaces";

export type FactDisplay = "peek" | "panel";

export interface FactSeenMetadata {
  fact_id: string;
  fact_type: string;
  surface: string;
  display: FactDisplay;
}

/** Métadonnées de alma_cultural_fact_seen, ou null si le murmure n'est pas un fait. */
export function factSeenPayload(
  whisper: Pick<AlmaWhisper, "type" | "surface" | "metadata"> | null | undefined,
  display: FactDisplay,
): FactSeenMetadata | null {
  if (!whisper) return null;
  if (whisper.type !== "cultural_fact" && whisper.type !== "usage_nudge") return null;
  const meta = (whisper.metadata ?? {}) as Record<string, unknown>;
  const factId = typeof meta.fact_id === "string" ? meta.fact_id : null;
  if (!factId) return null;
  const factType =
    whisper.type === "usage_nudge"
      ? "usage_nudge"
      : typeof meta.fact_type === "string"
        ? meta.fact_type
        : "unknown";
  return {
    fact_id: factId,
    fact_type: factType,
    surface: whisper.surface ?? "unknown",
    display,
  };
}

export function isHumorFact(payload: FactSeenMetadata | null): boolean {
  return payload?.fact_type === HUMOR_FACT_TYPE;
}

/**
 * Un seul comptage par murmure : renvoie true la première fois qu'un
 * identifiant est vu, false ensuite.
 */
export function firstDisplayOf(seen: Set<string>, whisperId: string | null | undefined): boolean {
  if (!whisperId || seen.has(whisperId)) return false;
  seen.add(whisperId);
  return true;
}
