/**
 * Lot E19 « Confiance avant toute parole publique » : le mot laissé après un
 * coup de main passe par moderate-content en type « sit » (celui des pages
 * publiques, qui retient téléphone, email et adresse) avant d'être enregistré.
 *
 * Module pur, sans dépendance Deno : lu par mission-quick-action et par les
 * tests (vitest et Deno). L'appel réseau est injectable.
 *
 * Verdicts :
 *  - « refused » : coordonnées détectées ici, ou « block » de moderate-content.
 *    Le mot n'est pas enregistré, le reste de la réponse l'est.
 *  - « ok » : publiable si la personne l'accepte.
 *  - « warning » : enregistré, réservé à la personne qui le reçoit.
 *  - « unchecked » : moderate-content injoignable, enregistré, réservé à la
 *    personne qui le reçoit (la vue publique exige « ok »).
 */
import { detectContactDetails } from "./contact-details.ts";

export type MeetupWordVerdict = "ok" | "warning" | "unchecked" | "refused";

export interface MeetupWordModeration {
  verdict: MeetupWordVerdict;
  rule: string | null;
}

/** Délai d'attente de moderate-content, au-delà le mot reste privé. */
export const MEETUP_WORD_MODERATION_TIMEOUT_MS = 15_000;

/** Longueur maximale du mot, identique à la base (confirm_mission_meetup). */
export const MEETUP_WORD_MAX_LENGTH = 140;

/** Lecture du verdict de moderate-content. */
export function verdictFromModeration(body: unknown): MeetupWordModeration {
  const status = (body as { status?: unknown } | null)?.status;
  const rule = (body as { rule?: unknown } | null)?.rule;
  if (status === "block") return { verdict: "refused", rule: typeof rule === "string" ? rule : null };
  if (status === "ok") return { verdict: "ok", rule: null };
  if (status === "warning") return { verdict: "warning", rule: null };
  return { verdict: "unchecked", rule: null };
}

export async function moderateMeetupWord(
  word: string,
  opts: {
    supabaseUrl: string;
    serviceKey: string;
    actingUserId?: string | null;
    fetchImpl?: typeof fetch;
    timeoutMs?: number;
  },
): Promise<MeetupWordModeration> {
  const text = word.trim().slice(0, MEETUP_WORD_MAX_LENGTH);
  if (!text) return { verdict: "unchecked", rule: null };

  // Filet déterministe, identique au site : téléphone, email, adresse.
  if (detectContactDetails(text).length > 0) return { verdict: "refused", rule: "contact_details" };

  const doFetch = opts.fetchImpl ?? fetch;
  try {
    const res = await doFetch(`${opts.supabaseUrl}/functions/v1/moderate-content`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${opts.serviceKey}`,
        apikey: opts.serviceKey,
      },
      body: JSON.stringify({ content_type: "sit", text, acting_user_id: opts.actingUserId ?? null }),
      signal: timeoutSignal(opts.timeoutMs ?? MEETUP_WORD_MODERATION_TIMEOUT_MS),
    });
    if (!res.ok) return { verdict: "unchecked", rule: null };
    return verdictFromModeration(await res.json().catch(() => null));
  } catch {
    return { verdict: "unchecked", rule: null };
  }
}

/** Délai borné quand l'environnement le permet (Deno, navigateurs récents). */
function timeoutSignal(ms: number): AbortSignal | undefined {
  try {
    return typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function"
      ? AbortSignal.timeout(ms)
      : undefined;
  } catch {
    return undefined;
  }
}

/** Valeur transmise à confirm_mission_meetup (p_word_moderation). */
export function wordModerationParam(verdict: MeetupWordVerdict): "ok" | "warning" | "unchecked" | null {
  return verdict === "refused" ? null : verdict;
}
