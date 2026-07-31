// Diagnostic en lecture seule : prouve, depuis l'intérieur d'une fonction
// déployée, ce que la barrière décide à l'exécution. N'expédie rien.
import { evaluateSend } from "../_shared/resend-guard.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const mode = Deno.env.get("EMAIL_DELIVERY_MODE");
  const harness = Deno.env.get("EMAIL_TEST_HARNESS");

  const cases: Record<string, unknown> = {
    real_guardiens_fr: evaluateSend({
      functionName: "email-guard-selftest",
      recipients: ["contact@guardiens.fr"],
    }),
    real_gmail: evaluateSend({
      functionName: "email-guard-selftest",
      recipients: ["exemple@gmail.com"],
    }),
    reserved_invalid: evaluateSend({
      functionName: "email-guard-selftest",
      recipients: ["qa@guardiens-test.invalid"],
    }),
  };

  return new Response(
    JSON.stringify({
      runtime: {
        EMAIL_DELIVERY_MODE_present: mode !== undefined,
        EMAIL_DELIVERY_MODE_value: mode ?? null,
        EMAIL_TEST_HARNESS: harness ?? null,
      },
      decisions: cases,
      note: "Aucun envoi déclenché, évaluation pure.",
    }, null, 2),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
