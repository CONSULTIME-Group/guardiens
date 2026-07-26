// Helper partagé aux 3 chemins d'effacement de compte :
//   - self-delete-account (l'utilisateur supprime son compte)
//   - admin-delete-account (demande RGPD reçue hors plateforme, traitée par un admin)
//   - purge-deleted-accounts (cron sur les demandes planifiées)
//
// Deux obligations de conformité, dans cet ordre :
//   1. Accusé de traitement au demandeur (preuve attendue par la CNIL),
//      envoyé AVANT l'ajout à suppressed_emails sinon le pipeline le bloquerait.
//   2. Ajout de l'email à suppressed_emails (ceinture de sécurité anti ré-envoi).

// deno-lint-ignore no-explicit-any
type Client = any;

export async function sendErasureAcknowledgement(
  email: string | null | undefined,
  firstName?: string | null,
): Promise<boolean> {
  if (!email) return false;
  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  try {
    const resp = await fetch(`${url}/functions/v1/send-transactional-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceKey}`,
        apikey: serviceKey,
      },
      body: JSON.stringify({
        templateName: "account-deleted",
        recipientEmail: email,
        idempotencyKey: `account-deleted-${email.toLowerCase()}-${new Date()
          .toISOString()
          .slice(0, 10)}`,
        templateData: { firstName: firstName ?? "" },
        logMetadata: { reason: "gdpr_erasure" },
      }),
    });
    if (!resp.ok) {
      console.error("[account-erasure] accusé non envoyé", resp.status, await resp.text());
      return false;
    }
    return true;
  } catch (e) {
    console.error("[account-erasure] accusé en erreur", String(e));
    return false;
  }
}

export async function suppressEmail(
  adminClient: Client,
  email: string | null | undefined,
  metadata: Record<string, unknown> = {},
): Promise<boolean> {
  if (!email) return false;
  const { error } = await adminClient
    .from("suppressed_emails")
    .upsert(
      {
        email: email.toLowerCase(),
        reason: "account_deleted",
        metadata: { ...metadata, suppressed_at: new Date().toISOString() },
      },
      { onConflict: "email" },
    );
  if (error) {
    console.error("[account-erasure] suppression email échouée", error.message);
    return false;
  }
  return true;
}

/** Accusé de traitement puis mise en liste de suppression. */
export async function finalizeErasure(
  adminClient: Client,
  email: string | null | undefined,
  opts: { firstName?: string | null; metadata?: Record<string, unknown> } = {},
): Promise<{ acknowledged: boolean; suppressed: boolean }> {
  const acknowledged = await sendErasureAcknowledgement(email, opts.firstName);
  const suppressed = await suppressEmail(adminClient, email, opts.metadata ?? {});
  return { acknowledged, suppressed };
}
