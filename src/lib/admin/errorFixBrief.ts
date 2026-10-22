/**
 * Lot ERR1 : brief de correction prêt à coller dans Claude, construit depuis
 * /admin/errors pour un dossier ou pour la vue filtrée.
 *
 * Aucune donnée de membre : ni email, ni identifiant de compte, ni adresse
 * complète avec paramètres (les valeurs passent déjà par maskLogValue dans
 * presentError, et seules les clés de contexte techniques sont reprises).
 */
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import type { PresentedError, PriorResolution } from "./errorPresentation";

export const FIX_BRIEF_REPO = "CONSULTIME-Group/guardiens";
export const FIX_BRIEF_LOVABLE_PROJECT = "71c949a9-436e-45af-9d49-b7cdedafa6da";

/** Clés de contexte reprises dans le brief (techniques, sans donnée de membre). */
const CONTEXT_KEYS = [
  "route", "pathname", "search", "method", "status", "url",
  "pg_code", "pg_message", "pg_details", "pg_hint", "response_body",
  "component", "visibility", "online", "network", "viewport", "language",
] as const;

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const MAX_STACK_LINES = 8;

const clean = (value: unknown): string =>
  String(value).replace(EMAIL_RE, "[email masqué]").slice(0, 600);

const day = (iso: string) => format(new Date(iso), "dd/MM/yyyy HH:mm", { locale: fr });

function title(row: PresentedError): string {
  const ctx = row.context ?? {};
  if (row.source === "NetworkErrorMonitor") {
    const status = typeof ctx.status === "number" ? ctx.status : "?";
    const method = typeof ctx.method === "string" ? ctx.method : "";
    let target = typeof ctx.url === "string" ? ctx.url : row.message;
    try { target = new URL(target, "https://guardiens.fr").pathname; } catch { /* texte brut */ }
    const route = typeof ctx.route === "string" ? ctx.route : typeof ctx.pathname === "string" ? ctx.pathname : "route inconnue";
    return `[Réseau ${status}] ${method} ${target} sur ${route}`.replace(/\s+/g, " ");
  }
  const route = typeof ctx.pathname === "string" ? ctx.pathname : "route inconnue";
  const kind = row.severity === "unhandled_rejection" ? "Promesse rejetée" : "Erreur";
  return `[${kind}] ${row.message.slice(0, 160)} sur ${route}`;
}

function contextLines(row: PresentedError): string[] {
  const ctx = row.context ?? {};
  const lines: string[] = [];
  for (const key of CONTEXT_KEYS) {
    const v = ctx[key];
    if (v === undefined || v === null || v === "") continue;
    lines.push(`${key} = ${clean(typeof v === "object" ? JSON.stringify(v) : v)}`);
  }
  return lines;
}

export function buildFixBrief(
  rows: PresentedError[],
  opts: { now?: Date; prior?: Map<string, PriorResolution> } = {},
): string {
  const now = opts.now ?? new Date();
  const head = [
    `Demande de correction depuis l'admin Guardiens (/admin/errors), le ${format(now, "dd/MM/yyyy HH:mm", { locale: fr })}.`,
    `Dépôt : ${FIX_BRIEF_REPO}. Base de production : projet Lovable ${FIX_BRIEF_LOVABLE_PROJECT}, lecture seule pour le diagnostic (table error_logs).`,
    "Méthode : lire AGENTS.md, reproduire ou expliquer chaque dossier, corriger la cause (pas le symptôme), tests, branche et PR. Un dossier hors du code du site se classe sans correctif. Après mise en ligne, écrire la cause et le correctif dans error_logs.admin_notes et marquer le dossier résolu.",
    "",
    `${rows.length} dossier${rows.length > 1 ? "s" : ""} :`,
  ];
  const body = rows.map((row, i) => {
    const lines = [`${i + 1}. ${title(row)}`];
    lines.push(`   Message : ${clean(row.message)}`);
    lines.push(`   Occurrences : ${row.occurrences}, du ${day(row.first_seen_at)} au ${day(row.last_seen_at)}`);
    lines.push(`   Dossier : id ${row.id}, empreinte ${row.fingerprint}, sévérité ${row.severity}`);
    if (row.refusalReason) lines.push(`   Lecture actuelle : refus attendu (${row.refusalReason})`);
    if (row.hostingReason) lines.push(`   Lecture actuelle : ${row.hostingReason}`);
    const prior = opts.prior?.get(row.id);
    if (prior) lines.push(`   Récidive : même famille marquée résolue le ${day(prior.resolved_at)}${prior.admin_notes ? `, note : ${clean(prior.admin_notes)}` : ""}`);
    if (row.admin_notes) lines.push(`   Note admin : ${clean(row.admin_notes)}`);
    const ctx = contextLines(row);
    if (ctx.length) lines.push("   Contexte :", ...ctx.map((l) => `     ${l}`));
    if (row.stack) {
      const stack = row.stack.split("\n").slice(0, MAX_STACK_LINES).map((l) => `     ${clean(l.trim())}`);
      lines.push("   Trace :", ...stack);
    }
    if (row.user_agent) lines.push(`   Navigateur : ${clean(row.user_agent).slice(0, 160)}`);
    return lines.join("\n");
  });
  return [...head, "", body.join("\n\n")].join("\n");
}
