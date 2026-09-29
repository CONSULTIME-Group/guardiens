// Lot J1 : signal admin alma_frustration. Une entrée par membre et par jour
// (entity_id dérivé de membre + jour de Paris), critique, email quotidien et
// file d'actions (configuration unique : admin-signal-config.ts).

export const ALMA_FRUSTRATION_SIGNAL = "alma_frustration"

export function parisDay(d = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" }).format(d)
}

/** UUID stable pour (membre, jour) : l'index d'unicité fait l'anti-doublon. */
export async function memberDayEntityId(userId: string, day: string): Promise<string> {
  const buf = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`alma_frustration:${userId}:${day}`)))
  const h = [...buf.slice(0, 16)].map((b) => b.toString(16).padStart(2, "0")).join("")
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`
}

export function memberAdminUrl(userId: string): string {
  return `https://guardiens.fr/admin/users?user=${userId}`
}

export async function recordAlmaFrustration(
  // deno-lint-ignore no-explicit-any
  client: any,
  userId: string,
  message: string,
  matched: string[],
  now = new Date(),
): Promise<void> {
  const day = parisDay(now)
  const entityId = await memberDayEntityId(userId, day)
  const { data: p } = await client.from("profiles").select("first_name, city, role").eq("id", userId).maybeSingle()
  const entry = { at: now.toISOString(), text: message.slice(0, 500), matched }
  const { data: existing } = await client
    .from("admin_signals")
    .select("id, metadata")
    .eq("signal_type", ALMA_FRUSTRATION_SIGNAL)
    .eq("entity_id", entityId)
    .is("resolved_at", null)
    .maybeSingle()
  if (existing?.id) {
    const messages = [...((existing.metadata?.messages as unknown[]) ?? []), entry].slice(-10)
    await client.from("admin_signals").update({ metadata: { ...existing.metadata, messages } }).eq("id", existing.id)
    return
  }
  const name = p?.first_name ?? "Membre"
  const { error } = await client.from("admin_signals").insert({
    signal_type: ALMA_FRUSTRATION_SIGNAL,
    severity: "critical",
    entity_type: "profile",
    entity_id: entityId,
    metadata: {
      title: `${name}${p?.city ? `, ${p.city}` : ""} (${p?.role ?? "rôle inconnu"}) : frustration avec Alma`,
      excerpt: message.slice(0, 200),
      profile_id: userId,
      first_name: p?.first_name ?? null,
      city: p?.city ?? null,
      role: p?.role ?? null,
      day,
      messages: [entry],
      admin_url: memberAdminUrl(userId),
    },
  })
  if (error && error.code !== "23505") throw error
}
