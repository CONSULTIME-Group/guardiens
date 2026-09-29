/**
 * Météo d'Alma, une fois par jour et par personne au plus (lot P1).
 * Persistance locale datée (jour UTC) et appel différé après l'affichage.
 */
import { supabase } from "@/integrations/supabase/client";

const KEY = "alma_weather_day";
const inflight = new Map<string, Promise<string | null>>();

const today = (now = new Date()) => now.toISOString().slice(0, 10);

export function readCachedWeather(userId: string, now = new Date()): { hit: boolean; value: string | null } {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { hit: false, value: null };
    const v = JSON.parse(raw) as { day: string; user: string; condition: string | null };
    if (v.day === today(now) && v.user === userId) return { hit: true, value: v.condition ?? null };
  } catch { /* stockage indisponible */ }
  return { hit: false, value: null };
}

function writeCachedWeather(userId: string, condition: string | null) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ day: today(), user: userId, condition }));
  } catch { /* sans effet */ }
}

export function afterIdle(delayMs = 2000): Promise<void> {
  return new Promise((resolve) => {
    const w = typeof window !== "undefined" ? (window as any) : null;
    if (w?.requestIdleCallback) w.requestIdleCallback(() => resolve(), { timeout: delayMs });
    else setTimeout(resolve, delayMs);
  });
}

export async function getDailyWeather(userId: string, opts: { defer?: boolean } = {}): Promise<string | null> {
  const cached = readCachedWeather(userId);
  if (cached.hit) return cached.value;
  const existing = inflight.get(userId);
  if (existing) return existing;
  const p = (async () => {
    if (opts.defer !== false) await afterIdle();
    let condition: string | null = null;
    try {
      const { data } = await supabase.functions.invoke("alma-weather", { body: {} });
      const c = (data as any)?.condition;
      condition = typeof c === "string" ? c : null;
      writeCachedWeather(userId, condition);
    } catch {
      condition = null;
    }
    return condition;
  })();
  inflight.set(userId, p);
  try { return await p; } finally { inflight.delete(userId); }
}
