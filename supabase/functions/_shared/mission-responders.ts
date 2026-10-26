// Lot E17 « La boucle tenue » : répondants en attente nommés dans les emails
// du demandeur, chacun avec un bouton « Choisir {prénom} » porteur d'un jeton.
//
// La liste vient de mission_pending_responders (migration 0099), qui émet le
// jeton de choix de chaque réponse en attente (emit_mission_choose_token).
// Logique pure et testable, sans import npm : les gabarits React l'utilisent
// pour l'affichage, les fonctions edge pour la lecture.

export const SITE_URL = "https://guardiens.fr";

export interface PendingResponder {
  responseId: string;
  firstName: string;
  distanceKm: number | null;
  helpsWith: string | null;
  verified: boolean;
  exchangeDate: string | null;
  chooseToken: string;
}

/** Prénom seul, initiale en capitale. */
export function responderFirstName(value: unknown): string {
  const word = String(value ?? "").trim().split(/\s+/)[0] ?? "";
  return word ? word.charAt(0).toUpperCase() + word.slice(1) : "";
}

/** Normalise la liste reçue de la base (ou d'un templateData) ; écarte toute ligne sans jeton. */
export function normalizeResponders(raw: unknown): PendingResponder[] {
  if (!Array.isArray(raw)) return [];
  const out: PendingResponder[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const token = typeof r.chooseToken === "string" ? r.chooseToken.trim() : "";
    if (!token) continue;
    const dist = typeof r.distanceKm === "number" && Number.isFinite(r.distanceKm)
      ? Math.max(0, Math.round(r.distanceKm))
      : null;
    const helps = typeof r.helpsWith === "string" && r.helpsWith.trim() ? r.helpsWith.trim() : null;
    const date = typeof r.exchangeDate === "string" && r.exchangeDate.trim() ? r.exchangeDate.trim() : null;
    out.push({
      responseId: String(r.responseId ?? ""),
      firstName: responderFirstName(r.firstName),
      distanceKm: dist,
      helpsWith: helps,
      verified: r.verified === true,
      exchangeDate: date,
      chooseToken: token,
    });
  }
  return out;
}

/** Lien du bouton « Choisir {prénom} » : la page /entraide/choisir accepte la réponse sans connexion. */
export function chooseUrl(token: string): string {
  return `${SITE_URL}/entraide/choisir?t=${encodeURIComponent(token)}`;
}

/**
 * Lot E23 : lien de l'auteur vers la fiche de son besoin. Le lien profond
 * (/acces?t=…) ouvre sa session ou le fait passer par la connexion, puis le
 * dépose sur la fiche. Sans lien profond, la fiche porte ?vous=auteur : la vue
 * visiteur affiche alors « C'est votre besoin » et la connexion.
 */
export const AUTHOR_PARAM = "vous";
export const AUTHOR_PARAM_VALUE = "auteur";

export function authorMissionUrl(missionId: unknown, deepLinkUrl?: unknown): string {
  if (typeof deepLinkUrl === "string" && deepLinkUrl.startsWith(`${SITE_URL}/acces?t=`)) return deepLinkUrl;
  const id = typeof missionId === "string" && /^[0-9a-f-]{36}$/i.test(missionId) ? missionId : null;
  return id
    ? `${SITE_URL}/petites-missions/${id}?${AUTHOR_PARAM}=${AUTHOR_PARAM_VALUE}`
    : `${SITE_URL}/petites-missions`;
}

/** Libellé du bouton. */
export function chooseLabel(r: Pick<PendingResponder, "firstName">): string {
  return r.firstName ? `Choisir ${r.firstName}` : "Choisir cette personne";
}

/** « à 3 km », ou rien sans distance connue. */
export function responderDistanceLabel(km: number | null): string {
  return km == null ? "" : `à ${km} km`;
}

/** Date proposée, lisible en français (« samedi 4 octobre »). */
export function exchangeDateLabel(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso}T12:00:00Z` : iso);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Europe/Paris",
  }).format(d);
}

/** Phrase sous la liste : le geste et ce qu'il produit, en une ligne. */
export function chooseHint(count: number): string {
  return count > 1
    ? "Un clic sur « Choisir » suffit, sans vous connecter : la conversation s'ouvre aussitôt avec la personne choisie, et les autres reçoivent un merci."
    : "Un clic suffit, sans vous connecter : la conversation s'ouvre aussitôt.";
}

/** Lecture des répondants en attente d'un besoin ; liste vide en cas d'échec. */
export async function fetchPendingResponders(supabase: any, missionId: string): Promise<PendingResponder[]> {
  try {
    const { data, error } = await supabase.rpc("mission_pending_responders", { p_mission_id: missionId });
    if (error) {
      console.error("[mission-responders]", error.message);
      return [];
    }
    return normalizeResponders(data);
  } catch (e) {
    console.error("[mission-responders]", e instanceof Error ? e.message : String(e));
    return [];
  }
}
