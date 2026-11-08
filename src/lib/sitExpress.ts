/**
 * Parcours express « Deux gestes, et elle est en ligne » (lot N5).
 * Logique pure : libellés, raccourcis de dates, textes proposés.
 * Règle : aucun genre deviné pour les animaux, aucun détail inventé.
 */
import { capitalizePetName, isDeparturePeriod, type DeparturePeriod } from "@/lib/ownerDeparture";
import { MAX_TITLE_LENGTH } from "@/lib/sitPublishRules";

export interface ExpressPet { name?: string | null; species?: string | null }

/** Période express lue dans l'URL, ou null si express n'est pas demandé. */
export function readExpressParams(params: URLSearchParams): { express: boolean; period: DeparturePeriod } {
  const express = params.get("express") === "1";
  const p = params.get("periode");
  return { express, period: isDeparturePeriod(p) ? p : "plus_tard" };
}

/** Express actif seulement pour un logement décrit, après l'écran de prérequis. */
export const isExpressActive = (o: { requested: boolean; hasProperty: boolean; showSetup: boolean; loading: boolean }) =>
  o.requested && o.hasProperty && !o.showSetup && !o.loading;

/** « Mila », « Mila et Rex », « Mila, Rex et Nala ». Jamais d'espèce ni de genre. */
export const petNames = (pets: ExpressPet[]): string[] => pets.map((p) => capitalizePetName(p.name)).filter(Boolean);

/** Énumération française : virgules, et « et » seulement avant le dernier élément. */
export function joinFr(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  return `${items.slice(0, -1).join(", ")} et ${items[items.length - 1]}`;
}

export function joinPetNames(pets: ExpressPet[]): string {
  return joinFr(petNames(pets));
}

export const EXPRESS_PERIOD_HEADER: Record<DeparturePeriod, string> = {
  noel: "Votre annonce de Noël",
  hiver: "Votre annonce de cet hiver",
  printemps: "Votre annonce de ce printemps",
  ete: "Votre annonce de cet été",
  plus_tard: "Votre annonce",
};

const TITLE_PERIOD: Record<DeparturePeriod, string> = {
  noel: " pendant les fêtes",
  hiver: " cet hiver",
  printemps: " ce printemps",
  ete: " cet été",
  plus_tard: "",
};

/** Première formulation de chaque période (reprise par les tests et l'aperçu). */
export const EXPRESS_REASON: Record<DeparturePeriod, string> = {
  noel: "Nous partons pour les fêtes de fin d'année.",
  hiver: "Nous partons cet hiver.",
  printemps: "Nous partons au printemps.",
  ete: "Nous partons cet été.",
  plus_tard: "Nous partons quelques jours.",
};

/**
 * Lot L2 élargi (08/11/2026, demande de Jérémie : qu'Alma écrive autre chose
 * d'une annonce à l'autre) : plusieurs formulations par phrase, tirées par
 * annonce. Chacune reprend les seuls faits déclarés (période, noms et espèces
 * des animaux, commune) : aucun proche, aucun lieu, aucun créneau, aucun genre.
 */
const REASON_VARIANTS: Record<DeparturePeriod, string[]> = {
  noel: [EXPRESS_REASON.noel, "Nous nous absentons pour les fêtes de fin d'année.", "Les fêtes de fin d'année nous éloignent de la maison."],
  hiver: [EXPRESS_REASON.hiver, "Nous nous absentons cet hiver.", "Un départ cet hiver nous éloigne de la maison."],
  printemps: [EXPRESS_REASON.printemps, "Nous nous absentons au printemps.", "Un départ au printemps nous éloigne de la maison."],
  ete: [EXPRESS_REASON.ete, "Nous nous absentons cet été.", "Un départ cet été nous éloigne de la maison."],
  plus_tard: [EXPRESS_REASON.plus_tard, "Nous nous absentons quelques jours.", "Un départ nous éloigne de la maison quelques jours."],
};

/** Nombre de formulations par phrase (titre, absence, attentes). */
export const EXPRESS_VARIANT_COUNT = 3;

/** Indice stable tiré d'une graine (identifiant de brouillon ou de membre). Sans graine : 0. */
export function expressVariantIndex(seed: string | null | undefined, slot: number): number {
  if (!seed) return 0;
  let h = 2166136261 ^ (slot * 2654435761);
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) % EXPRESS_VARIANT_COUNT;
}

function speciesPhrase(pets: ExpressPet[]): string {
  const kinds = new Set(pets.map((p) => String(p.species ?? "")));
  const onlyDogs = [...kinds].every((k) => k === "dog");
  const onlyCats = [...kinds].every((k) => k === "cat");
  const dogsCats = [...kinds].every((k) => k === "dog" || k === "cat");
  if (onlyDogs) return "les chiens";
  if (onlyCats) return "les chats";
  if (dogsCats) return "les chiens et les chats";
  return "les animaux";
}

export interface ExpressTexts { title: string; absenceReason: string; sitterExpectations: string }

export function proposeExpressTexts(o: { period: DeparturePeriod; pets: ExpressPet[]; city?: string | null; seed?: string | null }): ExpressTexts {
  const names = joinPetNames(o.pets);
  const city = (o.city ?? "").trim();
  const where = city ? `, à ${city}` : "";
  const period = TITLE_PERIOD[o.period];
  const [ti, ri, ei] = [0, 1, 2].map((slot) => expressVariantIndex(o.seed, slot));

  const named = petNames(o.pets).length;
  const plural = named > 0 ? named > 1 : o.pets.length > 1;

  const titles = names
    ? [
        `Garde de ${names}${period}${where}`,
        `Une présence pour ${names}${period}${where}`,
        `${names} ${plural ? "attendent leur" : "attend son"} gardien${period}${where}`,
      ]
    : [
        `Garde de la maison${period}${where}`,
        `Une présence à la maison${period}${where}`,
        `La maison attend son gardien${period}${where}`,
      ];
  let title = titles[ti];
  if (title.length > MAX_TITLE_LENGTH) title = `Garde de la maison${period}${where}`.slice(0, MAX_TITLE_LENGTH);

  let sitterExpectations: string;
  if (o.pets.length > 0) {
    const subject = names || (plural ? "Nos animaux" : "Notre animal");
    const who = names || (plural ? "nos animaux" : "notre animal");
    const kinds = speciesPhrase(o.pets);
    sitterExpectations = [
      `${subject} ${plural ? "restent" : "reste"} à la maison avec ${plural ? "leurs" : "ses"} habitudes. Nous cherchons une personne attentive, à l'aise avec ${kinds}.`,
      `${subject} ${plural ? "gardent leur" : "garde son"} rythme à la maison. Nous aimerions confier la maison à une personne à l'aise avec ${kinds}.`,
      `Nous cherchons une personne à l'aise avec ${kinds} pour veiller sur ${who} et sur la maison.`,
    ][ei];
  } else {
    sitterExpectations = [
      "Nous cherchons une personne attentive pour prendre soin de la maison pendant notre absence.",
      "Nous aimerions confier la maison à une personne attentive pendant notre absence.",
      "Une présence attentive à la maison pendant notre absence nous rassurerait.",
    ][ei];
  }
  return { title, absenceReason: REASON_VARIANTS[o.period][ri], sitterExpectations };
}

export interface DatePreset { key: string; label: string; start: string; end: string }
export const NOEL_DATE_PRESETS: DatePreset[] = [
  { key: "noel_full", label: "19 déc. au 3 janv.", start: "2026-12-19", end: "2027-01-03" },
  { key: "noel_first", label: "20 au 27 déc.", start: "2026-12-20", end: "2026-12-27" },
  { key: "noel_second", label: "26 déc. au 2 janv.", start: "2026-12-26", end: "2027-01-02" },
];

/** Raccourcis dont la date de début n'est pas passée. */
export const validPresets = (today: string) => NOEL_DATE_PRESETS.filter((p) => p.start >= today);
export const firstValidPreset = (today: string) => validPresets(today)[0] ?? null;

/** Date du lendemain au format AAAA-MM-JJ. */
export function nextDay(date: string): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

export const matchingPreset = (start: string, end: string) =>
  NOEL_DATE_PRESETS.find((p) => p.start === start && p.end === end) ?? null;

const HOUSING_LABEL: Record<string, string> = {
  house: "votre maison", apartment: "votre appartement", farm: "votre ferme", chalet: "votre chalet", other: "votre logement",
};
export const housingLabel = (type?: string | null) => HOUSING_LABEL[String(type ?? "")] ?? "votre logement";

/** « On a repris votre maison, Mila et Rex et votre commune. » */
export function alreadyFilledPhrase(o: { propertyType?: string | null; pets: ExpressPet[]; city?: string | null }): string {
  const parts = [housingLabel(o.propertyType), ...petNames(o.pets)];
  if ((o.city ?? "").trim()) parts.push("votre commune");
  const list = joinFr(parts);
  return `On a repris ${list}. Ajoutez une photo, choisissez vos dates, relisez le texte.`;
}

/**
 * Brouillon repris : ce qui est déjà écrit (titre non vide, champ d'au moins
 * `min` caractères) est conservé, le reste reçoit la proposition.
 */
export function mergeExpressTexts(existing: ExpressTexts, proposed: ExpressTexts, min: number): ExpressTexts {
  return {
    title: existing.title.trim() ? existing.title : proposed.title,
    absenceReason: existing.absenceReason.trim().length >= min ? existing.absenceReason : proposed.absenceReason,
    sitterExpectations: existing.sitterExpectations.trim().length >= min ? existing.sitterExpectations : proposed.sitterExpectations,
  };
}
