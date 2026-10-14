/**
 * Lot A4 (audit Alma en arène du 14/10/2026) : plafonds d'Alma réservés
 * AVANT l'appel au modèle, jour de Paris, refus si le compteur est illisible.
 *
 * Une réservation est une ligne d'alma_conversations écrite tout de suite
 * (refusal_reason « reserved ») que la fonction complète ensuite. Le compte
 * se fait d'abord par la fonction alma_reserve_turn (verrou consultatif par
 * membre, exacte en parallèle : supabase/prepared-migrations/
 * 20261014190000_a4_alma_surete.sql). Tant que la migration n'est pas
 * appliquée (fonction absente), repli : insertion puis rang de la ligne parmi
 * celles du jour ; seules les `limit` premières passent.
 *
 * Deux compteurs : « chat » (alma-chat, 30 par jour) et « transcription »
 * (alma-transcribe, 20 par jour, décision de Jérémie du 14/10/2026), séparés
 * par classification.kind.
 *
 * Module pur, sans dépendance Deno : testé par vitest (src/__tests__/a4/).
 */

export type AlmaTurnKind = "chat" | "transcription";

/** Dictées par membre et par jour de Paris (décision du 14/10/2026). */
export const ALMA_TRANSCRIBE_DAILY_LIMIT = 20;

export const RESERVED_REASON = "reserved";

/** Minuit de Paris (instant UTC) du jour de `now`. */
export function parisDayStartIso(now: Date = new Date()): string {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  });
  const parts = (d: Date) => Object.fromEntries(fmt.formatToParts(d).map((p) => [p.type, p.value])) as Record<string, string>;
  const p = parts(now);
  const guess = Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day));
  // Décalage de Paris à cet instant (minuit tombe hors des changements d'heure).
  const q = parts(new Date(guess));
  const asUtc = Date.UTC(Number(q.year), Number(q.month) - 1, Number(q.day), Number(q.hour) % 24, Number(q.minute), Number(q.second));
  const offset = asUtc - guess;
  return new Date(guess - offset).toISOString();
}

export interface ReserveTurnInput {
  userId: string;
  kind: AlmaTurnKind;
  limit: number;
  /** Colonnes de la ligne réservée (surface, active_role, input_mode, question, page_path). */
  row: Record<string, unknown>;
  version: string;
  now?: Date;
}

export type ReserveTurnResult =
  | { ok: true; id: string; used: number }
  | { ok: false; reason: "daily_limit"; used: number; id: string | null }
  | { ok: false; reason: "count_failed"; id: string | null };

const isKind = (kind: AlmaTurnKind) => (row: { classification?: unknown }) => {
  const k = (row.classification as Record<string, unknown> | null | undefined)?.kind;
  return kind === "transcription" ? k === "transcription" : k !== "transcription";
};

/** Fonction absente en base (migration pas encore appliquée). */
export function isMissingFunction(err: { code?: string; message?: string } | null | undefined): boolean {
  if (!err) return false;
  return err.code === "PGRST202" || err.code === "42883" || /could not find the function/i.test(err.message ?? "");
}

/**
 * Réserve un tour. `ok: false` = refus : plafond atteint, ou compteur
 * illisible (on refuse plutôt que d'ouvrir un coût sans borne).
 */
export async function reserveAlmaTurn(
  // deno-lint-ignore no-explicit-any
  client: any,
  input: ReserveTurnInput,
): Promise<ReserveTurnResult> {
  const now = input.now ?? new Date();
  const classification = { version: input.version, ...(input.kind === "transcription" ? { kind: "transcription" } : {}) };
  // 1. Fonction atomique (verrou consultatif par membre et par compteur).
  try {
    const { data, error } = await client.rpc("alma_reserve_turn", {
      p_user_id: input.userId,
      p_kind: input.kind,
      p_limit: input.limit,
      p_row: { ...input.row, classification },
    });
    if (!error && data && typeof data === "object") {
      const d = data as { ok?: boolean; id?: string | null; used?: number };
      if (d.ok === true && typeof d.id === "string") return { ok: true, id: d.id, used: Number(d.used ?? 0) };
      if (d.ok === false) return { ok: false, reason: "daily_limit", used: Number(d.used ?? input.limit), id: d.id ?? null };
      return { ok: false, reason: "count_failed", id: null };
    }
    if (error && !isMissingFunction(error)) return { ok: false, reason: "count_failed", id: null };
    if (!error) return { ok: false, reason: "count_failed", id: null };
  } catch {
    return { ok: false, reason: "count_failed", id: null };
  }

  // 2. Repli : la ligne d'abord, puis son rang parmi celles du jour de Paris.
  let id: string | null = null;
  try {
    const { data: ins, error: insErr } = await client
      .from("alma_conversations")
      .insert({ ...input.row, user_id: input.userId, refusal_reason: RESERVED_REASON, classification })
      .select("id")
      .single();
    if (insErr || !ins?.id) return { ok: false, reason: "count_failed", id: null };
    id = String(ins.id);
    const { data: rows, error: readErr } = await client
      .from("alma_conversations")
      .select("id, classification, created_at")
      .eq("user_id", input.userId)
      .gte("created_at", parisDayStartIso(now))
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .limit(1000);
    if (readErr || !Array.isArray(rows)) return { ok: false, reason: "count_failed", id };
    const mine = (rows as Array<{ id: string; classification?: unknown }>).filter(isKind(input.kind));
    const rank = mine.findIndex((r) => String(r.id) === id);
    if (rank < 0) return { ok: false, reason: "count_failed", id };
    if (rank >= input.limit) return { ok: false, reason: "daily_limit", used: mine.length, id };
    return { ok: true, id, used: rank + 1 };
  } catch {
    return { ok: false, reason: "count_failed", id };
  }
}
