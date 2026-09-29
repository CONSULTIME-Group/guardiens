/**
 * Lot A8 « Envois sûrs » : anti-doublon global des envois groupés.
 *
 * Règle : une personne ne reçoit jamais deux fois la même campagne. La clé est
 * le gabarit (template_name) quand il y en a un, sinon l'utm_campaign. Seules
 * comptent les campagnes non annulées et les lignes réellement parties
 * (hors ignorées, supprimées, échouées). Une fenêtre de répétition
 * (repeat_after_days) n'est admise que si le préréglage la déclare.
 *
 * Miroir client : src/lib/admin/massEmailSafety.ts.
 */

export type DedupeKey = { kind: "template"; value: string } | { kind: "utm"; value: string };

/** Statuts mass_email_sends qui ne valent PAS réception. */
export const NOT_RECEIVED_STATUSES: ReadonlySet<string> = new Set(["skipped", "suppressed", "failed", "cancelled"]);

export function utmFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).searchParams.get("utm_campaign");
  } catch {
    const m = /[?&]utm_campaign=([^&#]+)/.exec(url);
    return m ? decodeURIComponent(m[1]) : null;
  }
}

export function resolveDedupeKey(input: {
  template_name?: string | null;
  utm_campaign?: string | null;
  cta_url?: string | null;
}): DedupeKey | null {
  const tpl = input.template_name?.trim();
  if (tpl) return { kind: "template", value: tpl };
  const utm = input.utm_campaign?.trim() || utmFromUrl(input.cta_url);
  return utm ? { kind: "utm", value: utm } : null;
}

export interface PastCampaign {
  id: string;
  created_at: string;
  status: string | null;
  cta_url: string | null;
  dedupe_key: string | null;
  filters: Record<string, unknown> | null;
}

/** Une campagne passée compte-t-elle pour cette clé ? Pure. */
export function campaignMatches(
  c: PastCampaign,
  key: DedupeKey,
  opts: { sinceIso?: string | null; excludeDedupeKey?: string | null } = {},
): boolean {
  if (c.status === "cancelled") return false;
  if (opts.excludeDedupeKey && c.dedupe_key === opts.excludeDedupeKey) return false;
  if (opts.sinceIso && c.created_at < opts.sinceIso) return false;
  const f = c.filters ?? {};
  if (key.kind === "template") return f.template_name === key.value;
  const utm = (typeof f.utm_campaign === "string" ? f.utm_campaign : null) ?? utmFromUrl(c.cta_url);
  return !f.template_name && utm === key.value;
}

/** Retire les destinataires déjà servis ; renvoie le compteur. Pure. */
export function splitReceived<T extends { email?: string | null }>(
  rows: T[],
  received: ReadonlySet<string>,
): { rows: T[]; alreadyReceived: number } {
  const kept: T[] = [];
  let n = 0;
  for (const r of rows) {
    const e = (r.email ?? "").toLowerCase();
    if (e && received.has(e)) n++;
    else kept.push(r);
  }
  return { rows: kept, alreadyReceived: n };
}

export function windowStartIso(repeatAfterDays: number | null | undefined, now = new Date()): string | null {
  if (!repeatAfterDays || repeatAfterDays <= 0) return null;
  return new Date(now.getTime() - repeatAfterDays * 86_400_000).toISOString();
}

/** Lecture seule : emails (minuscules) ayant déjà reçu cette campagne. */
export async function loadReceivedForKey(
  // deno-lint-ignore no-explicit-any
  client: any,
  key: DedupeKey,
  opts: { repeatAfterDays?: number | null; excludeDedupeKey?: string | null } = {},
): Promise<Set<string>> {
  const sinceIso = windowStartIso(opts.repeatAfterDays);
  const out = new Set<string>();
  const past: PastCampaign[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await client
      .from("mass_emails")
      .select("id,created_at,status,cta_url,dedupe_key,filters")
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .range(from, from + 999);
    if (error) throw new Error(`dedupe campaigns: ${error.message}`);
    past.push(...((data ?? []) as PastCampaign[]));
    if (!data || data.length < 1000) break;
  }
  const ids = past.filter((c) => campaignMatches(c, key, { sinceIso, excludeDedupeKey: opts.excludeDedupeKey })).map((c) => c.id);
  for (let i = 0; i < ids.length; i += 50) {
    const chunk = ids.slice(i, i + 50);
    for (let from = 0; ; from += 1000) {
      const { data, error } = await client
        .from("mass_email_sends")
        .select("recipient_email,status")
        .in("mass_email_id", chunk)
        .order("id", { ascending: true })
        .range(from, from + 999);
      if (error) throw new Error(`dedupe sends: ${error.message}`);
      for (const r of (data ?? []) as { recipient_email: string | null; status: string | null }[]) {
        if (r.recipient_email && !NOT_RECEIVED_STATUSES.has(r.status ?? "")) out.add(r.recipient_email.toLowerCase());
      }
      if (!data || data.length < 1000) break;
    }
  }
  if (key.kind === "template") {
    for (let from = 0; ; from += 1000) {
      let q = client
        .from("email_send_log")
        .select("recipient_email")
        .eq("template_name", key.value)
        .in("status", ["sent", "deferred"]);
      if (sinceIso) q = q.gte("created_at", sinceIso);
      const { data, error } = await q.order("id", { ascending: true }).range(from, from + 999);
      if (error) throw new Error(`dedupe log: ${error.message}`);
      for (const r of (data ?? []) as { recipient_email: string | null }[]) {
        if (r.recipient_email) out.add(r.recipient_email.toLowerCase());
      }
      if (!data || data.length < 1000) break;
    }
  }
  return out;
}
