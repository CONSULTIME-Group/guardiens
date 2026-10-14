/**
 * Lot J1 : preuve d'acceptation des textes légaux.
 *
 * Inscription par email : la case cochée part dans les métadonnées
 * (LEGAL_ACCEPTED_SIGNUP), un trigger serveur écrit la trace.
 * Google ne transmet pas les métadonnées : la source est gardée ici, avec
 * horodatage, puis transmise au retour par record_my_legal_acceptance. Le
 * serveur choisit seul les versions et refuse une acceptation Google pour un
 * compte de plus de 30 minutes. Sans source en attente, aucun appel réseau.
 */
import { supabase } from "@/integrations/supabase/client";

export type LegalAcceptanceSource = "signup_google" | "login_google" | "reaccept";
export const LEGAL_ACCEPTANCE_KEY = "guardiens_legal_acceptance";
/** Valeur des métadonnées d'inscription lue par le trigger serveur. */
export const LEGAL_ACCEPTED_SIGNUP = "signup";
const MAX_AGE_MS = 30 * 60 * 1000;

const isSource = (v: unknown): v is LegalAcceptanceSource =>
  v === "signup_google" || v === "login_google" || v === "reaccept";

export function rememberLegalAcceptance(source: LegalAcceptanceSource, now = Date.now()): void {
  try {
    localStorage.setItem(LEGAL_ACCEPTANCE_KEY, JSON.stringify({ source, at: now }));
  } catch { /* stockage indisponible : aucune trace, l'inscription continue */ }
}

export function readPendingLegalAcceptance(now = Date.now()): LegalAcceptanceSource | null {
  try {
    const raw = localStorage.getItem(LEGAL_ACCEPTANCE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { source?: unknown; at?: unknown };
    if (isSource(parsed.source) && typeof parsed.at === "number" && now - parsed.at < MAX_AGE_MS) {
      return parsed.source;
    }
  } catch { /* valeur illisible : ignorée */ }
  return null;
}

export function clearPendingLegalAcceptance(): void {
  try { localStorage.removeItem(LEGAL_ACCEPTANCE_KEY); } catch { /* rien */ }
}

/**
 * À appeler quand une session est établie. Jamais bloquant : un échec laisse
 * la session intacte et la source en attente est effacée.
 */
let inflight: Promise<boolean> | null = null;

/**
 * Lot J2b : la porte de réacceptation attend la trace Google en cours avant
 * de demander les documents à accepter (un nouvel inscrit les a déjà acceptés).
 */
export function legalAcceptanceSettled(): Promise<unknown> {
  return inflight ?? Promise.resolve();
}

export function applyPendingLegalAcceptance(): Promise<boolean> {
  inflight = applyPendingLegalAcceptanceNow();
  return inflight;
}

async function applyPendingLegalAcceptanceNow(): Promise<boolean> {
  const source = readPendingLegalAcceptance();
  if (!source) {
    clearPendingLegalAcceptance();
    return false;
  }
  let recorded = false;
  try {
    const { data, error } = await (supabase.rpc as any)("record_my_legal_acceptance", { p_source: source });
    recorded = !error && data === true;
  } catch { /* trace manquante, parcours inchangé */ }
  clearPendingLegalAcceptance();
  return recorded;
}
