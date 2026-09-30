/**
 * Ligne distinctive d'un gardien dans « Près de chez vous » (lots D1, D1b).
 *
 * Logique pure. Chaque ligne dit ce qui distingue CE gardien des autres
 * gardiens affichés dans la même liste :
 *  - les savoir-faire et centres d'intérêt partagés par TOUS les gardiens
 *    affichés sont retirés (ils ne distinguent personne : chiens, chats,
 *    lecture...) ;
 *  - un savoir-faire ou un centre d'intérêt déjà cité sur une ligne
 *    précédente n'est pas répété ;
 *  - la simple garde de chiens ou de chats n'est jamais citée ;
 *  - au plus 3 fragments et 80 caractères ;
 *  - deux lignes identiques sont impossibles : une ligne qui répéterait
 *    une ligne précédente est complétée, sinon laissée vide (le composant
 *    n'affiche alors rien sous le prénom).
 */
const ANIMAL_CODE: Record<string, string> = {
  dog: "Chiens", cat: "Chats", bird: "Oiseaux", horse: "Chevaux", nac: "NAC",
  farm: "Animaux de ferme", rodent: "NAC", reptile: "NAC", rabbit: "NAC", fish: "NAC",
};

/** Codes d'espèces anglais ramenés aux libellés français (partagé avec sitterSkillGroups). */
export function normalizeAnimalTypes(animalTypes: string[] | null | undefined): string[] {
  return (animalTypes ?? [])
    .filter((a): a is string => typeof a === "string" && a.trim().length > 0)
    .map((a) => ANIMAL_CODE[a.trim()] ?? a.trim());
}

export interface DistinctSitterInput {
  completed_sits_count?: number | null;
  reviews_count?: number | null;
  reviews_avg?: number | null;
  sitter_type?: string | null;
  experience_years?: string | null;
  animal_types?: string[] | null;
  competences?: string[] | null;
  special_animal_skills?: string[] | null;
  interests?: string[] | null;
  has_vehicle?: boolean | null;
}

export const DISTINCT_LINE_MAX_FRAGMENTS = 3;
export const DISTINCT_LINE_MAX_CHARS = 80;
const MAX_ITEMS_PER_FRAGMENT = 3;
const SEP = " · ";

const COMPOSITION: Record<string, string> = {
  famille: "en famille",
  couple: "en couple",
  solo: "en solo",
};

/**
 * Savoir-faire citables, du plus distinctif au plus courant.
 * Volontairement absents : garde de chiens, garde de chats, ménage, colis.
 */
const SKILL_ITEMS: { label: string; skills?: string[]; prefixes?: string[]; animals?: string[] }[] = [
  { label: "animaux de ferme", skills: ["Animaux de ferme", "Soins animaux de ferme", "Soins poules"], animals: ["Animaux de ferme"] },
  { label: "chevaux", skills: ["Soins chevaux", "Cheval / poney"], animals: ["Chevaux"] },
  { label: "NAC", skills: ["NAC (rongeurs, reptiles, oiseaux)"], animals: ["NAC"] },
  { label: "oiseaux", animals: ["Oiseaux"] },
  { label: "médicaments", skills: ["Administration médicaments animaux", "Administration de médicaments"] },
  { label: "insuline", skills: ["Injection insuline / diabète", "Injection sous-cutanée chat"] },
  { label: "animal âgé", skills: ["Animal âgé ou en fin de vie"] },
  { label: "suivi post-opératoire", skills: ["Soin post-opératoire"] },
  { label: "premiers secours", skills: ["Premiers secours animaux", "Soins vétérinaires de base"] },
  { label: "potager", skills: ["Potager", "Soin du potager", "Jardinage naturel"] },
  { label: "arrosage des plantes", skills: ["Arrosage plantes", "Arrosage"] },
  { label: "entretien du jardin", skills: ["Tonte et entretien jardin", "Taille de haies", "Horticulture"], prefixes: ["tonte"] },
  { label: "promenades", skills: ["Promenade chiens", "promener des chiens"] },
  { label: "éducation canine", skills: ["Éducation canine", "Éducation positive"] },
  { label: "chiens réactifs ou peureux", skills: ["Chien réactif ou peureux"] },
  { label: "soins des chats", skills: ["Soins chats"] },
  { label: "chats FIV ou FeLV", skills: ["Chat FIV / FeLV"] },
  { label: "chiots et chatons", skills: ["Chiot / chaton non propre"] },
  { label: "piscine", skills: ["Entretien piscine", "Entretien bassins"] },
  { label: "petites réparations", skills: ["Petites réparations", "Bricolage", "Petits travaux", "Montage de meubles"] },
];

const norm = (s: string) => s.trim().toLowerCase();
const capFirst = (t: string) => (t ? t.charAt(0).toUpperCase() + t.slice(1) : t);
const fmtAvg = (n: number) => (Math.round(n * 10) / 10).toFixed(1).replace(".", ",");

function experienceFragment(raw: string | null | undefined): string | null {
  const v = norm(String(raw ?? ""));
  if (!v || v.startsWith("débutant") || v.startsWith("debutant")) return null;
  if (v.startsWith("5+") || v.includes("plus de 5")) return "plus de 5 ans d'expérience";
  if (v.startsWith("3-5") || v.startsWith("2-5") || v.includes("2 à 5") || v.includes("3 à 5")) {
    return "de 2 à 5 ans d'expérience";
  }
  return null;
}

/** Savoir-faire citables d'un gardien, dans l'ordre de SKILL_ITEMS. */
export function sitterSkillItems(s: DistinctSitterInput): string[] {
  const skillSet = new Set(
    [...(s.competences ?? []), ...(s.special_animal_skills ?? [])]
      .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
      .map(norm),
  );
  const animals = new Set(normalizeAnimalTypes(s.animal_types).map(norm));
  return SKILL_ITEMS.filter(
    (it) =>
      (it.skills ?? []).some((k) => skillSet.has(norm(k))) ||
      (it.prefixes ?? []).some((p) => [...skillSet].some((v) => v.startsWith(p))) ||
      (it.animals ?? []).some((a) => animals.has(norm(a))),
  ).map((it) => it.label);
}

function sitterInterests(s: DistinctSitterInput): string[] {
  const out: string[] = [];
  for (const i of s.interests ?? []) {
    if (typeof i !== "string" || !i.trim()) continue;
    const v = norm(i);
    if (!out.includes(v)) out.push(v);
  }
  return out;
}

type Fragment = { kind: "fact"; text: string } | { kind: "list"; prefix: string; items: string[] };

const fragText = (f: Fragment, maxItems = MAX_ITEMS_PER_FRAGMENT) =>
  f.kind === "fact" ? f.text : `${f.prefix}${f.items.slice(0, maxItems).join(", ")}`;

/** Fragments candidats d'un gardien, par priorité, avant tout filtrage de liste. */
function candidateFragments(
  s: DistinctSitterInput,
  skills: string[],
  interests: string[],
): Fragment[] {
  const out: Fragment[] = [];
  const sits = s.completed_sits_count ?? 0;
  if (sits > 0) out.push({ kind: "fact", text: `${sits} garde${sits > 1 ? "s" : ""} réalisée${sits > 1 ? "s" : ""}` });
  const nrev = s.reviews_count ?? 0;
  if (nrev > 0 && typeof s.reviews_avg === "number" && s.reviews_avg > 0) {
    out.push({ kind: "fact", text: `${nrev} avis, moyenne ${fmtAvg(s.reviews_avg)}` });
  }
  const comp = COMPOSITION[norm(String(s.sitter_type ?? ""))];
  if (comp) out.push({ kind: "fact", text: comp });
  // Lot R1 : « véhiculé » juste après la situation (true seulement, NULL neutre).
  if (s.has_vehicle === true) out.push({ kind: "fact", text: "véhiculé" });
  const exp = experienceFragment(s.experience_years);
  if (exp) out.push({ kind: "fact", text: exp });
  if (skills.length > 0) out.push({ kind: "list", prefix: "", items: skills });
  if (interests.length > 0) out.push({ kind: "list", prefix: "centres d'intérêt : ", items: interests });
  return out;
}

/** Fragments bruts d'un gardien seul (sans comparaison), utile aux tests. */
export function distinctFragments(s: DistinctSitterInput): string[] {
  return candidateFragments(s, sitterSkillItems(s), sitterInterests(s)).map((f) => fragText(f));
}

function buildLine(frags: Fragment[]): { line: string; used: Fragment[]; count: number } {
  const picked = frags.slice(0, DISTINCT_LINE_MAX_FRAGMENTS).map((f) => ({ f, max: MAX_ITEMS_PER_FRAGMENT }));
  const render = () => picked.map((p) => fragText(p.f, p.max)).join(SEP);
  while (picked.length > 1 && render().length > DISTINCT_LINE_MAX_CHARS) {
    const last = picked[picked.length - 1];
    if (last.f.kind === "list" && last.max > 1) last.max -= 1;
    else picked.pop();
  }
  const used = picked.map((p) =>
    p.f.kind === "list" ? ({ ...p.f, items: p.f.items.slice(0, p.max) } as Fragment) : p.f,
  );
  return { line: capFirst(render()), used, count: picked.length };
}

/** Lignes d'une liste entière, dans l'ordre d'affichage. */
export function sitterDistinctLines(sitters: DistinctSitterInput[]): string[] {
  const skillsBy = sitters.map(sitterSkillItems);
  const interestsBy = sitters.map(sitterInterests);

  // Ce que tous les gardiens affichés partagent ne distingue personne.
  const commonTo = (lists: string[][]) =>
    lists.length < 2 ? new Set<string>() : new Set(lists[0].filter((x) => lists.every((l) => l.includes(x))));
  const commonSkills = commonTo(skillsBy);
  const commonInterests = commonTo(interestsBy);

  const shownItems = new Set<string>();
  const shownLines = new Set<string>();

  return sitters.map((s, i) => {
    const skills = skillsBy[i].filter((x) => !commonSkills.has(x) && !shownItems.has(x));
    const interests = interestsBy[i].filter((x) => !commonInterests.has(x) && !shownItems.has(x));
    const frags = candidateFragments(s, skills, interests);

    let { line, used, count } = buildLine(frags);
    // Garantie : jamais deux lignes identiques.
    if (line && shownLines.has(line.toLowerCase())) {
      const next = frags[count];
      const retry = next ? buildLine([...frags.slice(0, Math.min(count, DISTINCT_LINE_MAX_FRAGMENTS - 1)), next]) : null;
      if (retry && retry.line && !shownLines.has(retry.line.toLowerCase())) ({ line, used, count } = retry);
      else return "";
    }
    used.forEach((f) => {
      if (f.kind === "list") f.items.forEach((x) => shownItems.add(x));
    });
    if (line) shownLines.add(line.toLowerCase());
    return line;
  });
}

/** Ligne d'un gardien affiché seul. */
export function sitterDistinctLine(sitter: DistinctSitterInput): string {
  return sitterDistinctLines([sitter])[0];
}

/**
 * Lot R1 : ligne propre à UNE carte de recherche. Aucun retrait des éléments
 * communs à la liste ni de non-répétition entre cartes. Avec
 * omitSitsAndReviews, gardes et note (déjà dans la ligne meta) sont exclues.
 */
export function sitterCardLine(
  sitter: DistinctSitterInput,
  opts: { omitSitsAndReviews?: boolean } = {},
): string {
  const s = opts.omitSitsAndReviews
    ? { ...sitter, completed_sits_count: 0, reviews_count: 0, reviews_avg: null }
    : sitter;
  return buildLine(candidateFragments(s, sitterSkillItems(s), sitterInterests(s))).line;
}
