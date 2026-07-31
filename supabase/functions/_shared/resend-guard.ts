// Barrière d'envoi réel, appliquée au point d'entrée du client Resend.
//
// Principe : le refus est le comportement par défaut. Aucun code appelant ne
// peut expédier un email tant que l'environnement ne porte pas explicitement
// EMAIL_DELIVERY_MODE=live. Un harnais de test, un script local, une fonction
// dépubliée ou un environnement mal configuré échouent donc en silence côté
// réseau, sans jamais atteindre un vrai destinataire.
//
// Deux garde-fous complémentaires, actifs même en mode live :
//   - domaines de test réservés (RFC 2606 / 6761) toujours refusés,
//   - marqueur de harnais explicite (en-tête ou variable) toujours refusé.

export type GuardDecision = { allowed: true } | { allowed: false; reason: string };

function envGet(name: string): string | undefined {
  const anyGlobal = globalThis as unknown as {
    Deno?: { env?: { get(k: string): string | undefined } };
    process?: { env?: Record<string, string | undefined> };
  };
  return anyGlobal.Deno?.env?.get(name) ?? anyGlobal.process?.env?.[name];
}

/** Domaines et TLD réservés aux tests, jamais expédiables. */
const RESERVED_SUFFIXES = [
  ".invalid",
  ".test",
  ".example",
  ".localhost",
  "example.com",
  "example.org",
  "example.net",
];

export function isReservedTestRecipient(address: string): boolean {
  const email = String(address || "").trim().toLowerCase();
  const at = email.lastIndexOf("@");
  if (at < 0) return true; // adresse malformée : on refuse plutôt que d'essayer
  const domain = email.slice(at + 1);
  if (!domain) return true;
  return RESERVED_SUFFIXES.some((s) => domain === s.replace(/^\./, "") || domain.endsWith(s));
}

/** Extrait les destinataires d'un corps de requête Resend (unitaire ou batch). */
export function extractRecipients(body: unknown): string[] {
  const out: string[] = [];
  const push = (v: unknown) => {
    if (typeof v === "string") out.push(v);
    else if (Array.isArray(v)) v.forEach((x) => typeof x === "string" && out.push(x));
  };
  const visit = (node: unknown) => {
    if (Array.isArray(node)) node.forEach(visit);
    else if (node && typeof node === "object") {
      const rec = node as Record<string, unknown>;
      push(rec.to);
      push(rec.cc);
      push(rec.bcc);
    }
  };
  visit(body);
  return out;
}

export interface GuardContext {
  /** Nom de la fonction appelante, pour les journaux. */
  functionName: string;
  /** Requête entrante éventuelle, inspectée pour le marqueur de harnais. */
  req?: { headers: { get(name: string): string | null } };
  /** Destinataires, sinon déduits du corps de la requête Resend. */
  recipients?: string[];
}

export const HARNESS_HEADER = "x-guardiens-test-harness";

export function evaluateSend(ctx: GuardContext & { body?: unknown }): GuardDecision {
  const harnessHeader = ctx.req?.headers.get(HARNESS_HEADER);
  if (harnessHeader) {
    return { allowed: false, reason: `test_harness_header:${ctx.functionName}` };
  }
  if (envGet("EMAIL_TEST_HARNESS") === "1") {
    return { allowed: false, reason: `test_harness_env:${ctx.functionName}` };
  }

  const mode = envGet("EMAIL_DELIVERY_MODE");
  if (mode !== "live") {
    return {
      allowed: false,
      reason: `delivery_mode_not_live:${mode ?? "unset"}:${ctx.functionName}`,
    };
  }

  const recipients = ctx.recipients ?? extractRecipients(ctx.body);
  if (recipients.length === 0) {
    return { allowed: false, reason: `no_recipient:${ctx.functionName}` };
  }
  const reserved = recipients.filter(isReservedTestRecipient);
  if (reserved.length > 0) {
    return { allowed: false, reason: `reserved_test_recipient:${reserved.join(",")}` };
  }
  return { allowed: true };
}

/**
 * Remplace `fetch` pour tout appel d'envoi Resend. En cas de refus, renvoie une
 * réponse 403 synthétique au format d'erreur Resend, de sorte que les appelants
 * existants traitent le blocage comme un échec d'envoi normal.
 */
export async function resendFetch(
  url: string,
  init: RequestInit,
  ctx: GuardContext,
): Promise<Response> {
  let body: unknown = undefined;
  try {
    body = typeof init.body === "string" ? JSON.parse(init.body) : undefined;
  } catch {
    body = undefined;
  }
  const decision = evaluateSend({ ...ctx, body });
  if (decision.allowed === false) {
    const reason = decision.reason;
    console.error(`[resend-guard] envoi bloqué (${reason})`);
    return new Response(
      JSON.stringify({
        name: "send_blocked",
        message: `Envoi bloqué par la barrière de sécurité : ${reason}`,
        statusCode: 403,
      }),
      { status: 403, headers: { "Content-Type": "application/json" } },
    );
  }
  return await fetch(url, init);
}
