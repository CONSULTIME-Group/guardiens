import { supabase } from "@/integrations/supabase/client";

/**
 * Sélection intelligente de la photo de couverture.
 * Appelle l'edge function `analyze-photo-quality` pour scorer les URLs fournies
 * et retourne la mieux notée. En cas d'erreur, quota ou rate-limit, retombe
 * silencieusement sur `fallback` — ne jette jamais, ne bloque jamais.
 *
 * Cache en mémoire (module-level) par signature de galerie pour éviter
 * de rescorer les mêmes photos plusieurs fois dans la même session.
 */
type Scored = { url: string; score: number };

const memo = new Map<string, string | null>();
const SOFT_FAIL_CODES = new Set(["DAILY_QUOTA_REACHED", "AI_RATE_LIMITED"]);

function signature(urls: string[]): string {
  return urls.slice().sort().join("|");
}

export async function pickSmartCover(
  urls: string[],
  fallback: string | null,
): Promise<string | null> {
  if (!urls || urls.length === 0) return fallback;
  if (urls.length === 1) return urls[0];

  const key = signature(urls);
  if (memo.has(key)) return memo.get(key) ?? fallback;

  // Cap à 6 photos (identique à SitPhotoManager) pour maîtriser le coût IA.
  const sample = urls.slice(0, 6);

  try {
    const { data, error } = await supabase.functions.invoke("analyze-photo-quality", {
      body: { imageUrls: sample },
    });
    if (error) {
      const ctx: any = (error as any).context;
      const code = ctx?.code ?? (data as any)?.code;
      if (code && SOFT_FAIL_CODES.has(code)) {
        memo.set(key, fallback);
        return fallback;
      }
      // Toute autre erreur → soft fail
      return fallback;
    }
    const arr: unknown = (data as any)?.results;
    if (!Array.isArray(arr) || arr.length === 0) return fallback;
    const scored: Scored[] = arr
      .filter((r: any) => r && typeof r.score === "number" && typeof r.url === "string")
      .map((r: any) => ({ url: r.url, score: r.score }));
    if (scored.length === 0) return fallback;
    scored.sort((a, b) => b.score - a.score);
    const best = scored[0].url;
    memo.set(key, best);
    return best;
  } catch {
    return fallback;
  }
}
