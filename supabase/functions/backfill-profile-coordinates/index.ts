/**
 * Backfill latitude/longitude des profils à partir du code postal.
 *
 * Source : api-adresse.data.gouv.fr (BAN — Base Adresse Nationale).
 * Gratuit, illimité, officiel, sans clé. Couvre 100 % des CP français.
 *
 * Sécurité : réservé aux admins (vérification has_role).
 *
 * Idempotent : ne touche QUE les profils où latitude OU longitude est null
 * et où postal_code est non-vide. Relancer = no-op pour les profils déjà OK.
 *
 * Stratégie :
 *  - on récupère les profils par lots de 50,
 *  - pour chaque postal_code unique, on fait UN seul appel BAN,
 *  - on cache en mémoire pendant le run pour éviter les doublons,
 *  - on UPDATE par batch.
 *
 * Retour : { processed, updated, skipped, errors, duration_ms }
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Coord = { lat: number; lng: number; city: string | null };

async function geocodePostal(postal: string): Promise<Coord | null> {
  // BAN : ?q=<cp>&type=municipality renvoie la commune principale du CP.
  const url = `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(
    postal,
  )}&type=municipality&limit=1`;
  const res = await fetch(url, { headers: { "User-Agent": "Guardiens-Backfill/1.0" } });
  if (!res.ok) return null;
  const json = await res.json();
  const feat = json?.features?.[0];
  if (!feat?.geometry?.coordinates) return null;
  const [lng, lat] = feat.geometry.coordinates;
  if (typeof lat !== "number" || typeof lng !== "number") return null;
  return {
    lat,
    lng,
    city: feat.properties?.city ?? feat.properties?.name ?? null,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const started = Date.now();

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // ── Auth : on exige un caller admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: isAdmin } = await userClient.rpc("has_role", {
      _user_id: userData.user.id,
      _role: "admin",
    });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Backfill avec privilèges service
    const admin = createClient(supabaseUrl, serviceKey);

    const body = await req.json().catch(() => ({}));
    const dryRun: boolean = body?.dryRun === true;
    const limit: number = Math.min(Number(body?.limit) || 1000, 5000);

    const { data: profiles, error: fetchErr } = await admin
      .from("profiles")
      .select("id, postal_code")
      .or("latitude.is.null,longitude.is.null")
      .not("postal_code", "is", null)
      .neq("postal_code", "")
      .limit(limit);

    if (fetchErr) throw fetchErr;
    const list = profiles ?? [];

    const cache = new Map<string, Coord | null>();
    let updated = 0;
    let skipped = 0;
    let errors = 0;

    for (const p of list) {
      const cp = String(p.postal_code).trim();
      if (!/^\d{5}$/.test(cp)) {
        skipped++;
        continue;
      }
      let coord: Coord | null;
      if (cache.has(cp)) {
        coord = cache.get(cp)!;
      } else {
        try {
          coord = await geocodePostal(cp);
        } catch {
          coord = null;
        }
        cache.set(cp, coord);
        // Politesse réseau — BAN n'a pas de quota strict mais on évite le burst
        await new Promise((r) => setTimeout(r, 30));
      }
      if (!coord) {
        skipped++;
        continue;
      }
      if (dryRun) {
        updated++;
        continue;
      }
      const { error: upErr } = await admin
        .from("profiles")
        .update({ latitude: coord.lat, longitude: coord.lng })
        .eq("id", p.id);
      if (upErr) {
        errors++;
      } else {
        updated++;
      }
    }

    return new Response(
      JSON.stringify({
        processed: list.length,
        updated,
        skipped,
        errors,
        unique_postal_codes: cache.size,
        dry_run: dryRun,
        duration_ms: Date.now() - started,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: String(e?.message ?? e), duration_ms: Date.now() - started }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
