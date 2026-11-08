/**
 * Lot PHOTO1 (08/11/2026) : ce que montre une photo du logement, et ce qu'on
 * en dit au propriétaire. Logique pure, partagée par la fonction
 * analyze-photo-quality (écriture du relevé) et le site (src/lib/homePhotos.ts).
 *
 * Doctrine : les photos restent facultatives au-delà de la règle de
 * publication (une photo). Le rappel propose, il ne retient personne.
 */

export const HOME_PHOTO_SUBJECTS = ["exterieur", "interieur", "jardin", "animal", "alentours", "autre"] as const;
export type HomePhotoSubject = (typeof HOME_PHOTO_SUBJECTS)[number];

export interface HomePhotoInsight {
  photo_url: string;
  user_id: string;
  subject: HomePhotoSubject;
  shows_home: boolean;
  issues: string[];
  score: number | null;
  analyzed_at?: string;
}

/** Réponse du modèle ramenée à une ligne d'owner_gallery_insights, ou null. */
export function toHomePhotoInsight(
  userId: string,
  r: { url?: unknown; subject?: unknown; shows_home?: unknown; issues?: unknown; score?: unknown },
): HomePhotoInsight | null {
  if (typeof r.url !== "string" || r.url.trim() === "") return null;
  if (typeof r.shows_home !== "boolean") return null;
  const subject = (HOME_PHOTO_SUBJECTS as readonly string[]).includes(String(r.subject))
    ? (r.subject as HomePhotoSubject)
    : "autre";
  const issues = Array.isArray(r.issues) ? r.issues.filter((i): i is string => typeof i === "string").slice(0, 10) : [];
  const score = typeof r.score === "number" && Number.isFinite(r.score)
    ? Math.max(0, Math.min(100, Math.round(r.score)))
    : null;
  return { photo_url: r.url, user_id: userId, subject, shows_home: r.shows_home, issues, score };
}

/** En dessous de ce nombre de photos du logement, le rappel s'affiche. */
export const HOME_PHOTO_MIN_COUNT = 3;

export type HomePhotoGap = "none" | "no_photo" | "few" | "no_home";

/**
 * Ce qui manque aux photos d'une annonce.
 * - aucune photo : no_photo ;
 * - moins de trois : few ;
 * - trois ou plus, au moins une analysée, aucune analysée ne montre le
 *   logement : no_home ;
 * - sinon (photos non analysées comprises) : none.
 */
export function homePhotoGap(
  photoUrls: readonly string[],
  insights: ReadonlyArray<Pick<HomePhotoInsight, "photo_url" | "shows_home">>,
): HomePhotoGap {
  const urls = photoUrls.filter((u) => typeof u === "string" && u.trim() !== "");
  if (urls.length === 0) return "no_photo";
  if (urls.length < HOME_PHOTO_MIN_COUNT) return "few";
  const byUrl = new Map(insights.map((i) => [i.photo_url, i.shows_home]));
  const analyzed = urls.filter((u) => byUrl.has(u));
  if (analyzed.length === 0) return "none";
  return analyzed.some((u) => byUrl.get(u) === true) ? "none" : "no_home";
}

/**
 * Conseil affiché sous une photo qui vient d'être ajoutée, le plus utile
 * d'abord. Formulation affirmative, vouvoiement.
 */
export function homePhotoTip(i: Pick<HomePhotoInsight, "shows_home" | "issues" | "subject">): string | null {
  const has = (k: string) => i.issues.includes(k);
  if (has("sombre")) return "Photo un peu sombre : prise en journée, rideaux ouverts, la pièce paraîtra plus accueillante.";
  if (has("flou")) return "Photo un peu floue : tenez le téléphone à deux mains, ou posez-le sur un meuble.";
  if (has("désordre")) return "Un premier plan dégagé met la pièce en valeur : quelques objets rangés suffisent.";
  if (has("surexposée")) return "Beaucoup de lumière en face : photographiez dos à la fenêtre.";
  if (has("cadrage_serré")) return "Reculez un peu pour montrer toute la pièce.";
  if (!i.shows_home) return "Belle photo. Ajoutez aussi une photo de la maison : l'extérieur, la pièce de vie ou la chambre.";
  return null;
}
