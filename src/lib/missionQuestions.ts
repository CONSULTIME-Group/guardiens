/**
 * Lot E24 : questions posées sur la fiche d'un besoin.
 * Lecture par get_mission_questions (drizzle 0107), écriture par la fonction
 * serveur mission-question. Règles et messages partagés avec le serveur dans
 * supabase/functions/_shared/mission-question.ts.
 */
import { supabase } from "@/integrations/supabase/client";
import {
  QUESTION_MAX_LENGTH,
  QUESTION_MIN_LENGTH,
  ANSWER_MAX_LENGTH,
  questionErrorMessage,
} from "../../supabase/functions/_shared/mission-question";

export { QUESTION_MAX_LENGTH, QUESTION_MIN_LENGTH, ANSWER_MAX_LENGTH, questionErrorMessage };

export interface MissionQuestion {
  id: string;
  body: string;
  answer: string | null;
  answered_at: string | null;
  created_at: string;
  asker_first_name: string;
  is_mine: boolean;
  is_public: boolean;
  /** Réponse lisible par tous (null tant qu'il n'y a pas de réponse). */
  answer_is_public?: boolean | null;
}

type RpcCaller = (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;

export async function fetchMissionQuestions(missionId: string): Promise<MissionQuestion[]> {
  const rpc = supabase.rpc as unknown as RpcCaller;
  const { data, error } = await rpc.call(supabase, "get_mission_questions", { p_mission_id: missionId });
  if (error || !Array.isArray(data)) return [];
  return data as MissionQuestion[];
}

export type QuestionSendResult = { ok: true; isPublic: boolean } | { ok: false; message: string };

async function send(body: Record<string, unknown>): Promise<QuestionSendResult> {
  const { data, error } = await supabase.functions.invoke("mission-question", { body });
  if (!error && data && (data as { ok?: unknown }).ok === true) {
    return { ok: true, isPublic: (data as { is_public?: unknown }).is_public === true };
  }
  let reason = "unexpected";
  let message: string | null = null;
  try {
    const ctx = (error as { context?: unknown } | null)?.context as Response | undefined;
    if (ctx && typeof ctx.clone === "function") {
      const parsed = (await ctx.clone().json()) as { reason?: unknown; message?: unknown } | null;
      if (typeof parsed?.reason === "string") reason = parsed.reason;
      if (typeof parsed?.message === "string") message = parsed.message;
    }
  } catch {
    /* corps illisible : message par défaut */
  }
  return { ok: false, message: message ?? questionErrorMessage(reason) };
}

export function askMissionQuestion(missionId: string, text: string): Promise<QuestionSendResult> {
  return send({ action: "ask", mission_id: missionId, body: text });
}

export function answerMissionQuestion(questionId: string, text: string): Promise<QuestionSendResult> {
  return send({ action: "answer", question_id: questionId, answer: text });
}

/** « il y a 2 jours », « hier », « aujourd'hui ». */
export function questionWhen(iso: string, now: Date = new Date()): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const days = Math.floor((startOfDay(now) - startOfDay(d)) / 86_400_000);
  if (days <= 0) return "aujourd'hui";
  if (days === 1) return "hier";
  if (days < 30) return `il y a ${days} jours`;
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
}

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}
