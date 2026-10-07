/**
 * Lot 0 : rôle choisi avant une inscription Google.
 *
 * Google ne transmet pas les métadonnées d'inscription : le rôle est gardé
 * en localStorage (avec horodatage) et dans l'URL de retour, puis appliqué
 * au retour par la fonction apply_signup_role, qui ne touche qu'un profil
 * créé il y a moins de 30 minutes sans rôle déclaré. Un membre existant
 * qui se reconnecte garde donc son rôle.
 */
import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/lib/analytics";

export type PendingSignupRole = "owner" | "sitter" | "both";
export const SIGNUP_ROLE_KEY = "guardiens_signup_role";
export const SIGNUP_ROLE_PARAM = "signup_role";
const MAX_AGE_MS = 30 * 60 * 1000;

const isRole = (v: unknown): v is PendingSignupRole => v === "owner" || v === "sitter" || v === "both";

export function rememberSignupRole(role: PendingSignupRole, now = Date.now()): void {
  try {
    localStorage.setItem(SIGNUP_ROLE_KEY, JSON.stringify({ role, at: now }));
  } catch { /* stockage indisponible : l'URL de retour prend le relais */ }
}

/** Ajoute ?signup_role= à une destination relative ou absolue. */
export function withSignupRoleParam(target: string, role: PendingSignupRole): string {
  const sep = target.includes("?") ? "&" : "?";
  return `${target}${sep}${SIGNUP_ROLE_PARAM}=${role}`;
}

export function readPendingSignupRole(now = Date.now()): PendingSignupRole | null {
  try {
    const raw = localStorage.getItem(SIGNUP_ROLE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { role?: unknown; at?: unknown };
      if (isRole(parsed.role) && typeof parsed.at === "number" && now - parsed.at < MAX_AGE_MS) {
        return parsed.role;
      }
    }
  } catch { /* valeur illisible : ignorée */ }
  try {
    const fromUrl = new URLSearchParams(window.location.search).get(SIGNUP_ROLE_PARAM);
    if (isRole(fromUrl)) return fromUrl;
  } catch { /* hors navigateur */ }
  return null;
}

export function clearPendingSignupRole(): void {
  try { localStorage.removeItem(SIGNUP_ROLE_KEY); } catch { /* rien */ }
  try {
    const url = new URL(window.location.href);
    if (url.searchParams.has(SIGNUP_ROLE_PARAM)) {
      url.searchParams.delete(SIGNUP_ROLE_PARAM);
      window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
    }
  } catch { /* rien */ }
}

/**
 * À appeler avant la lecture du profil d'une session. Sans rôle en attente,
 * aucun appel réseau. Le serveur décide seul si le rôle s'applique.
 */
export async function applyPendingSignupRole(): Promise<boolean> {
  const role = readPendingSignupRole();
  if (!role) return false;
  let applied = false;
  try {
    const { data, error } = await (supabase.rpc as any)("apply_signup_role", { p_role: role });
    applied = !error && data === true;
  } catch { /* le parcours continue avec le rôle actuel */ }
  clearPendingSignupRole();
  if (applied) {
    void trackEvent("signup_role_applied", { source: "oauth_return", metadata: { role, method: "google" } });
  }
  return applied;
}
