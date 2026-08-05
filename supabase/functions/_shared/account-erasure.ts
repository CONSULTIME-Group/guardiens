// Helper partagé aux 3 chemins d'effacement de compte :
//   - self-delete-account (l'utilisateur supprime son compte)
//   - admin-delete-account (demande RGPD reçue hors plateforme, traitée par un admin)
//   - purge-deleted-accounts (cron sur les demandes planifiées)
//
// Deux obligations de conformité, dans cet ordre :
//   1. Accusé de traitement au demandeur (preuve attendue par la CNIL). Le
//      template `account-deleted` figure dans SUPPRESSION_BYPASS_TEMPLATES : il
//      part même si l'adresse est déjà dans suppressed_emails (cas d'une
//      personne désinscrite avant de demander l'effacement).
//   2. Ajout de l'email à suppressed_emails avec le motif `account_deleted`
//      (ceinture de sécurité anti ré-envoi), motif autorisé par la contrainte
//      suppressed_emails_reason_check.

import type { SuppressionReason } from "./email-suppression.ts";

// deno-lint-ignore no-explicit-any
type Client = any;

const ERASURE_REASON: SuppressionReason = "account_deleted";

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
        reason: ERASURE_REASON,
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

// ---------------------------------------------------------------------------
// Anonymisation (remplace l'ancienne suppression destructive)
// ---------------------------------------------------------------------------
//
// Les avis, conversations et messages appartiennent aussi aux tiers : les
// détruire priverait un membre resté actif de sa réputation et de son
// historique, et permettrait d'effacer ses avis négatifs en recréant un compte.
// On conserve donc la ligne profiles, rendue anonyme, et on neutralise le
// compte d'authentification sans le détruire.

/** Buckets contenant des fichiers personnels, préfixés par l'identifiant du membre. */
export const PERSONAL_BUCKETS = [
  "avatars",
  "property-photos",
  "sitter-gallery",
  "pro-logos",
  "pro-documents",
  "experience-screenshots",
  "identity-documents",
] as const;

/** Adresse technique unique, dérivée de l'identifiant, jamais délivrable. */
export function technicalEmail(userId: string): string {
  return `deleted+${userId}@guardiens.invalid`;
}

/** Engagements qui interdisent l'effacement (règle serveur, alignée sur le client). */
export async function countActiveCommitments(
  adminClient: Client,
  userId: string,
): Promise<{ sits: number; applications: number; total: number }> {
  const [{ count: sitsCount }, { count: appsCount }] = await Promise.all([
    adminClient
      .from("sits")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .in("status", ["confirmed", "in_progress"]),
    adminClient
      .from("applications")
      .select("id", { count: "exact", head: true })
      .eq("sitter_id", userId)
      .in("status", ["pending", "accepted"]),
  ]);
  const sits = sitsCount ?? 0;
  const applications = appsCount ?? 0;
  return { sits, applications, total: sits + applications };
}

async function listBucketPaths(
  adminClient: Client,
  bucket: string,
  prefix: string,
  depth = 0,
): Promise<string[]> {
  if (depth > 3) return [];
  const { data, error } = await adminClient.storage
    .from(bucket)
    .list(prefix, { limit: 1000 });
  if (error || !data) return [];
  const paths: string[] = [];
  for (const entry of data as { name: string; id: string | null }[]) {
    const full = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.id === null) {
      paths.push(...(await listBucketPaths(adminClient, bucket, full, depth + 1)));
    } else {
      paths.push(full);
    }
  }
  return paths;
}

/** Supprime tous les fichiers du membre. Journalise les échecs plutôt que de les taire. */
export async function purgeUserStorage(
  adminClient: Client,
  userId: string,
): Promise<{ removed: number; failures: { bucket: string; reason: string }[] }> {
  let removed = 0;
  const failures: { bucket: string; reason: string }[] = [];

  for (const bucket of PERSONAL_BUCKETS) {
    try {
      const paths = await listBucketPaths(adminClient, bucket, userId);
      if (paths.length === 0) continue;
      const { data, error } = await adminClient.storage.from(bucket).remove(paths);
      if (error) {
        failures.push({ bucket, reason: error.message });
        console.error(`[account-erasure] purge ${bucket} échouée`, error.message);
        continue;
      }
      removed += (data as unknown[] | null)?.length ?? paths.length;
    } catch (e) {
      failures.push({ bucket, reason: String(e) });
      console.error(`[account-erasure] purge ${bucket} en erreur`, String(e));
    }
  }

  return { removed, failures };
}

export interface AnonymizeOutcome {
  userId: string;
  email: string | null;
  acknowledged: boolean;
  suppressed: boolean;
  storageRemoved: number;
  storageFailures: { bucket: string; reason: string }[];
  authNeutralized: boolean;
  archivedSits: number;
  cancelledMissions: number;
}

/**
 * Chemin unique d'effacement, partagé par self-delete-account,
 * admin-delete-account et purge-deleted-accounts.
 *
 * Ordre imposé : lecture de l'email et du prénom, accusé de traitement,
 * puis anonymisation.
 */
export async function anonymizeAccount(
  adminClient: Client,
  userId: string,
  opts: {
    fallbackEmail?: string | null;
    source: string;
    metadata?: Record<string, unknown>;
  },
): Promise<AnonymizeOutcome> {
  // 1. Identité lisible, avant toute écriture.
  const { data: prof } = await adminClient
    .from("profiles")
    .select("email, first_name")
    .eq("id", userId)
    .maybeSingle();
  const email =
    (prof as { email?: string } | null)?.email ?? opts.fallbackEmail ?? null;
  const firstName = (prof as { first_name?: string } | null)?.first_name ?? null;

  // 2. Accusé de traitement RGPD, puis liste de blocage.
  const { acknowledged, suppressed } = await finalizeErasure(adminClient, email, {
    firstName,
    metadata: { source: opts.source, user_id: userId, ...(opts.metadata ?? {}) },
  });

  // 3. Purge du stockage, avant l'anonymisation (les chemins restent lisibles).
  const { removed, failures } = await purgeUserStorage(adminClient, userId);

  // 4. Anonymisation transactionnelle en base.
  const newEmail = technicalEmail(userId);
  const { data: rpcData, error: rpcErr } = await adminClient.rpc(
    "anonymize_user_account",
    { _user_id: userId, _new_email: newEmail },
  );
  if (rpcErr) throw new Error(`Anonymisation impossible : ${rpcErr.message}`);
  const summary = (rpcData ?? {}) as {
    archived_sits?: number;
    cancelled_missions?: number;
  };

  // 5. Neutralisation du compte d'authentification, sans destruction :
  //    l'adresse d'origine redevient utilisable pour une nouvelle inscription.
  let authNeutralized = true;
  const { error: authErr } = await adminClient.auth.admin.updateUserById(userId, {
    email: newEmail,
    email_confirm: true,
    phone: null,
    ban_duration: "876000h",
    user_metadata: { deleted: true, deleted_at: new Date().toISOString() },
  });
  if (authErr) {
    authNeutralized = false;
    console.error("[account-erasure] neutralisation auth échouée", authErr.message);
  }

  return {
    userId,
    email,
    acknowledged,
    suppressed,
    storageRemoved: removed,
    storageFailures: failures,
    authNeutralized,
    archivedSits: summary.archived_sits ?? 0,
    cancelledMissions: summary.cancelled_missions ?? 0,
  };
}

