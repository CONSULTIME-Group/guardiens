/**
 * Lot ADM20 (audit admin du 11/11/2026) : annonce encore « Cherche un
 * gardien » alors que sa date de début est passée, avec au moins une
 * candidature en attente. Même règle que la file startedWaiting de
 * admin_human_queues (drizzle 0139), la ligne de la vue d'ensemble et le
 * filtre « Commencées, candidats en attente » de /admin/listings.
 *
 * Le 11/11/2026, deux annonces étaient dans ce cas (10 et 1 candidatures),
 * hors de la tuile « Candidatures sans réponse » (gardes à venir seulement)
 * et hors de la liste de travail.
 */
import { isPastDay } from "@/lib/calendarDate";

export interface StartedWaitingInput {
  status?: string | null;
  start_date?: string | null;
  activeApplications: number | null | undefined;
}

export function isListingStartedWaiting(l: StartedWaitingInput, now: Date = new Date()): boolean {
  if (l.status !== "published") return false;
  if (!l.start_date || !isPastDay(l.start_date, now)) return false;
  return typeof l.activeApplications === "number" && l.activeApplications > 0;
}

/**
 * Message type aux candidats d'une annonce commencée sans réponse du
 * propriétaire. Consigne de Jérémie (11/11/2026) : dire que nous avons
 * relancé le propriétaire et que la réponse lui revient, sur un ton
 * chaleureux et clair (première version refusée : « nul, peu chaleureux,
 * peu clair »). Aucun engagement à trouver une garde.
 */
const frDay = (iso?: string | null): string | null => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? "");
  if (!m) return null;
  const months = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
  const d = Number(m[3]);
  return `${d === 1 ? "1er" : d} ${months[Number(m[2]) - 1]}`;
};

export function startedSitCandidateMessage(input: {
  sitterFirstName?: string | null;
  ownerFirstName?: string | null;
  city?: string | null;
  startDate?: string | null;
}): { subject: string; body: string } {
  const hello = input.sitterFirstName?.trim() ? `Bonjour ${input.sitterFirstName.trim()},` : "Bonjour,";
  const owner = input.ownerFirstName?.trim() || null;
  const city = input.city?.trim() || null;
  const day = frDay(input.startDate);
  const where = city ? ` à ${city}` : "";
  const garde = owner ? `la garde de ${owner}${where}` : `une garde${where}`;
  const relance = owner ? `Nous avons écrit à ${owner} plusieurs fois` : "Nous avons écrit au propriétaire plusieurs fois";
  return {
    subject: city ? `Des nouvelles de votre candidature à ${city}` : "Des nouvelles de votre candidature",
    body: [
      hello,
      "Je vous écris moi-même, parce que vous méritez une vraie réponse.",
      `Vous avez candidaté pour ${garde}. ${relance} pour qu'une réponse vous parvienne, et son silence dure encore.${day ? ` La garde devait commencer le ${day} : elle a donc débuté sans réponse de sa part.` : ""}`,
      "Sur Guardiens, le choix du gardien revient toujours au propriétaire. Vous tenir au courant, en revanche, c'est notre rôle, et je suis désolé que vous ayez attendu si longtemps.",
      "Je referme votre candidature aujourd'hui pour que vos dates soient de nouveau libres. Votre profil reste bien visible, et plusieurs gardes cherchent quelqu'un en ce moment : elles vous attendent dans la recherche.",
      "Merci d'avoir proposé votre aide. Guardiens existe grâce à des gardiens comme vous.",
      "Jérémie, fondateur de Guardiens",
    ].join("\n\n"),
  };
}
