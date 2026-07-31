// Traduction des échecs de l'edge function `verify-identity` en messages
// distincts et exacts. Un quota atteint n'est pas une panne : le message doit
// dire ce qui a été consommé, quand le compteur repart, et que rien n'a été
// soumis à l'examen automatique.

export type IdentityVerifyErrorKind =
  | "quota"
  | "unauthorized"
  | "document_missing"
  | "too_large"
  | "provider_busy"
  | "unavailable";

export interface IdentityVerifyErrorInfo {
  kind: IdentityVerifyErrorKind;
  /** "error" pour un refus net, "warning" pour un repli examen manuel. */
  tone: "error" | "warning";
  message: string;
}

export const DAILY_VERIFY_LIMIT = 5;

/** Formate l'heure de réinitialisation du quota, en français. */
export function formatResetLabel(resetAt: Date | null): string {
  if (!resetAt || Number.isNaN(resetAt.getTime())) return "dans les 24 heures";
  const heure = resetAt.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  const jour = resetAt.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
  return `le ${jour} à ${heure}`;
}

export function quotaMessage(attempts: number, resetAt: Date | null): string {
  return (
    `Quota atteint : ${Math.min(attempts, DAILY_VERIFY_LIMIT)} vérifications sur ${DAILY_VERIFY_LIMIT} ont été utilisées ` +
    `sur les 24 dernières heures. Votre document n'a pas été soumis à la vérification. ` +
    `Le compteur se réinitialise ${formatResetLabel(resetAt)}.`
  );
}

/** Analyse un échec d'invocation en un message dédié. */
export function describeVerifyError(
  input: { status?: number; body?: string; message?: string },
  ctx: { attempts: number; resetAt: Date | null },
): IdentityVerifyErrorInfo {
  const status = input.status;
  const raw = `${input.body || ""} ${input.message || ""}`.toLowerCase();

  if (status === 429 || raw.includes("limite de 5") || raw.includes("rate limit")) {
    return { kind: "quota", tone: "error", message: quotaMessage(ctx.attempts, ctx.resetAt) };
  }
  if (status === 401 || status === 403) {
    return {
      kind: "unauthorized",
      tone: "error",
      message: "Session expirée : reconnectez-vous, puis renvoyez votre document. Rien n'a été soumis.",
    };
  }
  if (status === 404 || raw.includes("no document") || raw.includes("document introuvable")) {
    return {
      kind: "document_missing",
      tone: "error",
      message: "Le document n'a pas été retrouvé sur nos serveurs. Renvoyez-le, il n'a pas été analysé.",
    };
  }
  if (status === 413 || raw.includes("too large") || raw.includes("payload")) {
    return {
      kind: "too_large",
      tone: "error",
      message: "Le fichier est trop volumineux pour l'analyse automatique. Envoyez une image plus légère (max 10 Mo).",
    };
  }
  if (status === 503 || raw.includes("overloaded") || raw.includes("service unavailable")) {
    return {
      kind: "provider_busy",
      tone: "warning",
      message: "Le service de vérification est saturé pour le moment. Votre document est enregistré et sera examiné manuellement.",
    };
  }
  return {
    kind: "unavailable",
    tone: "warning",
    message: "Vérification automatique indisponible. Votre document est enregistré et sera examiné manuellement.",
  };
}
