/**
 * Lot ERR1 : corps d'une erreur de supabase.functions.invoke.
 *
 * Pour une réponse non-2xx, supabase-js renvoie un FunctionsHttpError dont
 * `context` est la Response elle-même : le code métier (ex. DAILY_QUOTA_REACHED)
 * se lit dans son corps JSON, jamais dans `context.code`. Lecture sur un clone,
 * silencieuse : un corps absent ou illisible donne un objet vide.
 */
export type FunctionErrorBody = {
  status?: number;
  code?: string;
  error?: string;
};

export async function readFunctionErrorBody(error: unknown): Promise<FunctionErrorBody> {
  const ctx = (error as { context?: unknown } | null)?.context;
  if (!ctx || typeof ctx !== "object") return {};
  const out: FunctionErrorBody = {};
  const status = (ctx as { status?: unknown }).status;
  if (typeof status === "number") out.status = status;
  try {
    const res = ctx as Response;
    const source = typeof res.clone === "function" ? res.clone() : res;
    if (typeof source.json !== "function") return out;
    const body = (await source.json()) as Record<string, unknown> | null;
    if (body && typeof body === "object") {
      if (typeof body.code === "string") out.code = body.code;
      if (typeof body.error === "string") out.error = body.error;
    }
  } catch {
    /* corps vide ou non JSON */
  }
  return out;
}
