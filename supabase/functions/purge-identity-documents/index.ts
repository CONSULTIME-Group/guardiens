/**
 * purge-identity-documents
 *
 * Cron quotidien : purge du bucket `identity-documents` les pièces dont la
 * décision (verified ou rejected) date de plus de 30 jours. La preuve de
 * vérification est conservée via `identity_verification_status` sur le profil
 * et l'historique dans `identity_verification_logs` (qui ne contiennent pas
 * le document lui-même). Les dossiers en attente ou sans décision ne sont
 * JAMAIS touchés.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { startCronRun } from "../_shared/cron-run-log.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const RETENTION_DAYS = 30;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  const run = await startCronRun("purge-identity-documents");
  try {
    const service = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data, error } = await service.rpc("list_identity_documents_to_purge", {
      _retention_days: RETENTION_DAYS,
    });
    if (error) throw error;

    const rows = (data ?? []) as Array<{
      user_id: string;
      object_name: string;
      decided_at: string;
      decision: string;
    }>;

    let removed = 0;
    let failed = 0;
    const users_touched = new Set<string>();
    const failures: Array<{ path: string; error: string }> = [];

    // Suppression par petits lots (Supabase Storage accepte des tableaux)
    const batchSize = 50;
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      const paths = batch.map((r) => r.object_name);
      const { data: removedData, error: rmErr } = await service.storage
        .from("identity-documents")
        .remove(paths);
      if (rmErr) {
        failed += batch.length;
        failures.push({ path: paths.join(","), error: rmErr.message });
        continue;
      }
      removed += removedData?.length ?? 0;
      for (const r of batch) users_touched.add(r.user_id);
    }

    // Nettoie les colonnes de chemin sur les profils correspondants pour éviter
    // d'exposer une URL signée pointant vers un objet supprimé.
    if (users_touched.size > 0) {
      const userIds = Array.from(users_touched);
      const { error: updErr } = await service
        .from("profiles")
        .update({
          identity_document_url: null,
          identity_selfie_url: null,
        })
        .in("id", userIds);
      if (updErr) {
        failures.push({ path: "profiles-cleanup", error: updErr.message });
      }
    }

    await run.finish(failed > 0 ? "partial" : "success", {
      candidates: rows.length,
      removed,
      failed,
      users_touched: users_touched.size,
      retention_days: RETENTION_DAYS,
    });

    return new Response(
      JSON.stringify({
        candidates: rows.length,
        removed,
        failed,
        users_touched: users_touched.size,
        failures,
        generated_at: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[purge-identity-documents]", err);
    await run.fail(err);
    return new Response(
      JSON.stringify({ error: String((err as Error)?.message ?? err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
