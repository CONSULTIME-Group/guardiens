// Message personnel d'un admin à un membre (lot M1).
//
// Module pur, sans dépendance réseau : partagé par la fonction serveur
// admin-personal-message et testé côté Deno comme côté Vitest.

export const ADMIN_PERSONAL_TEMPLATE = "admin-personal-message";
export const SUBJECT_MAX = 200;
export const BODY_MAX = 5000;
export const LINK_LABEL_MAX = 60;
export const LINK_URL_MAX = 500;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]{2,}$/;

export interface AdminPersonalInput {
  mode: "preview" | "send";
  recipientUserId?: string;
  recipientEmail?: string;
  subject: string;
  body: string;
  linkLabel?: string;
  linkUrl?: string;
  sitId?: string;
  requestId?: string;
}

export type ValidationResult =
  | { ok: true; value: AdminPersonalInput }
  | { ok: false; error: string };

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

/** Découpe un texte libre en paragraphes (ligne vide = nouveau paragraphe). */
export function splitParagraphs(body: string): string[][] {
  return body
    .replace(/\r\n?/g, "\n")
    .split(/\n\s*\n/)
    .map((p) => p.split("\n").map((l) => l.trim()).filter((l) => l.length > 0))
    .filter((p) => p.length > 0);
}

export function isSafeLinkUrl(url: string): boolean {
  if (!url || url.length > LINK_URL_MAX) return false;
  try {
    const u = new URL(url);
    return u.protocol === "https:";
  } catch {
    return false;
  }
}

export function validateAdminPersonalInput(raw: unknown): ValidationResult {
  if (!raw || typeof raw !== "object") return { ok: false, error: "Requête invalide." };
  const r = raw as Record<string, unknown>;
  const mode = r.mode === "send" ? "send" : r.mode === "preview" ? "preview" : null;
  if (!mode) return { ok: false, error: "Mode attendu : preview ou send." };

  const subject = str(r.subject);
  const body = typeof r.body === "string" ? r.body.replace(/\r\n?/g, "\n").trim() : "";
  if (!subject) return { ok: false, error: "L'objet est requis." };
  if (subject.length > SUBJECT_MAX) return { ok: false, error: `L'objet dépasse ${SUBJECT_MAX} caractères.` };
  if (!body) return { ok: false, error: "Le texte est requis." };
  if (body.length > BODY_MAX) return { ok: false, error: `Le texte dépasse ${BODY_MAX} caractères.` };

  const linkLabel = str(r.linkLabel);
  const linkUrl = str(r.linkUrl);
  if (!!linkLabel !== !!linkUrl) return { ok: false, error: "Le lien demande un libellé et une adresse." };
  if (linkLabel.length > LINK_LABEL_MAX) return { ok: false, error: `Le libellé dépasse ${LINK_LABEL_MAX} caractères.` };
  if (linkUrl && !isSafeLinkUrl(linkUrl)) return { ok: false, error: "L'adresse du lien doit commencer par https://." };

  const sitId = str(r.sitId);
  if (sitId && !UUID_RE.test(sitId)) return { ok: false, error: "Identifiant d'annonce invalide." };
  const requestId = str(r.requestId);
  if (requestId && !UUID_RE.test(requestId)) return { ok: false, error: "Identifiant de requête invalide." };

  const recipientUserId = str(r.recipientUserId);
  const recipientEmail = str(r.recipientEmail).toLowerCase();
  if (recipientUserId && !UUID_RE.test(recipientUserId)) return { ok: false, error: "Identifiant de membre invalide." };
  if (recipientEmail && !EMAIL_RE.test(recipientEmail)) return { ok: false, error: "Adresse email invalide." };
  if (mode === "send" && !recipientUserId && !recipientEmail) return { ok: false, error: "Destinataire requis." };

  return {
    ok: true,
    value: {
      mode,
      subject,
      body,
      ...(linkLabel ? { linkLabel, linkUrl } : {}),
      ...(sitId ? { sitId } : {}),
      ...(requestId ? { requestId } : {}),
      ...(recipientUserId ? { recipientUserId } : {}),
      ...(recipientEmail ? { recipientEmail } : {}),
    },
  };
}

/** Métadonnées de journal d'un envoi (email_send_log.metadata). */
export function adminPersonalLogMetadata(sitId: string | undefined, adminId: string) {
  return { kind: "admin_personal", sit_id: sitId ?? null, sent_by_admin: adminId };
}
