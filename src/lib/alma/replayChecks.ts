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
  if (!quietRegister && !a.action?.path) reasons.push("aucune action cliquable");
  return { passed: reasons.length === 0, reasons };
}
