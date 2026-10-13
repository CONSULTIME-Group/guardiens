// Effacement RGPD mené par un administrateur (lot X2).
//
// Deux entrées partagent ce circuit :
//   - admin-delete-account : demande reçue hors plateforme, recherchée par email ;
//   - admin-delete-user    : bouton « Supprimer définitivement » de la fiche membre.
//
// Les deux passent par anonymizeAccount (accusé, blocage de l'adresse, purge des
// fichiers, anonymisation, neutralisation auth), avec une trace dans
// account_deletion_requests et une ligne admin_action_logs. Aucun deleteUser :
// la cascade emportait les conversations et les avis des autres membres.
//
// recordDeletionRequest enregistre une demande « pending » (source admin) pour
// garder la date de réception et l'échéance d'un mois, même quand le compte est
// bloqué par une garde ou une candidature.

import {
  anonymizeAccount,
  countActiveCommitments,
  finalizeErasure,
  type AnonymizeOutcome,
} from "./account-erasure.ts";

// deno-lint-ignore no-explicit-any
type Client = any;

/** Délai de réponse RGPD (un mois), posé comme échéance de la demande. */
export const ADMIN_REQUEST_DELAY_DAYS = 30;

export type ErasureOrigin = "admin_gdpr_request" | "admin_users";

export interface ErasureDeps {
  anonymize: typeof anonymizeAccount;
  finalize: typeof finalizeErasure;
  countCommitments: typeof countActiveCommitments;
}

export const defaultErasureDeps: ErasureDeps = {
  anonymize: anonymizeAccount,
  finalize: finalizeErasure,
  countCommitments: countActiveCommitments,
};

export function normalizeEmail(email: string | null | undefined): string | null {
  const v = typeof email === "string" ? email.trim().toLowerCase() : "";
  return v && v.includes("@") ? v : null;
}

export function deadlineFrom(from: Date): Date {
  return new Date(from.getTime() + ADMIN_REQUEST_DELAY_DAYS * 24 * 60 * 60 * 1000);
}

export interface OpenRequest {
  id: string;
  status: string;
  requested_at: string | null;
  scheduled_deletion_at: string | null;
  user_id: string | null;
}

const REQUEST_COLUMNS = "id, status, requested_at, scheduled_deletion_at, user_id";

/**
 * Demande existante pour ce compte (une seule par user_id, contrainte UNIQUE),
 * ou, sans compte, dernière demande « pending » enregistrée pour cette adresse.
 */
export async function findRequest(
  client: Client,
  userId: string | null,
  email: string | null,
): Promise<OpenRequest | null> {
  if (userId) {
    const { data } = await client
      .from("account_deletion_requests")
      .select(REQUEST_COLUMNS)
      .eq("user_id", userId)
      .maybeSingle();
    if (data) return data as OpenRequest;
  }
  if (!email) return null;
  const { data } = await client
    .from("account_deletion_requests")
    .select(REQUEST_COLUMNS)
    .eq("requester_email", email)
    .is("user_id", null)
    .eq("status", "pending")
    .order("requested_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as OpenRequest | null) ?? null;
}

export interface RecordResult {
  requestId: string | null;
  created: boolean;
  status: string;
  requestedAt: string | null;
  scheduledDeletionAt: string | null;
  error?: string;
}

/**
 * Enregistre une demande d'effacement reçue hors plateforme, sans rien effacer.
 * Une demande déjà en attente est conservée telle quelle (la date de réception
 * fait foi). Toute autre ligne du même compte (annulée, ou « traitée » alors que
 * le compte vit encore) est rouverte, la contrainte UNIQUE(user_id) interdisant
 * une seconde ligne.
 */
export async function recordDeletionRequest(
  client: Client,
  input: {
    email: string | null;
    userId: string | null;
    callerId: string;
    notes?: string | null;
    now?: Date;
  },
): Promise<RecordResult> {
  const email = normalizeEmail(input.email);
  const existing = await findRequest(client, input.userId, email);

  if (existing && existing.status === "pending") {
    return {
      requestId: existing.id,
      created: false,
      status: existing.status,
      requestedAt: existing.requested_at,
      scheduledDeletionAt: existing.scheduled_deletion_at,
    };
  }

  const now = input.now ?? new Date();
  const row: Record<string, unknown> = {
    requester_email: email,
    source: "admin",
    status: "pending",
    requested_at: now.toISOString(),
    scheduled_deletion_at: deadlineFrom(now).toISOString(),
    cancelled_at: null,
    processed_by: null,
    processed_at: null,
  };
  const notes = typeof input.notes === "string" ? input.notes.trim() : "";
  if (notes) row.notes = notes;

  const query = existing
    ? client.from("account_deletion_requests").update(row).eq("id", existing.id)
    : client
        .from("account_deletion_requests")
        .insert({ ...row, user_id: input.userId ?? null });
  const { data, error } = await query.select(REQUEST_COLUMNS).maybeSingle();
  if (error) {
    console.error("[admin-erasure] enregistrement de la demande échoué", error.message);
    return {
      requestId: null,
      created: false,
      status: "error",
      requestedAt: null,
      scheduledDeletionAt: null,
      error: error.message,
    };
  }

  const saved = (data ?? {}) as Partial<OpenRequest>;
  await client.from("admin_action_logs").insert({
    admin_id: input.callerId,
    action: "gdpr_request_recorded",
    target_type: "profile",
    target_id: input.userId,
    note: `Demande d'effacement enregistrée pour ${email ?? input.userId ?? "adresse inconnue"}`,
    metadata: { email, request_id: saved.id ?? existing?.id ?? null },
  });

  return {
    requestId: saved.id ?? existing?.id ?? null,
    created: true,
    status: "pending",
    requestedAt: (saved.requested_at as string | undefined) ?? (row.requested_at as string),
    scheduledDeletionAt:
      (saved.scheduled_deletion_at as string | undefined) ?? (row.scheduled_deletion_at as string),
  };
}

export type ExecuteResult =
  | { kind: "blocked"; confirmedSits: number; pendingApplications: number }
  | { kind: "no_account"; requestId: string | null; acknowledged: false; suppressed: boolean }
  | {
      kind: "done";
      requestId: string | null;
      userId: string;
      acknowledged: boolean;
      suppressed: boolean;
      storageRemoved: number;
      storageFailures: AnonymizeOutcome["storageFailures"];
      authNeutralized: boolean;
    };

/**
 * Exécute l'effacement : garde-fou des engagements, trace « completed »,
 * anonymizeAccount, journal admin. Même circuit pour les deux entrées admin.
 */
export async function executeAdminErasure(
  client: Client,
  input: {
    userId: string | null;
    email: string | null;
    callerId: string;
    origin: ErasureOrigin;
    notes?: string | null;
    requestId?: string | null;
    force?: boolean;
  },
  deps: ErasureDeps = defaultErasureDeps,
): Promise<ExecuteResult> {
  const email = normalizeEmail(input.email);
  const force = input.force === true;

  if (input.userId) {
    const c = await deps.countCommitments(client, input.userId);
    if (c.total > 0 && !force) {
      return { kind: "blocked", confirmedSits: c.sits, pendingApplications: c.applications };
    }
  }

  const requestId =
    input.requestId ?? (await findRequest(client, input.userId, email))?.id ?? null;

  const nowIso = new Date().toISOString();
  const trace: Record<string, unknown> = {
    requester_email: email,
    source: "admin",
    status: "completed",
    processed_by: input.callerId,
    processed_at: nowIso,
    scheduled_deletion_at: nowIso,
    cancelled_at: null,
  };
  const notes = typeof input.notes === "string" ? input.notes.trim() : "";
  if (notes) trace.notes = notes;

  // Trace de conformité écrite d'abord.
  let traceId: string | null = requestId;
  if (requestId) {
    const patch = input.userId ? { ...trace, user_id: input.userId } : trace;
    const { error } = await client
      .from("account_deletion_requests")
      .update(patch)
      .eq("id", requestId);
    if (error) console.error("[admin-erasure] trace échouée", error.message);
  } else if (input.userId) {
    const { data, error } = await client
      .from("account_deletion_requests")
      .upsert({ ...trace, user_id: input.userId }, { onConflict: "user_id" })
      .select("id")
      .maybeSingle();
    if (error) console.error("[admin-erasure] trace échouée", error.message);
    traceId = (data as { id?: string } | null)?.id ?? null;
  } else {
    const { data, error } = await client
      .from("account_deletion_requests")
      .insert({ ...trace, user_id: null })
      .select("id")
      .maybeSingle();
    if (error) console.error("[admin-erasure] trace échouée", error.message);
    traceId = (data as { id?: string } | null)?.id ?? null;
  }

  // Aucun compte : accusé impossible à rattacher, adresse bloquée.
  if (!input.userId) {
    const { suppressed } = await deps.finalize(client, email, {
      metadata: { source: input.origin, account_found: false },
    });
    return { kind: "no_account", requestId: traceId, acknowledged: false, suppressed };
  }

  let outcome: AnonymizeOutcome;
  try {
    outcome = await deps.anonymize(client, input.userId, {
      fallbackEmail: email,
      source: input.origin,
    });
  } catch (e) {
    // La demande reste ouverte : rien ne doit la montrer comme traitée.
    if (traceId) {
      await client
        .from("account_deletion_requests")
        .update({ status: "pending", processed_at: null, processed_by: null })
        .eq("id", traceId);
    }
    throw e;
  }

  await client.from("admin_action_logs").insert({
    admin_id: input.callerId,
    action: "gdpr_account_erasure",
    target_type: "profile",
    target_id: input.userId,
    note: `Anonymisation RGPD exécutée pour ${email ?? outcome.email ?? input.userId}`,
    metadata: {
      email: email ?? outcome.email,
      origin: input.origin,
      request_id: traceId,
      acknowledged: outcome.acknowledged,
      suppressed: outcome.suppressed,
      forced: force,
      storage_removed: outcome.storageRemoved,
      storage_failures: outcome.storageFailures,
      auth_neutralized: outcome.authNeutralized,
    },
  });

  return {
    kind: "done",
    requestId: traceId,
    userId: input.userId,
    acknowledged: outcome.acknowledged,
    suppressed: outcome.suppressed,
    storageRemoved: outcome.storageRemoved,
    storageFailures: outcome.storageFailures,
    authNeutralized: outcome.authNeutralized,
  };
}
