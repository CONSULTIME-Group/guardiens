/**
 * Taxonomie compétences, version 2026.
 *
 * Mécanique : l'utilisateur ne saisit QUE des compétences spécifiques
 * (« promenade chiens », « taille de haies »…). Les 4 catégories
 * fonctionnelles sont DÉRIVÉES automatiquement de ces compétences via
 * un matching par mots-clés. Plus de toggle générique à cocher en UI.
 *
 * Les 4 clés DB (`jardin`, `animaux`, `competences`, `coups_de_main`)
 * sont préservées pour la rétro-compatibilité (champ `skill_categories`
 * dans `profiles` et le filtre `missionCategoryFilter` dans Search).
 */

export type SkillCategoryKey = "jardin" | "animaux" | "competences" | "coups_de_main";

export interface SkillCategory {
  key: SkillCategoryKey;
  label: string;
  /** Suggestions affichées dans l'autocomplete quand l'input est vide. */
  suggestions: string[];
}

export const SKILL_CATEGORIES: readonly SkillCategory[] = [
  {
    key: "animaux",
    label: "Animaux",
    suggestions: [
      "Promenade chiens",
      "Soins chats",
      "Soins chevaux",
      "Administration médicaments animaux",
      "Éducation canine",
      "Premiers secours animaux",
    ],
  },
  {
    key: "jardin",
    label: "Jardin",
    suggestions: [
      "Tonte et entretien jardin",
      "Taille de haies",
      "Entretien piscine",
      "Arrosage plantes",
      "Potager",
      "Horticulture",
    ],
  },
  {
    key: "competences",
    label: "Savoirs & langues",
    suggestions: [
      "Anglais courant",
      "Cuisine végétarienne",
      "Pâtisserie",
      "Informatique",
      "Aide aux devoirs",
      "Photographie",
    ],
  },
  {
    key: "coups_de_main",
    label: "Coups de main",
    suggestions: [
      "Courses pour personne âgée",
      "Petites réparations",
      "Bricolage",
      "Aide administrative",
      "Transport",
      "Ménage occasionnel",
    ],
  },
] as const;

/**
 * Patterns par catégorie. Chaque pattern matche en insensible à la casse
 * et tolère pluriels / accents légers. Une compétence peut tomber dans
 * plusieurs catégories (« promenade animaux » → animaux uniquement,
 * « jardinage et soins chats » → jardin + animaux).
 */
const KEYWORDS: Record<SkillCategoryKey, RegExp[]> = {
  animaux: [
    /chien|chiot|chat|chaton|cheval|chevaux|poney|lapin|rongeur|oiseau|reptile|poule|poulailler|nac|ferme/i,
    /animal|animaux|animali[èe]re?/i,
    /v[ée]t[ée]rinair|dressage|[ée]ducation can|comportement|promenade|prom[èe]ne|injection|m[ée]dicament|pension/i,
    /soin.*(chien|chat|cheval|animal|poule|lapin)/i,
  ],
  jardin: [
    /jardin|jardinage|potager|horticulture/i,
    /tonte|gazon|pelouse|haie|taille|[ée]lagage|arrosage|plante|fleur|massif|arbuste/i,
    /piscine/i,
  ],
  competences: [
    /anglais|allemand|espagnol|italien|portugais|chinois|arabe|langue/i,
    /cuisine|p[âa]tisserie|recette|repas/i,
    /informatique|num[ée]rique|web|excel|word|ordinateur|smartphone/i,
    /scolaire|devoirs|cours|p[ée]dagog|enseign/i,
    /photo|art|musique|peinture|dessin|[ée]criture|lecture/i,
    /administrat|comptab|fiscal|juridique/i,
    /diplôme|dipl[ôo]me|certif/i,
  ],
  coups_de_main: [
    /courses|livraison|transport|chauffeur|covoit/i,
    /m[ée]nage|repassage|linge/i,
    /bricolage|r[ée]paration|montage|d[ée]m[ée]nagement|peinture mur|plomberie|[ée]lectricit/i,
    /accompagn|aide.*(pers|[âa]g[ée])/i,
  ],
};

/**
 * Dérive les catégories couvertes par une liste de compétences spécifiques.
 * Fallback : si aucune catégorie ne matche, retourne « competences »
 * (savoirs & langues) pour que la compétence reste filtrable.
 */
export function deriveCategoriesFromCompetences(
  competences: string[],
): SkillCategoryKey[] {
  if (!competences?.length) return [];
  const set = new Set<SkillCategoryKey>();
  for (const raw of competences) {
    const c = (raw || "").trim();
    if (!c) continue;
    let matched = false;
    (Object.keys(KEYWORDS) as SkillCategoryKey[]).forEach((cat) => {
      if (KEYWORDS[cat].some((rx) => rx.test(c))) {
        set.add(cat);
        matched = true;
      }
    });
    if (!matched) set.add("competences");
  }
  return Array.from(set);
}

/**
 * Devine la catégorie d'UNE compétence (pour grouper visuellement les pills).
 * Retourne la première catégorie qui matche, fallback `competences`.
 */
export function inferCategoryForCompetence(label: string): SkillCategoryKey {
  const c = (label || "").trim();
  if (!c) return "competences";
  for (const cat of Object.keys(KEYWORDS) as SkillCategoryKey[]) {
    if (KEYWORDS[cat].some((rx) => rx.test(c))) return cat;
  }
  return "competences";
}

/**
 * Regroupe une liste de compétences par catégorie dérivée.
 * Préserve l'ordre de chaque sous-liste.
 */
export function groupByCategory(
  competences: string[],
): Record<SkillCategoryKey, string[]> {
  const out: Record<SkillCategoryKey, string[]> = {
    animaux: [],
    jardin: [],
    competences: [],
    coups_de_main: [],
  };
  for (const c of competences || []) {
    const cat = inferCategoryForCompetence(c);
    out[cat].push(c);
  }
  return out;
}

export function getCategoryLabel(key: SkillCategoryKey): string {
  return SKILL_CATEGORIES.find((c) => c.key === key)?.label ?? key;
}
