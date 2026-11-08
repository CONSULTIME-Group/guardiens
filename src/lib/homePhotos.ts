/**
 * Lot PHOTO1 (08/11/2026) : photos du logement, côté site.
 * Règles pures dans supabase/functions/_shared/home-photo-insight.ts.
 */
import { supabase } from "@/integrations/supabase/client";
import {
  homePhotoGap,
  homePhotoTip,
  toHomePhotoInsight,
  type HomePhotoGap,
  type HomePhotoInsight,
} from "../../supabase/functions/_shared/home-photo-insight.ts";

export {
  HOME_PHOTO_MIN_COUNT,
  homePhotoGap,
  homePhotoTip,
  type HomePhotoGap,
  type HomePhotoInsight,
} from "../../supabase/functions/_shared/home-photo-insight.ts";

/** Délai au-delà duquel l'analyse est abandonnée côté site (le relevé peut arriver plus tard). */
export const HOME_PHOTO_ANALYSIS_TIMEOUT_MS = 20_000;

export interface HomePhotoAnalysis {
  insight: HomePhotoInsight;
  tip: string | null;
}

/**
 * Analyse une photo qui vient de rejoindre la galerie et enregistre ce qu'elle
 * montre. Toute erreur, quota atteint compris, renvoie null : l'ajout de la
 * photo reste acquis.
 */
export async function analyzeHomePhoto(
  userId: string,
  url: string,
  timeoutMs = HOME_PHOTO_ANALYSIS_TIMEOUT_MS,
): Promise<HomePhotoAnalysis | null> {
  try {
    const call = supabase.functions.invoke("analyze-photo-quality", {
      body: { imageUrl: url, persist: true },
    });
    const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs));
    const res = (await Promise.race([call, timeout])) as { data?: unknown; error?: unknown } | null;
    if (!res || res.error || !res.data) return null;
    const insight = toHomePhotoInsight(userId, { ...(res.data as Record<string, unknown>), url });
    if (!insight) return null;
    return { insight, tip: homePhotoTip(insight) };
  } catch {
    return null;
  }
}

/** Attente maximale de la lecture des relevés avant publication. */
export const HOME_PHOTO_READ_TIMEOUT_MS = 3_000;

/** Relevés des photos d'une annonce, en une lecture. Erreur ou attente : liste vide. */
export async function fetchHomePhotoInsights(
  userId: string,
  urls: readonly string[],
  timeoutMs = HOME_PHOTO_READ_TIMEOUT_MS,
): Promise<Array<Pick<HomePhotoInsight, "photo_url" | "shows_home">>> {
  const list = urls.filter((u) => typeof u === "string" && u.trim() !== "");
  if (list.length === 0) return [];
  try {
    const read = supabase
      .from("owner_gallery_insights" as never)
      .select("photo_url, shows_home")
      .eq("user_id", userId)
      .in("photo_url", list.slice(0, 50));
    const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs));
    const res = (await Promise.race([read, timeout])) as { data?: unknown; error?: unknown } | null;
    if (!res) return [];
    const { data, error } = res;
    if (error || !Array.isArray(data)) return [];
    return data as Array<Pick<HomePhotoInsight, "photo_url" | "shows_home">>;
  } catch {
    return [];
  }
}

/** Ce qui manque aux photos d'une annonce, lecture comprise. */
export async function loadHomePhotoGap(userId: string, urls: readonly string[]): Promise<HomePhotoGap> {
  const list = urls.filter((u) => typeof u === "string" && u.trim() !== "");
  if (homePhotoGap(list, []) !== "none") return homePhotoGap(list, []);
  return homePhotoGap(list, await fetchHomePhotoInsights(userId, list));
}
