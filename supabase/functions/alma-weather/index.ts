// Météo d'ambiance pour l'humeur d'Alma (lot 2).
//
// Open-Meteo, aucune clé d'API. Appel serveur uniquement.
// Les coordonnées de la personne sont ARRONDIES AU DIXIÈME DE DEGRÉ avant
// tout appel sortant : on transmet une zone, jamais une adresse.
// Cache de trois heures par zone arrondie (public.alma_weather_cache).
//
// Sortie : { condition, temperature } ou { condition: null } si rien de fiable.
// Un échec ne bloque jamais le dock : le client se rabat sur l'heure et la saison.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { CORS_HEADERS } from "../_shared/ai-gateway.ts";

const CACHE_TTL_MS = 3 * 60 * 60 * 1000;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

/** Traduit le code Open-Meteo et les mesures en condition d'ambiance. */
export function mapWeather(input: {
  code: number | null;
  precipitation: number | null;
  wind: number | null;
  temperature: number | null;
}): string {
  const { code, precipitation, wind, temperature } = input;
  if (code !== null && code >= 71 && code <= 77) return "neige";
  if ((precipitation ?? 0) > 0.1) return "pluie";
  if (code !== null && ((code >= 51 && code <= 67) || (code >= 80 && code <= 99))) return "pluie";
  if ((wind ?? 0) >= 30) return "vent";
  if (temperature !== null && temperature <= 5) return "froid";
  if (code !== null && code <= 1) return "clair";
  return "nuageux";
}

/** Zone arrondie au dixième de degré, seule granularité transmise. */
export function zoneKey(lat: number, lon: number): string {
  return `${(Math.round(lat * 10) / 10).toFixed(1)},${(Math.round(lon * 10) / 10).toFixed(1)}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      {
        global: { headers: { Authorization: authHeader } },
        auth: { persistSession: false, autoRefreshToken: false },
      },
    );
    const { data: u, error: ue } = await userClient.auth.getUser();
    if (ue || !u?.user) return json({ error: "Unauthorized" }, 401);

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    const { data: profile } = await adminClient
      .from("profiles")
      .select("latitude, longitude")
      .eq("id", u.user.id)
      .maybeSingle();

    const lat = (profile as any)?.latitude;
    const lon = (profile as any)?.longitude;
    if (typeof lat !== "number" || typeof lon !== "number") {
      return json({ condition: null });
    }

    const key = zoneKey(lat, lon);

    const { data: cached } = await adminClient
      .from("alma_weather_cache")
      .select("condition, temperature, fetched_at")
      .eq("zone_key", key)
      .maybeSingle();

    if (cached && Date.now() - new Date((cached as any).fetched_at).getTime() < CACHE_TTL_MS) {
      return json({
        condition: (cached as any).condition,
        temperature: (cached as any).temperature,
        cached: true,
      });
    }

    const [zLat, zLon] = key.split(",");
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${zLat}&longitude=${zLon}` +
      `&current=temperature_2m,precipitation,weather_code,wind_speed_10m`;

    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return json({ condition: null });
    const payload = await res.json();
    const current = payload?.current ?? {};

    const condition = mapWeather({
      code: typeof current.weather_code === "number" ? current.weather_code : null,
      precipitation: typeof current.precipitation === "number" ? current.precipitation : null,
      wind: typeof current.wind_speed_10m === "number" ? current.wind_speed_10m : null,
      temperature: typeof current.temperature_2m === "number" ? current.temperature_2m : null,
    });
    const temperature =
      typeof current.temperature_2m === "number" ? current.temperature_2m : null;

    await adminClient
      .from("alma_weather_cache")
      .upsert(
        { zone_key: key, condition, temperature, fetched_at: new Date().toISOString() },
        { onConflict: "zone_key" },
      );

    return json({ condition, temperature, cached: false });
  } catch (e) {
    console.error("alma-weather error", e);
    return json({ condition: null });
  }
});
