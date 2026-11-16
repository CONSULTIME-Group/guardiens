/**
 * Lot CAND1 (16/11/2026) : accusé de réception lu par le candidat sous
 * « Candidature envoyée ». Une candidate a écrit le 16/11 : « Je n'arrive pas
 * à savoir si ma candidature est arrivée jusqu'à vous alors je recommence. »
 * La phrase dit quand la candidature est arrivée et si le propriétaire l'a
 * ouverte (applications.viewed_at), sans genre ni promesse de réponse.
 */
const DAY_FMT = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", timeZone: "Europe/Paris" });
const KEY_FMT = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" });

function dayLabel(iso: string, now: Date): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const key = KEY_FMT.format(d);
  if (key === KEY_FMT.format(now)) return "aujourd'hui";
  if (key === KEY_FMT.format(new Date(now.getTime() - 86_400_000))) return "hier";
  return `le ${DAY_FMT.format(d)}`;
}

export interface ApplicationReceiptInput {
  ownerFirstName?: string | null;
  createdAt?: string | null;
  viewedAt?: string | null;
  status?: string | null;
}

/** Statuts pour lesquels la phrase a un sens : candidature encore ouverte. */
const OPEN_STATUSES = new Set(["pending", "viewed", "discussing"]);

export function applicationReceiptLine(input: ApplicationReceiptInput, now: Date = new Date()): string | null {
  const status = input.status ?? "pending";
  if (!OPEN_STATUSES.has(status)) return null;
  const name = (input.ownerFirstName ?? "").trim();
  const who = name ? `chez ${name}` : "chez le propriétaire";
  const arrived = input.createdAt ? dayLabel(input.createdAt, now) : "à l'instant";
  const head = `Votre candidature est arrivée ${who} ${arrived}`.trim();
  const opened = input.viewedAt
    ? `, ouverte ${dayLabel(input.viewedAt, now)}.`
    : status === "pending"
      ? ", pas encore ouverte."
      : ".";
  return `${head}${opened}`;
}
