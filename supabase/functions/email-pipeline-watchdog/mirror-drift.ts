// Lot F4 : réparation du miroir email_send_log depuis email_deferred_queue.
// Module sans import Deno pour être testé aussi par Vitest.

export const TERMINAL_QUEUE_STATUSES = ["abandoned", "cancelled", "sent", "superseded"] as const;
const LIVE_QUEUE_STATUSES = ["pending", "processing"];
const BATCH = 500;

type Row = { id: string; metadata: Record<string, unknown> | null };
type QueueRow = { idempotency_key: string; status: string };

// deno-lint-ignore no-explicit-any
type Client = any;

export type DriftDecision =
  | { kind: "live" }
  | { kind: "repair"; queueStatus: (typeof TERMINAL_QUEUE_STATUSES)[number] }
  | { kind: "orphan" }
  | { kind: "other"; queueStatus: string };

/** Décision pure pour une ligne de miroir, d'après les statuts de file de sa clé. */
export function decideDrift(queueStatuses: string[]): DriftDecision {
  if (queueStatuses.length === 0) return { kind: "orphan" };
  if (queueStatuses.some((s) => LIVE_QUEUE_STATUSES.includes(s))) return { kind: "live" };
  for (const terminal of ["sent", "cancelled", "abandoned", "superseded"] as const) {
    if (queueStatuses.includes(terminal)) return { kind: "repair", queueStatus: terminal };
  }
  return { kind: "other", queueStatus: queueStatuses[0] };
}

export async function repairMirrorDrift(
  service: Client,
  now: Date = new Date(),
): Promise<{ repaired: number; orphanKeys: string[]; other: number }> {
  const cutoff = new Date(now.getTime() - 24 * 3600_000).toISOString();
  const { data: rows, error } = await service
    .from("email_send_log")
    .select("id, metadata")
    .eq("status", "deferred")
    .lt("created_at", cutoff)
    .is("metadata->>flushed_at", null)
    .order("created_at", { ascending: true })
    .limit(BATCH);
  if (error) throw error;
  const list = (rows ?? []) as Row[];
  if (list.length === 0) return { repaired: 0, orphanKeys: [], other: 0 };

  const keyOf = (row: Row) => {
    const key = row.metadata?.idempotency_key;
    return typeof key === "string" && key ? key : null;
  };
  const keys = [...new Set(list.map(keyOf).filter((k): k is string => !!k))];
  const byKey = new Map<string, string[]>();
  if (keys.length > 0) {
    const { data: queue, error: qErr } = await service
      .from("email_deferred_queue")
      .select("idempotency_key, status")
      .in("idempotency_key", keys);
    if (qErr) throw qErr;
    for (const q of (queue ?? []) as QueueRow[]) {
      byKey.set(q.idempotency_key, [...(byKey.get(q.idempotency_key) ?? []), q.status]);
    }
  }

  let repaired = 0;
  let other = 0;
  const orphanKeys = new Set<string>();
  const stamp = now.toISOString();
  for (const row of list) {
    const key = keyOf(row);
    const decision = decideDrift(key ? byKey.get(key) ?? [] : []);
    if (decision.kind === "orphan") {
      orphanKeys.add(key ?? `log:${row.id}`);
      continue;
    }
    if (decision.kind === "other") {
      other += 1;
      continue;
    }
    if (decision.kind !== "repair") continue;
    const note = `Aligné par email-pipeline-watchdog le ${stamp} : file en '${decision.queueStatus}'.`;
    const patch = decision.queueStatus === "sent"
      ? { metadata: { ...(row.metadata ?? {}), flushed_at: stamp, mirror_repaired: "sent" }, error_message: note }
      : decision.queueStatus === "superseded"
      ? { status: "cancelled", error_message: `superseded dans la file. ${note}` }
      : { status: decision.queueStatus, error_message: note };
    const { error: uErr } = await service
      .from("email_send_log")
      .update(patch)
      .eq("id", row.id)
      .eq("status", "deferred");
    if (!uErr) repaired += 1;
  }
  return { repaired, orphanKeys: [...orphanKeys], other };
}
