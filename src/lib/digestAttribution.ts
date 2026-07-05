// Attribution UTM du digest quotidien sitter.
// Capturée sur /annonces/:id quand utm_campaign=sitter_daily_digest,
// consommée lors de la création de candidature pour attribuer application_created
// et déclencher l'event sitter_digest_apply_from_email.

const KEY = "guardiens_from_digest";
const TTL_MS = 24 * 60 * 60 * 1000; // 24h

export interface DigestAttribution {
  sit_id: string;
  timestamp: number;
  email_id?: string | null;
  source?: string;
  medium?: string;
}

export function captureDigestAttribution(sitId: string): DigestAttribution | null {
  if (typeof window === "undefined") return null;
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get("utm_campaign") !== "sitter_daily_digest") return null;
    const attr: DigestAttribution = {
      sit_id: sitId,
      timestamp: Date.now(),
      email_id: params.get("email_id"),
      source: params.get("utm_source") || "email",
      medium: params.get("utm_medium") || "daily",
    };
    window.sessionStorage.setItem(KEY, JSON.stringify(attr));
    return attr;
  } catch {
    return null;
  }
}

export function readDigestAttribution(sitId: string): DigestAttribution | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (!raw) return null;
    const attr = JSON.parse(raw) as DigestAttribution;
    if (!attr?.sit_id || attr.sit_id !== sitId) return null;
    if (Date.now() - (attr.timestamp || 0) > TTL_MS) {
      window.sessionStorage.removeItem(KEY);
      return null;
    }
    return attr;
  } catch {
    return null;
  }
}

export function clearDigestAttribution(): void {
  if (typeof window === "undefined") return;
  try { window.sessionStorage.removeItem(KEY); } catch {}
}
