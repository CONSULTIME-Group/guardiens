/**
 * Lot E24 « Une question en public, une proposition d'aide en privé » :
 * règles pures des questions posées sur la fiche d'un besoin, partagées par la
 * fonction serveur mission-question, le site et les tests (vitest et Deno).
 *
 * Une question passe par moderate-content (type « sit », adresse postale
 * comprise) avant d'être enregistrée, comme le mot de fin du lot E19 :
 *  - coordonnées détectées ou « block » : refusée, rien n'est enregistré ;
 *  - « ok » : publique sur la fiche ;
 *  - « warning » ou modération injoignable : enregistrée en « private », lue
 *    seulement par la personne qui la pose et par l'auteur du besoin.
 * La réponse de l'auteur suit la même règle.
 */
import { detectMeetupWordContacts } from "./contact-details.ts";
import { verdictFromModeration } from "./meetup-word.ts";

export const QUESTION_MIN_LENGTH = 5;
export const QUESTION_MAX_LENGTH = 280;
export const ANSWER_MAX_LENGTH = 500;
/** Questions d'une même personne sur un même besoin. */
export const QUESTIONS_PER_MISSION_MAX = 3;
/** Questions d'une même personne sur 24 heures, tous besoins confondus. */
export const QUESTIONS_PER_DAY_MAX = 10;
export const QUESTION_MODERATION_TIMEOUT_MS = 15_000;

export type PublicTextVerdict = "ok" | "private" | "refused";

/** Espaces regroupés, bords retirés. */
export function cleanText(input: unknown): string {
  return String(input ?? "").replace(/\s+/g, " ").trim();
}

export type QuestionCheck =
  | { ok: true; text: string }
  | { ok: false; reason: "too_short" | "too_long" };

export function checkQuestion(input: unknown): QuestionCheck {
  const text = cleanText(input);
  if (text.length < QUESTION_MIN_LENGTH) return { ok: false, reason: "too_short" };
  if (text.length > QUESTION_MAX_LENGTH) return { ok: false, reason: "too_long" };
  return { ok: true, text };
}

export function checkAnswer(input: unknown): QuestionCheck {
  const text = cleanText(input);
  if (text.length < 1) return { ok: false, reason: "too_short" };
  if (text.length > ANSWER_MAX_LENGTH) return { ok: false, reason: "too_long" };
  return { ok: true, text };
}

/** Un besoin accueille des questions : ouvert, visible, hors projet participatif. */
export function missionAcceptsQuestions(m: {
  status?: string | null;
  category?: string | null;
  hidden_at?: string | null;
  moderation_hidden_at?: string | null;
} | null | undefined): boolean {
  if (!m) return false;
  return m.status === "open" && !m.hidden_at && !m.moderation_hidden_at && m.category !== "projet";
}

/** Verdict public d'un texte de question ou de réponse. */
export async function moderatePublicText(
  input: string,
  opts: {
    supabaseUrl: string;
    serviceKey: string;
    actingUserId?: string | null;
    fetchImpl?: typeof fetch;
    timeoutMs?: number;
  },
): Promise<{ verdict: PublicTextVerdict; rule: string | null }> {
  const text = cleanText(input);
  if (!text) return { verdict: "refused", rule: "empty" };
  if (detectMeetupWordContacts(text).length > 0) return { verdict: "refused", rule: "contact_details" };
  const doFetch = opts.fetchImpl ?? fetch;
  try {
    const res = await doFetch(`${opts.supabaseUrl}/functions/v1/moderate-content`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${opts.serviceKey}`,
        apikey: opts.serviceKey,
      },
      body: JSON.stringify({ content_type: "sit", text, acting_user_id: opts.actingUserId ?? null, check_postal_address: true }),
      signal: timeoutSignal(opts.timeoutMs ?? QUESTION_MODERATION_TIMEOUT_MS),
    });
    if (!res.ok) return { verdict: "private", rule: null };
    const v = verdictFromModeration(await res.json().catch(() => null));
    if (v.verdict === "refused") return { verdict: "refused", rule: v.rule };
    return { verdict: v.verdict === "ok" ? "ok" : "private", rule: null };
  } catch {
    return { verdict: "private", rule: null };
  }
}

/** Message d'erreur montré à la personne, sans jamais renvoyer le texte refusé. */
export function questionErrorMessage(reason: string): string {
  switch (reason) {
    case "too_short":
      return `Écrivez au moins ${QUESTION_MIN_LENGTH} caractères.`;
    case "too_long":
      return "Votre texte dépasse la longueur prévue, raccourcissez-le un peu.";
    case "contact_details":
      return "Gardez téléphone, email et adresse pour la messagerie, puis renvoyez votre texte.";
    case "refused":
      return "Ce texte reste en dehors de la fiche. Reformulez-le, ou écrivez par la messagerie.";
    case "mission_closed":
      return "Ce besoin accueille ses questions tant qu'il est ouvert.";
    case "own_mission":
      return "Vous êtes l'auteur de ce besoin : répondez aux questions sous chacune d'elles.";
    case "limit_mission":
      return `Vous avez posé ${QUESTIONS_PER_MISSION_MAX} questions sur ce besoin : la suite se passe par « Je peux » et la messagerie.`;
    case "limit_day":
      return "Vous avez beaucoup questionné aujourd'hui : reprenez demain.";
    case "already_answered":
      return "Cette question a déjà sa réponse.";
    case "account_inactive":
      return "Votre compte est en pause : écrivez à contact@guardiens.fr.";
    default:
      return "Réessayez dans un instant.";
  }
}

/** Prénom affiché : premier mot, initiale en capitale. */
export function questionFirstName(value: unknown): string {
  const word = String(value ?? "").trim().split(/\s+/)[0] ?? "";
  return word ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase() : "";
}

function timeoutSignal(ms: number): AbortSignal | undefined {
  try {
    return typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function"
      ? AbortSignal.timeout(ms)
      : undefined;
  } catch {
    return undefined;
  }
}
