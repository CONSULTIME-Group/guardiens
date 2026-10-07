/**
 * Lot J2-B : règles déterministes du rejeu d'Alma. Logique pure et testée.
 */
import {
  ALMA_KNOWLEDGE_EXCLUDED_ROUTES,
  ALMA_SITE_KNOWLEDGE,
} from "../../../supabase/functions/_shared/alma-site-knowledge";

export interface ReplayAnswer {
  question: string;
  answer: string;
  action?: { label: string; path: string } | null;
  chips?: { label: string; path?: string; prompt?: string }[] | null;
  register?: string | null;
  frustration?: number | null;
  confirmedSit?: boolean | null;
  /** Lot L1 : attentes propres au cas (voir almaReplayCases). */
  expect?: { mentionsOwner?: boolean; mentions?: string[]; actionPath?: string; forbidden?: string[]; placeNotAvailable?: string[]; forbiddenActionPrefix?: string; mentionsAny?: string[][]; aiDisclosure?: boolean } | null;
}

export interface ReplayVerdict {
  passed: boolean;
  reasons: string[];
}

const KNOWN_ROUTES: string[] = [
  ...ALMA_SITE_KNOWLEDGE.flatMap((e) => [e.path, ...(e.aliases ?? [])]),
  ...ALMA_KNOWLEDGE_EXCLUDED_ROUTES,
  "/contact",
];

function routeRegex(route: string): RegExp {
  const body = route
    .split("/")
    .map((seg) => (seg.startsWith(":") ? "[^/]+" : seg.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))
    .join("/");
  return new RegExp(`^${body}/?$`);
}
const ROUTE_RES = KNOWN_ROUTES.map(routeRegex);

/** Vrai quand le chemin (sans requête ni ancre) correspond à une page réelle. */
export function isKnownPath(path: string): boolean {
  const clean = path.split(/[?#]/)[0].replace(/[.,;:!)]+$/, "");
  return ROUTE_RES.some((re) => re.test(clean));
}

/** Chemins internes cités dans un texte. */
export function pathsInText(text: string): string[] {
  return [...text.matchAll(/(?:^|[\s(«"'])(\/[a-z0-9][a-z0-9\-/._:?=&%]*)/gi)].map((m) => m[1]);
}

const FORBIDDEN: [RegExp, string][] = [
  [/gratuit/i, "mot proscrit « gratuit »"],
  [/voisin/i, "mot proscrit « voisin »"],
  [/[\u2014\u2013]/, "tiret long"],
  [/\p{Extended_Pictographic}/u, "emoji"],
];

const PROFILE_SCORE = /(score|points?|compl[ée]tion|\d+\s*%)[^.]{0,60}profil|profil[^.]{0,60}(score|points?|compl[ée]tion|\d+\s*%)/i;
const HUMOR = /(aboy|facteur|ma balle|canap[ée]|croquette|ma gamelle|ma queue|haha|blague|chiffonn)/i;
const SIT_CLAIM = /(votre garde (commence|d[ée]marre|approche)|votre d[ée]part approche)/i;

/**
 * Lot J4 : un remerciement ou une clôture n'appelle aucune action (cas-29).
 * Message court, fait uniquement de formules de clôture ; toute autre
 * question garde l'exigence d'une action cliquable.
 */
const CLOSING = /^(merci( beaucoup| bien)?|au revoir|bonne (journ[ée]e|soir[ée]e|nuit)|[àa] bient[ôo]t|parfait|super|d'accord|ok|tr[èe]s bien|c'est not[ée])([ ,!.]+(merci|alma|beaucoup|bonne journ[ée]e|[àa] bient[ôo]t))*[ !.]*$/i;
export function isClosingMessage(question: string): boolean {
  const q = question.trim();
  return q.length <= 40 && CLOSING.test(q);
}

/** Lot J4 : l'information d'abord, jamais une anecdote en première phrase. */
const OPENING_ANECDOTE = /^[^.!?\n]{0,80}(sieste|marche du milieu|escalier|j'ai (pass[ée] la nuit|dormi|r[êe]v[ée])|mes pattes|chiffonn|[ée]cureuil|courir apr[èe]s un chat|mon humeur)/i;

export function checkReplayAnswer(a: ReplayAnswer): ReplayVerdict {
  const reasons: string[] = [];
  const cited = [
    ...pathsInText(a.answer),
    ...(a.action?.path ? [a.action.path] : []),
    ...((a.chips ?? []).flatMap((c) => (c.path ? [c.path] : []))),
  ];
  for (const p of cited) if (!isKnownPath(p)) reasons.push(`chemin inexistant ${p}`);
  const all = [a.answer, a.action?.label ?? "", ...(a.chips ?? []).map((c) => c.label)].join(" ");
  for (const [re, label] of FORBIDDEN) if (re.test(all)) reasons.push(label);
  if (PROFILE_SCORE.test(a.answer) && !/profil/i.test(a.question)) reasons.push("score de profil sans demande");
  if ((a.frustration ?? 0) >= 2 && HUMOR.test(a.answer)) reasons.push("humour en frustration");
  if (SIT_CLAIM.test(a.answer) && !a.confirmedSit) reasons.push("garde affirmée sans garde confirmée");
  const quietRegister = a.register === "perso" || a.register === "sensible";
  if (!quietRegister && !isClosingMessage(a.question) && !a.action?.path) reasons.push("aucune action cliquable");
  if (a.register !== "perso" && OPENING_ANECDOTE.test(a.answer.trim())) reasons.push("anecdote en ouverture");
  const ex = a.expect;
  if (ex?.mentionsOwner && !/propri[ée]taire/i.test(a.answer)) reasons.push("propriétaire non mentionné");
  for (const w of ex?.mentions ?? []) if (!a.answer.includes(w)) reasons.push(`mention attendue « ${w} »`);
  if (ex?.actionPath && a.action?.path !== ex.actionPath) reasons.push(`action attendue ${ex.actionPath}`);
  for (const w of ex?.forbidden ?? []) if (a.answer.includes(w)) reasons.push(`mention interdite « ${w} »`);
  // Lot L3 : un lieu cité ne l'est que pour dire qu'il n'y a aucune garde.
  for (const place of ex?.placeNotAvailable ?? []) {
    for (const s of a.answer.split(/(?<=[.!?])\s+/)) {
      if (s.includes(place) && !/\baucune?\b|\bpas de\b/i.test(s)) reasons.push(`lieu présenté comme disponible « ${place} »`);
    }
  }
  if (ex?.forbiddenActionPrefix && (a.action?.label ?? "").startsWith(ex.forbiddenActionPrefix)) reasons.push(`action interdite « ${ex.forbiddenActionPrefix} »`);
  // Lot L4 : faits obligatoires, insensibles à la casse et aux accents.
  const folded = fold(a.answer);
  for (const group of ex?.mentionsAny ?? []) {
    if (!group.some((w) => folded.includes(fold(w)))) reasons.push(`fait attendu « ${group.join(" » ou « ")} »`);
  }
  if (ex?.aiDisclosure) {
    if (!/\b(ia|intelligence artificielle)\b/.test(folded)) reasons.push("nature d'IA non dite");
    if (AI_DENIAL.test(a.answer)) reasons.push("déni de la nature d'IA");
  }
  return { passed: reasons.length === 0, reasons };
}

const fold = (s: string) => (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[\u2019]/g, "'").toLowerCase();
const AI_DENIAL = /je (suis|reste) (une |un )?(vraie|vrai|r[ée]elle) (personne|humaine?)|je suis humaine|je ne suis pas (une |un )?(ia|intelligence|robot|programme|machine)/i;

/** Lot L4 : cinq premiers mots repliés, sans ponctuation. */
export function openerOf(text: string): string {
  return fold(text).replace(/[^a-z0-9' ]+/g, " ").split(" ").filter(Boolean).slice(0, 5).join(" ");
}

/** Lot L4 : vrai quand deux réponses à la même question commencent par les mêmes cinq mots. */
export function sameOpener(a: string, b: string): boolean {
  const x = openerOf(a);
  return x.length > 0 && x === openerOf(b);
}
