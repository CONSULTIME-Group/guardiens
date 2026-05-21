/**
 * geocode-profile
 *
 * Appelée par un trigger Postgres (pg_net) à chaque modification de
 * `profiles.city` ou `profiles.postal_code` afin de renseigner
 * `latitude` / `longitude` à partir de l'API gouvernementale d'adresses
 * (api-adresse.data.gouv.fr).
 *
 * Body attendu : { user_id: uuid }
 *
 * Sécurité :
 *   - Pas de JWT (verify_jwt = false) car appelée depuis pg_net.
 *   - Vérifie un secret partagé GEOCODE_PROFILE_SECRET dans l'en-tête
 *     `x-geocode-secret` pour empêcher tout appel externe non autorisé.
 *   - Utilise la service_role pour lire/écrire le profil (bypass RLS).
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-geocode-secret",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const secret = Deno.env.get("GEOCODE_PROFILE_SECRET");
    if (secret && req.headers.get("x-geocode-secret") !== secret) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { user_id } = await req.json();
    if (!user_id || typeof user_id !== "string") {
      return new Response(JSON.stringify({ error: "missing user_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: profile, error: pErr } = await supabase
      .from("profiles")
      .select("city, postal_code")
      .eq("id", user_id)
      .maybeSingle();

    if (pErr || !profile) {
      return new Response(JSON.stringify({ error: "profile not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const city = (profile.city ?? "").trim();
    const postal = (profile.postal_code ?? "").trim();
    if (!city) {
      return new Response(JSON.stringify({ skipped: "no city" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const params = new URLSearchParams({ q: city, limit: "1" });
    if (postal) params.set("postcode", postal);

    const r = await fetch(`https://api-adresse.data.gouv.fr/search/?${params}`, {
      headers: { "User-Agent": "Guardiens/1.0 (geocode-profile)" },
    });
    if (!r.ok) {
      return new Response(JSON.stringify({ error: `adresse api ${r.status}` }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const json = await r.json();
    const feat = json?.features?.[0];
    if (!feat) {
      return new Response(JSON.stringify({ skipped: "no result", city, postal }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const [lng, lat] = feat.geometry.coordinates;

    const { error: uErr } = await supabase
      .from("profiles")
      .update({ latitude: lat, longitude: lng })
      .eq("id", user_id);

    if (uErr) {
      return new Response(JSON.stringify({ error: uErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true, lat, lng }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
