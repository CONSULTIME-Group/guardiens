/**
 * Lecture des jetons « ligne d'entraide » encore valides, par petits lots.
 * Incident du 28/09/2026 : un lot de 150 UUID a échoué côté transport
 * (« error sending request »). Lots de 50, nouvelle tentative bornée pour les
 * seules erreurs de transport ou transitoires ; une erreur de droits ou de
 * schéma est levée tout de suite. L'appelant arrête la campagne avant tout
 * envoi si cette fonction lève.
 */
export const LINE_TOKEN_CHUNK = 50;
const MAX_ATTEMPTS = 3;

type Err = { message?: string; code?: string; status?: number } | null;
type Page = { data: Array<{ profile_id: string; token: string }> | null; error: Err };
type Client = {
  from: (t: string) => {
    select: (s: string) => {
      in: (c: string, v: string[]) => {
        is: (c: string, v: null) => { gt: (c: string, v: string) => PromiseLike<Page> };
      };
    };
  };
};

export function isTransientError(error: Err | unknown): boolean {
  if (!error) return false;
  const e = error as { message?: string; code?: string; status?: number };
  const status = Number(e.status ?? 0);
  if (status === 408 || status === 429 || status >= 500) return true;
  const msg = String(e.message ?? error);
  if (/permission denied|does not exist|column|42501|42P01|42703|PGRST2/i.test(msg + " " + (e.code ?? ""))) return false;
  return /error sending request|fetch failed|network|timeout|timed out|ECONNRESET|connection (reset|closed)|socket|57014/i.test(msg + " " + (e.code ?? ""));
}

export async function lookupActiveLineTokens(
  client: Client,
  profileIds: string[],
  nowIso: string,
  opts: { chunk?: number; wait?: (ms: number) => Promise<void> } = {},
): Promise<Map<string, string>> {
  const chunk = opts.chunk ?? LINE_TOKEN_CHUNK;
  const wait = opts.wait ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
  const ids = [...new Set(profileIds)];
  const out = new Map<string, string>();
  for (let i = 0; i < ids.length; i += chunk) {
    const slice = ids.slice(i, i + chunk);
    let lastError: unknown = null;
    let ok = false;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      let res: Page;
      try {
        res = await client.from("helps_line_tokens").select("profile_id, token")
          .in("profile_id", slice).is("revoked_at", null).gt("expires_at", nowIso);
      } catch (e) {
        res = { data: null, error: { message: String((e as Error)?.message ?? e) } };
      }
      if (!res.error) {
        for (const r of res.data ?? []) out.set(r.profile_id, r.token);
        ok = true;
        break;
      }
      lastError = res.error;
      if (!isTransientError(res.error) || attempt === MAX_ATTEMPTS) break;
      await wait(300 * attempt);
    }
    if (!ok) {
      const msg = (lastError as { message?: string })?.message ?? String(lastError);
      throw new Error(`line token lookup failed: ${msg}`);
    }
  }
  return out;
}
