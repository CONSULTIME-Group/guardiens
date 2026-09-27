/**
 * Ligne distinctive d'un gardien dans « Près de chez vous » (lot D1).
 * Logique pure : jusqu'à 3 fragments joints par « · », par priorité
 * (confiance réelle, composition, expérience, savoir-faire, centres
 * d'intérêt). Un fragment déjà affiché sur une ligne précédente est sauté,
 * afin que deux lignes ne se répètent jamais.
 */
import { groupSitterSkills } from "@/lib/sitterSkillGroups";

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
}

export const DISTINCT_LINE_MAX_FRAGMENTS = 3;

const COMPOSITION: Record<string, string> = {
  famille: "En famille",
  couple: "En couple",
  solo: "En solo",
};

function experienceFragment(raw: string | null | undefined): string | null {
  const v = String(raw ?? "").trim().toLowerCase();
  if (!v || v.startsWith("débutant") || v.startsWith("debutant")) return null;
  if (v.startsWith("5+") || v.includes("plus de 5")) return "plus de 5 ans d'expérience";
  if (v.startsWith("3-5") || v.startsWith("2-5") || v.includes("2 à 5") || v.includes("3 à 5")) {
    return "de 2 à 5 ans d'expérience";
  }
  return null;
}

const fmtAvg = (n: number) => (Math.round(n * 10) / 10).toFixed(1).replace(".", ",");

/** Fragments candidats, dans l'ordre de priorité. */
export function distinctFragments(s: DistinctSitterInput): string[] {
  const out: string[] = [];
  // a) confiance réelle
  const sits = s.completed_sits_count ?? 0;
  if (sits > 0) out.push(`${sits} garde${sits > 1 ? "s" : ""} réalisée${sits > 1 ? "s" : ""}`);
  const nrev = s.reviews_count ?? 0;
  if (nrev > 0 && typeof s.reviews_avg === "number" && s.reviews_avg > 0) {
    out.push(`${nrev} avis, ${fmtAvg(s.reviews_avg)}`);
  }
  // b) composition
  const comp = COMPOSITION[String(s.sitter_type ?? "").trim().toLowerCase()];
  if (comp) out.push(comp);
  // c) expérience
  const exp = experienceFragment(s.experience_years);
  if (exp) out.push(exp);
  // d) savoir-faire
  const { groups } = groupSitterSkills({
    animalTypes: s.animal_types,
    competences: s.competences,
    specialSkills: s.special_animal_skills,
  });
  const skills = groups.slice(0, 3).map((g) => g.label.toLowerCase());
  if (skills.length > 0) out.push(skills.join(", "));
  // e) centres d'intérêt
  const interests = (s.interests ?? [])
    .filter((i): i is string => typeof i === "string" && i.trim().length > 0)
    .slice(0, 3)
    .map((i) => i.trim().toLowerCase());
  if (interests.length > 0) out.push(`centres d'intérêt : ${interests.join(", ")}`);
  return out;
}

const capFirst = (t: string) => (t ? t.charAt(0).toUpperCase() + t.slice(1) : t);

/**
 * Construit la ligne et enregistre ses fragments dans `dejaAffiches`
 * (mutation volontaire : on appelle la fonction ligne après ligne).
 */
export function sitterDistinctLine(sitter: DistinctSitterInput, dejaAffiches: Set<string>): string {
  const picked: string[] = [];
  for (const f of distinctFragments(sitter)) {
    if (picked.length >= DISTINCT_LINE_MAX_FRAGMENTS) break;
    if (dejaAffiches.has(f)) continue;
    picked.push(f);
  }
  picked.forEach((f) => dejaAffiches.add(f));
  return capFirst(picked.join(" · "));
}

/** Lignes d'une liste entière, dans l'ordre d'affichage. */
export function sitterDistinctLines(sitters: DistinctSitterInput[]): string[] {
  const seen = new Set<string>();
  return sitters.map((s) => sitterDistinctLine(s, seen));
}
