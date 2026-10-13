// Lot Y1 (P4-02, décision du fondateur du 13/10/2026) : vérification
// d'identité relue par un humain.
//
// Avant : verify-identity refusait dès que le modèle répondait is_valid =
// false et recopiait son texte libre dans la notification et l'email. Sur 30
// jours, 21 refus pour 5 membres finalement tous vérifiés, dont 4 motifs
// « date d'émission postérieure à la date d'expiration » faux (émission 2025,
// expiration 2035).
//
// Désormais :
// - seuls deux cas restent refusés automatiquement, avec un libellé fixe :
//   document illisible, ou image sans rapport avec une pièce d'identité ;
// - tout autre refus proposé par le modèle passe en revue humaine
//   (needs_review) : l'équipe lit le motif proposé et décide ;
// - les dates d'émission et d'expiration sont lues par le modèle mais
//   contrôlées ici, par le code ; tout texte du modèle qui parle de dates est
//   écarté ;
// - au plus un email de refus par membre et par 24 heures.
//
// Module sans Deno : importable par les fonctions Edge et par les tests.

// deno-lint-ignore no-explicit-any
type Client = any;

export const AUTO_APPROVE_THRESHOLD = 0.85;
export const IDENTITY_REJECTION_EMAIL_WINDOW_HOURS = 24;

export type IdentityAutoRejectCode = "unreadable" | "not_identity_document";

/** Libellés fixes montrés au membre, seuls motifs d'un refus automatique. */
export const AUTO_REJECT_REASONS: Record<IdentityAutoRejectCode, string> = {
  unreadable:
    "Photo à reprendre : envoyez une photo nette de la pièce entière, avec toutes les informations bien lisibles.",
  not_identity_document:
    "Pièce attendue : passeport, carte d'identité, permis de conduire ou titre de séjour.",
};

export const AI_REJECTION_CATEGORIES = ["unreadable", "not_identity_document", "other"] as const;
export type AiRejectionCategory = (typeof AI_REJECTION_CATEGORIES)[number];

export type IdentityOutcomeStatus = "verified" | "needs_review" | "rejected";
export type IdentityAiProposal = "verify" | "reject" | "low_confidence";

export type DateCheckStatus = "ok" | "unknown" | "issue_after_expiry" | "expired" | "issue_in_future";

export interface DateCheck {
  status: DateCheckStatus;
  issue: string | null;
  expiry: string | null;
  /** Phrase pour l'équipe, calculée par le code. */
  note: string;
}

export interface IdentityOutcome {
  status: IdentityOutcomeStatus;
  aiProposal: IdentityAiProposal;
  rejectCode: IdentityAutoRejectCode | null;
  /** Libellé fixe montré au membre en cas de refus automatique, sinon null. */
  memberReason: string | null;
  /** Motif proposé à l'équipe pour une revue humaine, sinon null. */
  reviewReason: string | null;
  confidence: number;
  documentType: string | null;
  dateCheck: DateCheck;
  /** Signaux du modèle, sans aucune affirmation sur les dates. */
  redFlags: string[];
}

/** Retire espaces et ponctuation finale (évite « .. » après concaténation). */
export function stripTrailingPunctuation(text: string | null | undefined): string {
  return String(text ?? "").trim().replace(/[\s.;:,!]+$/u, "");
}

/** Une phrase terminée par un seul point. */
export function asSentence(text: string | null | undefined): string {
  const core = stripTrailingPunctuation(text);
  return core ? `${core}.` : "";
}

const DATE_CLAIM = /(date|[ée]mission|[ée]mis\b|expir|validit|p[ée]rim|d[ée]livr|\b(19|20)\d{2}\b)/iu;

/** Vrai si le texte du modèle porte sur des dates : le code les contrôle seul. */
export function isDateClaim(text: string | null | undefined): boolean {
  return DATE_CLAIM.test(String(text ?? ""));
}

function isRealDate(y: number, m: number, d: number): Date | null {
  if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d)) return null;
  if (y < 1900 || y > 2200 || m < 1 || m > 12 || d < 1 || d > 31) return null;
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null;
  return date;
}

/** Lit une date de document : AAAA-MM-JJ, JJ/MM/AAAA ou JJ.MM.AAAA. */
export function parseDocumentDate(value: unknown): Date | null {
  if (typeof value !== "string") return null;
  const v = value.trim();
  let m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  if (m) return isRealDate(Number(m[1]), Number(m[2]), Number(m[3]));
  m = /^(\d{2})[/.](\d{2})[/.](\d{4})$/.exec(v);
  if (m) return isRealDate(Number(m[3]), Number(m[2]), Number(m[1]));
  return null;
}

const iso = (d: Date) => d.toISOString().slice(0, 10);

/** Contrôle de cohérence des dates, calculé par le code. */
export function checkDocumentDates(issueRaw: unknown, expiryRaw: unknown, now: Date = new Date()): DateCheck {
  const issue = parseDocumentDate(issueRaw);
  const expiry = parseDocumentDate(expiryRaw);
  const issueIso = issue ? iso(issue) : null;
  const expiryIso = expiry ? iso(expiry) : null;
  const today = iso(now);

  if (issue && expiry && issue.getTime() > expiry.getTime()) {
    return {
      status: "issue_after_expiry",
      issue: issueIso,
      expiry: expiryIso,
      note: `Dates lues à vérifier : émission ${issueIso} postérieure à l'expiration ${expiryIso} (contrôle du code)`,
    };
  }
  if (expiry && expiryIso! < today) {
    return {
      status: "expired",
      issue: issueIso,
      expiry: expiryIso,
      note: `Expiration lue au ${expiryIso}, date dépassée (contrôle du code)`,
    };
  }
  if (issue && issueIso! > today) {
    return {
      status: "issue_in_future",
      issue: issueIso,
      expiry: expiryIso,
      note: `Émission lue au ${issueIso}, date à venir (contrôle du code)`,
    };
  }
  if (!issue && !expiry) {
    return { status: "unknown", issue: null, expiry: null, note: "Dates à contrôler à l'oeil, illisibles pour l'IA" };
  }
  const parts = [issueIso ? `émission ${issueIso}` : null, expiryIso ? `expiration ${expiryIso}` : null].filter(Boolean);
  return {
    status: "ok",
    issue: issueIso,
    expiry: expiryIso,
    note: `Dates cohérentes : ${parts.join(", ")} (contrôle du code)`,
  };
}

/** Réponse brute de l'outil verify_document (non typée : vient du modèle). */
export interface AiVerification {
  is_valid?: unknown;
  document_type?: unknown;
  confidence?: unknown;
  red_flags?: unknown;
  rejection_reason?: unknown;
  rejection_category?: unknown;
  issue_date?: unknown;
  expiry_date?: unknown;
}

function normalizeCategory(value: unknown): AiRejectionCategory {
  return (AI_REJECTION_CATEGORIES as readonly string[]).includes(String(value))
    ? (value as AiRejectionCategory)
    : "other";
}

/**
 * Décision finale. Le modèle propose, le code décide :
 * - refus automatique seulement pour un document illisible ou sans rapport
 *   avec une pièce d'identité, avec un libellé fixe ;
 * - tout autre refus proposé, une confiance faible ou des dates incohérentes
 *   passent en revue humaine ;
 * - validation automatique pour une pièce jugée valide, confiance d'au moins
 *   0,85 et dates cohérentes ou non lues.
 */
export function decideIdentityOutcome(ai: AiVerification | null | undefined, now: Date = new Date()): IdentityOutcome {
  const input = ai ?? {};
  const isValid = input.is_valid === true;
  const confidence = typeof input.confidence === "number" && Number.isFinite(input.confidence)
    ? Math.min(1, Math.max(0, input.confidence))
    : 0;
  const documentType = typeof input.document_type === "string" ? input.document_type : null;
  const category = normalizeCategory(input.rejection_category);
  const dateCheck = checkDocumentDates(input.issue_date, input.expiry_date, now);

  const rawFlags = Array.isArray(input.red_flags) ? input.red_flags : [];
  const redFlags = rawFlags
    .filter((f): f is string => typeof f === "string")
    .map((f) => stripTrailingPunctuation(f))
    .filter((f) => f.length > 0 && !isDateClaim(f));
  const aiReason = typeof input.rejection_reason === "string" && !isDateClaim(input.rejection_reason)
    ? stripTrailingPunctuation(input.rejection_reason)
    : "";

  const base = { confidence, documentType, dateCheck, redFlags };

  if (!isValid) {
    let rejectCode: IdentityAutoRejectCode | null = null;
    if (documentType === "not_a_document" || category === "not_identity_document") rejectCode = "not_identity_document";
    else if (category === "unreadable") rejectCode = "unreadable";

    if (rejectCode) {
      return {
        ...base,
        status: "rejected",
        aiProposal: "reject",
        rejectCode,
        memberReason: AUTO_REJECT_REASONS[rejectCode],
        reviewReason: null,
      };
    }
    const motifs = [aiReason, ...redFlags].filter((m, i, all) => m && all.indexOf(m) === i);
    const proposed = motifs.length ? motifs.join(" · ") : "motif à préciser";
    return {
      ...base,
      status: "needs_review",
      aiProposal: "reject",
      rejectCode: null,
      memberReason: null,
      reviewReason: `Refus proposé par l'IA : ${proposed} · ${dateCheck.note}`,
    };
  }

  const datesConflict = dateCheck.status === "issue_after_expiry"
    || dateCheck.status === "expired"
    || dateCheck.status === "issue_in_future";

  if (!datesConflict && confidence >= AUTO_APPROVE_THRESHOLD && documentType !== "not_a_document") {
    return { ...base, status: "verified", aiProposal: "verify", rejectCode: null, memberReason: null, reviewReason: null };
  }

  const percent = Math.round(confidence * 100);
  const flags = redFlags.length ? ` · ${redFlags.join(" · ")}` : "";
  return {
    ...base,
    status: "needs_review",
    aiProposal: datesConflict ? "verify" : "low_confidence",
    rejectCode: null,
    memberReason: null,
    reviewReason: datesConflict
      ? `Pièce jugée valide par l'IA (confiance ${percent} %) · ${dateCheck.note}${flags}`
      : `Confiance de l'IA à ${percent} %${flags} · ${dateCheck.note}`,
  };
}

/**
 * Au plus un email de refus d'identité par membre et par 24 heures, refus
 * automatique ou décision de l'équipe. Lit email_send_log (sent, pending,
 * deferred). Lecture en échec : créneau pris, comme les relances (lot R1).
 */
export async function identityRejectionEmailAllowed(
  client: Client,
  email: string | null | undefined,
  now: number = Date.now(),
): Promise<boolean> {
  const key = String(email ?? "").trim().toLowerCase();
  if (!key) return false;
  const since = new Date(now - IDENTITY_REJECTION_EMAIL_WINDOW_HOURS * 3600 * 1000).toISOString();
  try {
    const { data, error } = await client
      .from("email_send_log")
      .select("id")
      .eq("recipient_email", key)
      .eq("template_name", "identity-rejected")
      .in("status", ["sent", "pending", "deferred"])
      .gte("created_at", since)
      .limit(1);
    if (error) {
      console.error("[identity-review] email log lookup failed", error.message ?? error);
      return false;
    }
    return !data || data.length === 0;
  } catch (e) {
    console.error("[identity-review] email log lookup failed", e);
    return false;
  }
}
