import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { startCronRun } from "../_shared/cron-run-log.ts";
import { type BreedFicheCandidate } from "../_shared/breeds/breedFicheMatch.ts";
import { resolveSitPrepLinks } from "../_shared/breeds/sitPrepLinks.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function dateOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
  const run = await startCronRun("send-rappel-j7");

  try {
    // Fenetre de rattrapage : J+5 a J+7. Le flag reminder_j7_sent reste
    // la garantie anti doublon, un run rate un jour est rattrape le lendemain.
    const windowStart = dateOffset(5);
    const windowEnd = dateOffset(7);

    const { data: sits } = await supabase
      .from("sits")
      .select("id, title, start_date, user_id, city, properties:property_id (pets (species, breed))")
      .eq("status", "confirmed")
      .eq("reminder_j7_sent", false)
      .gte("start_date", windowStart)
      .lte("start_date", windowEnd);

    // Deux requetes pour tout le run, pas une par garde.
    const cities = Array.from(
      new Set((sits || []).map((s: any) => s.city).filter((c: unknown): c is string => Boolean(c))),
    );
    let breedCandidates: BreedFicheCandidate[] = [];
    const guideByCity = new Map<string, { slug: string; city: string }>();
    if ((sits || []).length > 0) {
      const { data: breeds } = await supabase.from("breed_profiles").select("species, breed");
      breedCandidates = (breeds || []) as BreedFicheCandidate[];
      if (cities.length > 0) {
        const { data: guides } = await supabase
          .from("city_guides")
          .select("slug, city")
          .eq("published", true)
          .in("city", cities);
        for (const g of guides || []) {
          guideByCity.set((g.city as string).toLowerCase(), { slug: g.slug as string, city: g.city as string });
        }
      }
    }

    let sent = 0;
    const errors: string[] = [];



    for (const sit of sits || []) {
      try {
        const { data: apps } = await supabase
          .from("applications")
          .select("sitter_id")
          .eq("sit_id", sit.id)
          .eq("status", "accepted");
        const sitterId = apps?.[0]?.sitter_id ?? null;

        const { data: ownerProfile } = await supabase
          .from("profiles").select("first_name, email").eq("id", sit.user_id).maybeSingle();
        const sitterProfile = sitterId
          ? (await supabase.from("profiles").select("first_name, email").eq("id", sitterId).maybeSingle()).data
          : null;

        const startDateFr = new Date(sit.start_date).toLocaleDateString("fr-FR", {
          day: "numeric", month: "long", year: "numeric",
        });

        const invokeSend = async (payload: Record<string, unknown>) => {
          const res = await fetch(`${SUPABASE_URL}/functions/v1/send-transactional-email`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${SERVICE_KEY}`,
            },
            body: JSON.stringify(payload),
          });
          if (res.ok) sent++;
          else console.error("[rappel-j7] send failed", res.status, await res.text().catch(() => ""));
        };

        if (ownerProfile?.email) {
          await invokeSend({
            templateName: "sit-reminder-j7",
            recipientEmail: ownerProfile.email,
            idempotencyKey: `sit-reminder-j7-owner-${sit.id}`,
            templateData: {
              firstName: ownerProfile.first_name || "",
              role: "owner",
              counterpartFirstName: sitterProfile?.first_name || "",
              sitTitle: sit.title,
              startDateFr,
              sitId: sit.id,
            },
          });
        }

        if (sitterProfile?.email) {
          const prep = resolveSitPrepLinks(
            ((sit as any).properties?.pets ?? []) as Array<{ species?: string | null; breed?: string | null }>,
            breedCandidates,
            guideByCity.get(String((sit as any).city || "").toLowerCase()) ?? null,
          );
          await invokeSend({
            templateName: "sit-reminder-j7",
            recipientEmail: sitterProfile.email,
            idempotencyKey: `sit-reminder-j7-sitter-${sit.id}`,
            templateData: {
              firstName: sitterProfile.first_name || "",
              role: "sitter",
              counterpartFirstName: ownerProfile?.first_name || "",
              sitTitle: sit.title,
              startDateFr,
              sitId: sit.id,
              ...prep,
            },
          });
        }


        // Le flag est pose apres les envois uniquement.
        await supabase.from("sits").update({ reminder_j7_sent: true }).eq("id", sit.id);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error("[rappel-j7] sit failed", sit.id, msg);
        errors.push(`${sit.id}: ${msg}`);
        // Flag non pose : la garde sera retentee au prochain run.
      }
    }

    await run.finish(errors.length > 0 ? "partial" : "success", {
      sent,
      errors: errors.length,
      error_samples: errors.slice(0, 5),
      window: { start: windowStart, end: windowEnd },
    });
    return new Response(JSON.stringify({ sent, errors: errors.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    await run.fail(e);
    throw e;
  }
});
