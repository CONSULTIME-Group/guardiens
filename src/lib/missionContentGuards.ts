/**
 * Garde-fous éditoriaux des missions d'entraide.
 *
 * Deux règles explicables, volontairement non bloquantes :
 *
 * 1. `sitLikeSignals` : une mission qui combine du vocabulaire de garde et une
 *    espèce animale (renforcé par une durée en jours, semaines ou mois) est
 *    une annonce de garde déguisée. La garde d'animaux a son canal dédié
 *    (/sits/create) : on propose la bascule en reprenant le texte, et on
 *    ouvre un signal admin à la publication.
 *
 * 2. `rehomingSignals` : la cession ou l'adoption d'animaux n'a pas sa place
 *    dans l'entraide. Règle affichée au membre + signal admin à la
 *    publication, sans bloquer (modération a posteriori).
 */

export interface ContentGuardSignals {
  /** Signaux déclenchés, explicables et affichables (fr). */
  matched: string[];
}

const DURATION_RX =
  /\b\d+\s*(j|jr|jour|jours|nuit|nuits|sem|semaine|semaines|mois|an|ans)\b|\b(une|deux|trois|quatre|plusieurs|minimum)\s+(jour|jours|nuit|nuits|semaine|semaines|mois)\b/i;

const GUARD_VOCAB_RX =
  /\b(garde|garder|gardiennage|gardien|gardienne|gardeuse|faire\s+garder|pension)\b/i;

const SPECIES_RX =
  /\b(chats?|chatons?|chien(ne)?s?|chiots?|cheval|chevaux|poney|poules?|coqs?|lapins?|hamsters?|cochons?\s+d['’]inde|furets?|oiseaux?|poissons?|tortues?|rongeurs?|nac|animaux|animal)\b/i;

const REHOMING_RX =
  /\b(adopt\w*|adoption|à\s+donner|a\s+donner|donne|cession|cède|cede|vend|à\s+vendre|a\s+vendre|recherche\s+famille|cherche\s+famille|nouvelle\s+famille|placement|placer)\b/i;

const normalize = (s: string) => s.toLowerCase().replace(/[’]/g, "'");

/**
 * Détecte une mission qui ressemble à une garde d'animaux.
 * Règle : vocabulaire de garde + espèce animale. La présence d'une durée
 * renforce le signal et le rend plus explicable.
 */
export function sitLikeSignals(
  title: string | null | undefined,
  description: string | null | undefined,
): ContentGuardSignals | null {
  const text = normalize(`${title ?? ""} ${description ?? ""}`);
  if (!text.trim()) return null;
  const hasGuard = GUARD_VOCAB_RX.test(text);
  const hasSpecies = SPECIES_RX.test(text);
  if (!hasGuard || !hasSpecies) return null;
  const hasDuration = DURATION_RX.test(text);
  const matched = ["vocabulaire de garde", "espèce animale"];
  if (hasDuration) matched.push("durée en jours ou semaines");
  return { matched };
}

/**
 * Détecte une annonce de cession ou d'adoption d'animaux.
 * Règle : marqueur de cession ou d'adoption + espèce animale, pour ne pas
 * flaguer « je donne des plants de tomates ».
 */
export function rehomingSignals(
  title: string | null | undefined,
  description: string | null | undefined,
): ContentGuardSignals | null {
  const text = normalize(`${title ?? ""} ${description ?? ""}`);
  if (!text.trim()) return null;
  if (!REHOMING_RX.test(text) || !SPECIES_RX.test(text)) return null;
  return { matched: ["marqueur de cession ou adoption", "espèce animale"] };
}

/** Clé sessionStorage pour la reprise du texte vers /sits/create. */
export const SIT_PREFILL_KEY = "guardiens.sitPrefill";

export interface SitPrefill {
  title: string;
  description: string;
}

export function writeSitPrefill(prefill: SitPrefill): void {
  try {
    sessionStorage.setItem(SIT_PREFILL_KEY, JSON.stringify(prefill));
  } catch {
    // sessionStorage indisponible : la bascule reste possible sans pré-remplissage.
  }
}

export function readSitPrefill(): SitPrefill | null {
  try {
    const raw = sessionStorage.getItem(SIT_PREFILL_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(SIT_PREFILL_KEY);
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return {
      title: typeof parsed.title === "string" ? parsed.title : "",
      description: typeof parsed.description === "string" ? parsed.description : "",
    };
  } catch {
    return null;
  }
}
