import { sanitizeUrlSecrets } from "@/lib/errorLogger";

export interface ErrorRecord {
  id: string;
  user_id: string | null;
  user_email: string | null;
  message: string;
  stack: string | null;
  source: string | null;
  line_no: number | null;
  col_no: number | null;
  url: string | null;
  user_agent: string | null;
  severity: string;
  context: any;
  fingerprint: string;
  occurrences: number;
  first_seen_at: string;
  last_seen_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
  admin_notes: string | null;
  created_at: string;
}

export function safeLogText(text: string): string {
  return (sanitizeUrlSecrets(text) ?? "")
    .replace(/([?&#](?:password|authorization|api_key|client_secret|secret|[\w]*token))=[^&#\s]*/gi, "$1=[redacted]")
    .replace(/\bBearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [redacted]");
}

export function maskLogValue(value: unknown): unknown {
  if (typeof value === "string") {
    try {
      const parsed: unknown = JSON.parse(value);
      if (parsed && typeof parsed === "object") return JSON.stringify(maskLogValue(parsed));
    } catch { /* Non-JSON historical text. */ }
    return safeLogText(value);
  }
  if (Array.isArray(value)) return value.map(maskLogValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => {
      const sqlCode = key === "pg_code" || (key === "code" && typeof item === "string" && /^(?:[0-9]{2}[A-Z0-9]{3}|P[0-9]{4})$/.test(item));
      const secret = !sqlCode && /token|password|authorization|secret|api[_-]?key|^(?:code|oauth[_-]?code)$/i.test(key);
      return [safeLogText(key), secret ? "[redacted]" : maskLogValue(item)];
    }));
  }
  return value;
}

export function expectedRefusal(row: Pick<ErrorRecord, "context" | "url">): string | null {
  const ctx = row.context ?? {};
  let body: any = {};
  try { body = typeof ctx.response_body === "string" ? JSON.parse(ctx.response_body) : ctx.response_body ?? {}; } catch { /* Missing proof remains an incident. */ }
  if ((ctx.pg_code ?? body?.code) === "P0001" && (ctx.pg_hint ?? body?.hint) === "duplicate_small_mission") {
    return "Publication refusée : un coup de main identique existe déjà.";
  }
  const url = typeof ctx.url === "string" ? ctx.url : row.url ?? "";
  if (ctx.status === 410 && /\/send-owner-activation-campaign(?:[?#]|$)/.test(url) && body?.retired === true) {
    return "Cette campagne d'activation a été retirée.";
  }
  return null;
}

export function presentError(row: ErrorRecord) {
  const safe = maskLogValue(row) as ErrorRecord;
  let safeHref: string | null = null;
  if (row.url && safe.url === row.url && !/\[redacted\]/i.test(safe.url)) {
    try { const url = new URL(row.url); if (/^https?:$/.test(url.protocol) && !url.username && !url.password) safeHref = safe.url; } catch { /* Text only. */ }
  }
  return { ...safe, safeHref, refusalReason: expectedRefusal(row) };
}

export type PresentedError = ReturnType<typeof presentError>;
export type ErrorPeriod = "all" | "24h" | "7d" | "30d";
export function filterErrors(rows: PresentedError[], filters: { state: string; severity: string; period: ErrorPeriod; search: string }, now = Date.now()) {
  const hours = { all: null, "24h": 24, "7d": 168, "30d": 720 }[filters.period];
  const query = filters.search.trim().toLowerCase();
  return rows.filter(row =>
    (filters.state === "all" || (filters.state === "unresolved" ? !row.resolved_at : !!row.resolved_at)) &&
    (filters.severity === "all" ? row.severity !== "ignored_third_party" : row.severity === filters.severity) &&
    (hours === null || new Date(row.last_seen_at).getTime() >= now - hours * 3600_000) &&
    (!query || [row.message, row.url, row.source, row.user_email, JSON.stringify(row.context)].some(text => text?.toLowerCase().includes(query)))
  );
}

export function errorViewStats(rows: PresentedError[], now = Date.now()) {
  const idsByEmail = new Map(rows.filter(r => r.user_id && r.user_email).map(r => [r.user_email?.toLowerCase(), r.user_id]));
  const accounts = new Set(rows.map(r => r.user_id || (r.user_email ? idsByEmail.get(r.user_email.toLowerCase()) || `email:${r.user_email.toLowerCase()}` : null)).filter(Boolean));
  return {
    unresolved: rows.filter(r => !r.resolved_at).length,
    totalOcc: rows.reduce((sum, r) => sum + (r.occurrences ?? 1), 0),
    last24h: rows.filter(r => new Date(r.last_seen_at).getTime() > now - 86400_000).length,
    affected: accounts.size,
    app: rows.filter(r => r.source !== "NetworkErrorMonitor").length,
    network: rows.filter(r => r.source === "NetworkErrorMonitor").length,
    expected: rows.filter(r => r.refusalReason).length,
  };
}