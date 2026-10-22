// Hook utilitaire : appelle moderate-content et renvoie le verdict.
// Tolérant aux erreurs : si l'IA est indisponible, renvoie status 'ok' (fail-open
// modéré, car bloquer un utilisateur sur indisponibilité IA = pire UX).
//
// Lot J2c : un texte retenu affiche un message conforme à CGU 14.5 : la
// vérification est automatique, le constat, la règle en cause en une phrase,
// et la façon de demander un examen par une personne de l'équipe.

import { supabase } from "@/integrations/supabase/client";
import {
  HUMAN_REVIEW_SENTENCE,
  automatedRuleStatement,
  type AutomatedRuleId,
} from "../../supabase/functions/_shared/moderation-rules.ts";

export { HUMAN_REVIEW_SENTENCE };

export type ModerationVerdict = {
  status: "ok" | "warning" | "block";
  reasons: string[];
  suggestion?: string;
  /** Règle en cause d'un texte retenu (moderate-content, lot J2c). */
  rule?: AutomatedRuleId | string;
};

/**
 * Lot ERR1 : délai d'attente côté site. Au-delà, le texte passe (même règle
 * qu'une IA indisponible) ; le serveur borne aussi son appel IA à 12 s.
 */
export const MODERATION_CLIENT_TIMEOUT_MS = 20_000;

const MODERATION_TIMEOUT = Symbol("moderation-timeout");

export async function moderateContent(
  contentType: "sit" | "message" | "bio",
  text: string,
  timeoutMs: number = MODERATION_CLIENT_TIMEOUT_MS,
): Promise<ModerationVerdict> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const call = supabase.functions.invoke("moderate-content", {
      body: { content_type: contentType, text },
    });
    const timeout = new Promise<typeof MODERATION_TIMEOUT>((resolve) => {
      timer = setTimeout(() => resolve(MODERATION_TIMEOUT), timeoutMs);
    });
    const raced = await Promise.race([call, timeout]);
    if (raced === MODERATION_TIMEOUT) {
      // L'appel continue en arrière-plan : son issue ne doit rien lever.
      void call.catch(() => undefined);
      console.warn("moderation timeout");
      return { status: "ok", reasons: [] };
    }
    const { data, error } = raced;
    if (error) throw error;
    const d = data as any;
    if (!d || d.error) return { status: "ok", reasons: [] };
    return {
      status: d.status ?? "ok",
      reasons: Array.isArray(d.reasons) ? d.reasons : [],
      suggestion: d.suggestion,
      rule: typeof d.rule === "string" ? d.rule : undefined,
    };
  } catch (e) {
    console.warn("moderation unavailable", e);
    return { status: "ok", reasons: [] };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/** Texte retenu : annonce, message, candidature, proposition d'aide, besoin, présentation. */
export type RetainedTextKind = "sit" | "message" | "application" | "mission_response" | "mission" | "bio";

const RETENTION_LEAD: Record<RetainedTextKind, string> = {
  sit: "Ce passage de l'annonce est retenu par une vérification automatique, avant publication.",
  message: "Ce message est retenu par une vérification automatique, avant envoi.",
  application: "Cette candidature est retenue par une vérification automatique, avant envoi.",
  mission_response: "Cette proposition d'aide est retenue par une vérification automatique, avant envoi.",
  mission: "Ce besoin est retenu par une vérification automatique, avant publication.",
  bio: "Cette présentation est retenue par une vérification automatique, avant publication.",
};

export const RETENTION_TITLE: Record<RetainedTextKind, string> = {
  sit: "Passage retenu",
  message: "Message retenu",
  application: "Candidature retenue",
  mission_response: "Proposition retenue",
  mission: "Besoin retenu",
  bio: "Présentation retenue",
};

// Tirets demi-cadratin et cadratin (U+2013, U+2014), écrits par leur code.
const LONG_DASHES = new RegExp(`[${String.fromCharCode(0x2013, 0x2014)}]`, "g");

function cleanReason(r: string): string {
  return r.replace(LONG_DASHES, ",").replace(/\s+/g, " ").trim().replace(/[.\s]+$/, "");
}

/**
 * Message à l'écran d'un texte retenu (CGU 14.4 et 14.5) : décision
 * automatique, constat, règle en cause, modification possible et examen
 * humain sur demande.
 */
export function automatedRetentionNotice(
  kind: RetainedTextKind,
  opts: { rule?: string | null; reasons?: string[]; facts?: string | null },
): string {
  const facts = opts.facts?.trim()
    || (opts.reasons ?? []).map(cleanReason).filter(Boolean).join(" · ");
  const parts = [
    RETENTION_LEAD[kind],
    facts ? `Constat : ${facts.replace(/[.\s]+$/, "")}.` : null,
    `Règle en cause : ${automatedRuleStatement(opts.rule)}`,
    "Vous pouvez reformuler puis renvoyer votre texte.",
    HUMAN_REVIEW_SENTENCE,
  ];
  return parts.filter(Boolean).join(" ");
}

/** Raccourci pour un verdict de moderate-content. */
export function describeRetainedText(kind: RetainedTextKind, verdict: ModerationVerdict | undefined): string {
  return automatedRetentionNotice(kind, { rule: verdict?.rule, reasons: verdict?.reasons });
}
