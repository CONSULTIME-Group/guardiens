/**
 * Lot A4 (audit Alma du 14/10/2026) : règles de la lettre de candidature
 * rédigée par Alma (draft-application-letter).
 *
 *  - Une lettre ne se rédige que pour une annonce publiée et ouverte aux
 *    candidatures, d'un autre membre : un brouillon, une annonce close ou
 *    sa propre annonce restent hors de portée (aucune lecture d'autrui).
 *  - La lettre de repli n'affirme rien à la place du gardien : elle cite
 *    les dates de l'annonce, jamais sa disponibilité, et n'invente aucune
 *    qualité.
 *
 * Module pur, testé par vitest (src/__tests__/a4/).
 */

export interface LetterSit {
  user_id?: string | null;
  status?: string | null;
  accepting_applications?: boolean | null;
}

/** Motif de refus, ou null quand la lettre peut être rédigée. */
export function letterSitRefusal(sit: LetterSit | null | undefined, userId: string): "not_found" | "not_open" | "own_sit" | null {
  if (!sit) return "not_found";
  if (sit.status !== "published" || sit.accepting_applications === false) return "not_open";
  if (sit.user_id && sit.user_id === userId) return "own_sit";
  return null;
}

function fmtDate(d?: string | null): string | null {
  if (!d) return null;
  const date = new Date(`${String(d).slice(0, 10)}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

export interface FallbackLetterContext {
  ownerFirstName?: string | null;
  city?: string | null;
  petsLabel?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  sitterFirstName?: string | null;
  sitterExperienceYears?: number | null;
}

/** Lettre de repli : faits de l'annonce et du profil seulement, sans affirmation de disponibilité. */
export function buildFallbackDraft(ctx: FallbackLetterContext): string {
  const salut = `Bonjour${ctx.ownerFirstName ? ` ${ctx.ownerFirstName}` : ""},`;
  const l1Parts: string[] = ["Votre annonce"];
  if (ctx.petsLabel) l1Parts.push(`pour ${ctx.petsLabel}`);
  if (ctx.city) l1Parts.push(`à ${ctx.city}`);
  l1Parts.push("a retenu mon attention.");
  const l1 = l1Parts.join(" ");

  const l2 = ctx.sitterExperienceYears && ctx.sitterExperienceYears > 0
    ? `Je pratique le house-sitting depuis ${ctx.sitterExperienceYears} an${ctx.sitterExperienceYears > 1 ? "s" : ""}.`
    : "J'aimerais en savoir plus sur les habitudes de vos animaux et le rythme de la maison.";

  const start = fmtDate(ctx.startDate);
  const end = fmtDate(ctx.endDate);
  const l3 = start && end ? `J'ai bien noté les dates de la garde, du ${start} au ${end}.` : "";

  const l4 = "Échangeons par message pour voir si nos attentes se rejoignent.";
  const l5 = "Belle journée,";

  return [salut, "", l1, "", [l2, l3].filter(Boolean).join(" "), "", l4, "", l5].join("\n");
}
