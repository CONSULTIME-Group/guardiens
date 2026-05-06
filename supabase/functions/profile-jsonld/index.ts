/**
 * Edge function — profile-jsonld
 * ==============================
 * Renvoie le JSON-LD (Person + Service + AggregateRating) d'un profil gardien
 * sous forme de bloc(s) `<script type="application/ld+json">` prêts à être
 * injectés dans le `<head>` HTML par le Cloudflare Worker.
 *
 * Avantage : le JSON-LD est SERVI EN SSR (depuis l'edge), donc Google le lit
 * sans avoir à exécuter le JavaScript de la SPA. Garantit l'éligibilité Rich
 * Results même si le crawler désactive JS.
 *
 * URL : https://<project>.functions.supabase.co/profile-jsonld?id=<uuid>
 *       Réponse : text/html (un ou deux <script type="application/ld+json">)
 *
 * Cohérence stricte avec src/components/seo/ProfileSchemaOrg.tsx :
 *   - aggregateRating sur Service (pas Person) — éligible Rich Results.
 *   - interactionType = https://schema.org/PerformAction (enum standard).
 *   - jobTitle conditionnel selon role.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SITE_ORIGIN = Deno.env.get("SITE_ORIGIN") || "https://guardiens.fr";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function escapeForScript(json: string): string {
  // Empêche la rupture du <script> par un éventuel "</" inattendu.
  return json.replace(/<\/(script)/gi, "<\\/$1");
}

function capitalize(s: string): string {
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const id = url.searchParams.get("id");

  if (!id || !UUID_RE.test(id)) {
    return new Response("", {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
    });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  });

  // ── 1. Profil ────────────────────────────────────────────────────────────
  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "id, first_name, role, city, postal_code, avatar_url, bio, identity_verified, completed_sits_count",
    )
    .eq("id", id)
    .maybeSingle();

  if (!profile) {
    return new Response("", {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
    });
  }

  // ── 2. Sitter profile (pour knowsAbout / motivation) ─────────────────────
  const { data: sitter } = await supabase
    .from("sitter_profiles")
    .select("animal_types, motivation")
    .eq("user_id", id)
    .maybeSingle();

  // ── 3. Avis publiés ──────────────────────────────────────────────────────
  const { data: reviews } = await supabase
    .from("reviews")
    .select("overall_rating, sit_id")
    .eq("reviewee_id", id)
    .eq("published", true)
    .eq("moderation_status", "valide")
    .neq("review_type", "annulation");

  const reviewList = reviews ?? [];
  const reviewCount = reviewList.length;
  const avgRating =
    reviewCount > 0
      ? reviewList.reduce(
          (s, r: any) => s + (Number(r.overall_rating) || 0),
          0,
        ) / reviewCount
      : 0;

  // Cohérence avec PublicSitterProfile : completedSits = max(compteur, gardeReviews)
  const gardeReviewsCount = reviewList.filter((r: any) => r.sit_id !== null)
    .length;
  const completedSits = Math.max(
    profile.completed_sits_count || 0,
    gardeReviewsCount,
  );

  const firstName = capitalize(profile.first_name || "");
  const role = profile.role as "sitter" | "owner" | "both" | undefined;
  const city = profile.city || "";
  const bio = (sitter?.motivation || profile.bio || "").slice(0, 200);
  const pageUrl = `${SITE_ORIGIN}/gardiens/${id}`;
  const avatarUrl = profile.avatar_url || undefined;
  const isSitter = role === "sitter" || role === "both";
  const hasRating = avgRating > 0 && reviewCount > 0;

  // ── Person ──────────────────────────────────────────────────────────────
  const person: Record<string, any> = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: firstName,
    url: pageUrl,
    ...(avatarUrl && { image: avatarUrl }),
    ...(bio && { description: bio }),
    ...(city && {
      address: {
        "@type": "PostalAddress",
        addressLocality: city,
        ...(profile.postal_code && { postalCode: profile.postal_code }),
        addressCountry: "FR",
      },
    }),
    ...(isSitter
      ? { jobTitle: "Gardien d'animaux de confiance" }
      : role === "owner"
      ? { jobTitle: "Propriétaire d'animaux" }
      : {}),
    ...(sitter?.animal_types?.length
      ? { knowsAbout: sitter.animal_types }
      : {}),
    ...(profile.identity_verified && {
      hasCredential: {
        "@type": "EducationalOccupationalCredential",
        credentialCategory: "Identity Verified",
        recognizedBy: { "@type": "Organization", name: "Guardiens" },
      },
    }),
  };

  // ── Service (porte aggregateRating, éligible Rich Results) ──────────────
  let serviceJson = "";
  if (isSitter) {
    const service: Record<string, any> = {
      "@context": "https://schema.org",
      "@type": "Service",
      serviceType: "Garde d'animaux à domicile (house-sitting)",
      provider: {
        "@type": "Person",
        name: firstName,
        url: pageUrl,
        ...(avatarUrl && { image: avatarUrl }),
      },
      ...(city && {
        areaServed: { "@type": "City", name: city, addressCountry: "FR" },
      }),
      ...(bio && { description: bio }),
      url: pageUrl,
    };
    if (hasRating) {
      service.aggregateRating = {
        "@type": "AggregateRating",
        ratingValue: Number(avgRating.toFixed(1)),
        reviewCount,
        bestRating: 5,
        worstRating: 1,
      };
    }
    if (completedSits > 0) {
      service.interactionStatistic = {
        "@type": "InteractionCounter",
        interactionType: "https://schema.org/PerformAction",
        userInteractionCount: completedSits,
        name: "Gardes réalisées",
      };
    }
    serviceJson = `<script type="application/ld+json">${escapeForScript(
      JSON.stringify(service),
    )}</script>`;
  }

  const personJson = `<script type="application/ld+json">${escapeForScript(
    JSON.stringify(person),
  )}</script>`;

  const html = personJson + serviceJson;

  return new Response(html, {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "text/html; charset=utf-8",
      // Cache CDN 5 min, navigateur 1 min — change vite après un nouvel avis.
      "Cache-Control": "public, max-age=60, s-maxage=300",
    },
  });
});
