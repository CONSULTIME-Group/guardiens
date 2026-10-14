/**
 * Faits de la fiche gardien publique (lot F1). Logique pure, testée.
 */
import { reviewDatesLine } from "@/lib/reviewDates";

const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

/** Coupe un texte long : au-delà de `threshold` caractères, 320 premiers sur un espace. */
export function cutLongText(
  text: string,
  threshold = 360,
  keep = 320,
): { text: string; truncated: boolean } {
  if (text.length <= threshold) return { text, truncated: false };
  const slice = text.slice(0, keep);
  const lastSpace = slice.lastIndexOf(" ");
  const cut = (lastSpace > 0 ? slice.slice(0, lastSpace) : slice).replace(/[\s,;:]+$/, "");
  return { text: `${cut}…`, truncated: true };
}

const MEETING_MAP: Record<string, string> = {
  "visio avant": "en visio",
  "visite la veille": "une visite la veille",
  "dîner/apéro avant": "un dîner ou un apéro",
  "passage le jour même": "un passage le jour même",
  "échange messagerie suffit": "par messages",
  "s'adapte au propriétaire": "à votre convenance",
  "s’adapte au propriétaire": "à votre convenance",
};

/** « Avant la garde » : ex. « En visio, ou à votre convenance ». */
export function meetingPreferenceLabel(values: string[] | null | undefined): string {
  const items = Array.from(
    new Set((values ?? []).map((v) => MEETING_MAP[String(v).trim().toLowerCase()]).filter(Boolean)),
  );
  if (items.length === 0) return "";
  if (items.length === 1) return cap(items[0]);
  return cap(`${items.slice(0, -1).join(", ")}, ou ${items[items.length - 1]}`);
}

/** « À la maison » : animaux du gardien puis rythme de vie. */
export function homeFactLabel(ownAnimals: string[] | null | undefined, lifePace: string | null | undefined): string {
  const parts: string[] = [];
  for (const raw of ownAnimals ?? []) {
    const v = String(raw ?? "").trim();
    if (!v || /^non\b/i.test(v)) continue;
    const detail = v.replace(/^oui[\s,:\-\u2013\u2014]*/i, "").trim().toLowerCase();
    if (!detail) continue;
    const label = /chat/.test(detail) ? "un chat" : /chien/.test(detail) ? "un chien" : "d'autres animaux";
    if (!parts.includes(label)) parts.push(label);
  }
  const pace = String(lifePace ?? "").trim().toLowerCase();
  if (pace) parts.push(`un rythme ${pace}`);
  return cap(parts.join(", "));
}

/** « Atouts » : formations déclarées puis véhicule. */
export function assetsLabel(certifications: string[], hasLicense: boolean | null | undefined, hasVehicle: boolean | null | undefined): string {
  const parts = [...certifications];
  if (hasVehicle && hasLicense) parts.push("permis et véhicule");
  else if (hasVehicle) parts.push("véhicule");
  return cap(parts.join(", "));
}

export function listLabel(values: string[] | null | undefined, exclude: string[] = []): string {
  const ex = exclude.map((e) => e.toLowerCase());
  return cap((values ?? []).filter((v) => v && !ex.includes(v.toLowerCase())).join(", "));
}

/**
 * Dates d'un avis (lot J2d, CGU 9.7) : « Garde du 20 au 31 août 2026 · Avis du
 * 2 septembre 2026 », la date de dépôt seule pour un avis sans garde.
 */
export function reviewDateLabel(start: string | null | undefined, end: string | null | undefined, createdAt: string): string {
  return reviewDatesLine({ created_at: createdAt, sit_start_date: start, sit_end_date: end });
}


/**
 * Accompagnants déclarés (lot L5, repris de l'ancien bloc pratique).
 * Seules les déclarations vraies produisent un texte ; rien sinon.
 */
export function companionsLabel(sp: {
  travels_with_own_animals?: boolean | null;
  travels_with_children?: boolean | null;
  own_animals?: string[] | null;
} | null | undefined): string {
  if (!sp) return "";
  const parts: string[] = [];
  if (sp.travels_with_own_animals === true) {
    const own = (sp.own_animals || [])
      .filter((x) => x && x.toLowerCase() !== "non")
      .map((x) => x.replace(/^Oui[\s,\-\u2014]*/i, "").trim())
      .filter(Boolean);
    parts.push(own.length > 0 ? `Ses animaux (${own.join(", ")})` : "Ses animaux");
  }
  if (sp.travels_with_children === true) parts.push("Parfois ses enfants");
  return parts.join(", ");
}

/**
 * Gardes accueillies par un propriétaire (lot L5) : nombre de gardes distinctes
 * portant un avis public reçu en tant que propriétaire, hors annulations.
 * Jamais le nombre d'annonces publiées.
 */
export function ownerHostedSitsCount(
  ownerReviews: Array<{ sit_id?: string | null; review_type?: string | null }> | null | undefined,
): number {
  const ids = new Set<string>();
  for (const r of ownerReviews ?? []) {
    if (!r?.sit_id || r.review_type === "annulation") continue;
    ids.add(r.sit_id);
  }
  return ids.size;
}

/* ── Fiche gardien, section « Sa façon de garder » (lot F, 11/10/2026) ── */

const startsWithVowelSound = (s: string) => /^[aeiouyhàâäéèêëîïôöùûü]/i.test(s.trim());

/** « autour de Lyon », « autour d'Écully ». */
export function aroundCity(city: string): string {
  const c = city.trim();
  return startsWithVowelSound(c) ? `autour d'${c}` : `autour de ${c}`;
}

/**
 * Zone de garde : le rayon déclaré précise « près de chez soi », les autres
 * zones disent jusqu'où le gardien accepte d'aller. Une seule ligne, pour
 * qu'un rayon de 40 km ne contredise plus une région entière affichée à côté.
 * Chaîne vide quand rien n'est déclaré.
 */
export function gardeZoneLabel(input: {
  radiusKm: number | null | undefined;
  city: string | null | undefined;
  zoneLabels: string[];
}): string {
  const LOCAL = "Près de chez soi";
  const others = input.zoneLabels.filter((z) => z && z !== LOCAL);
  const city = (input.city ?? "").trim();
  const near = input.radiusKm
    ? (city ? `Jusqu'à ${input.radiusKm} km ${aroundCity(city)}` : `Jusqu'à ${input.radiusKm} km de chez soi`)
    : input.zoneLabels.includes(LOCAL) ? LOCAL : "";
  if (near && others.length > 0) return `${near} ; aussi : ${others.join(", ")}`;
  return near || others.join(", ");
}

/** « Délai pour le prévenir » : « 2 semaines avant la garde, idéalement ». */
export function noticeDelayLabel(optionLabel: string | null | undefined): string {
  const v = (optionLabel ?? "").trim();
  return v ? `${v} avant la garde, idéalement` : "";
}
