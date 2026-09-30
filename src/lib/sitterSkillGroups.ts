import { normalizeAnimalTypes } from "@/lib/sitterDistinctLine";
/**
 * Regroupement des savoir-faire d'un gardien pour la fiche publique (lot F1).
 * Logique pure : comparaison exacte insensible à la casse, aucune donnée inventée.
 */

export type SkillGroupKey = "chats" | "chiens" | "ferme" | "soins" | "jardin" | "maison";
export type SkillSpot = "spot-chat" | "spot-chien" | "spot-poules" | "spot-bienetre" | "spot-jardin" | "spot-bricolage";

export interface SkillGroup {
  key: SkillGroupKey;
  label: string;
  detail: string;
  spot: SkillSpot;
}

interface Entry {
  /** Valeurs de compétences (competences + specialSkills). */
  skills?: string[];
  /** Préfixes de compétences (variantes libres, ex. « Tonte ... »). */
  prefixes?: string[];
  /** Valeurs d'animal_types. */
  animals?: string[];
  label: string;
  /** Libellé purement animal : affiché seulement sans autre libellé. */
  animalOnly?: boolean;
}

interface GroupDef {
  key: SkillGroupKey;
  label: string;
  spot: SkillSpot;
  entries: Entry[];
}

const GROUPS: GroupDef[] = [
  {
    key: "chats", label: "Chats", spot: "spot-chat",
    entries: [
      { skills: ["Soins chats"], label: "soins des chats" },
      { skills: ["Chat FIV / FeLV"], label: "chats FIV ou FeLV" },
      { skills: ["Chiot / chaton non propre"], label: "chatons" },
      { animals: ["Chats"], label: "garde de chats", animalOnly: true },
    ],
  },
  {
    key: "chiens", label: "Chiens", spot: "spot-chien",
    entries: [
      { skills: ["Promenade chiens", "promener des chiens"], label: "promenades" },
      { skills: ["Chien réactif ou peureux"], label: "chiens réactifs ou peureux" },
      { skills: ["Éducation canine", "Éducation positive"], label: "éducation canine" },
      { skills: ["Soins chiens", "Repas chiens", "Jeux chiens"], label: "soins des chiens" },
      { skills: ["Chiot / chaton non propre"], label: "chiots" },
      { animals: ["Chiens"], label: "garde de chiens", animalOnly: true },
    ],
  },
  {
    key: "ferme", label: "Ferme et chevaux", spot: "spot-poules",
    entries: [
      { skills: ["Animaux de ferme", "Soins animaux de ferme", "Soins poules"], label: "animaux de ferme" },
      { skills: ["Soins chevaux", "Cheval / poney"], animals: ["Chevaux"], label: "chevaux" },
      { skills: ["NAC (rongeurs, reptiles, oiseaux)"], animals: ["NAC"], label: "NAC" },
      { animals: ["Oiseaux"], label: "oiseaux" },
      { animals: ["Animaux de ferme"], label: "animaux de ferme" },
    ],
  },
  {
    key: "soins", label: "Soins attentifs", spot: "spot-bienetre",
    entries: [
      { skills: ["Administration médicaments animaux", "Administration de médicaments"], label: "médicaments" },
      { skills: ["Injection insuline / diabète", "Injection sous-cutanée chat"], label: "insuline" },
      { skills: ["Animal âgé ou en fin de vie"], label: "animal âgé" },
      { skills: ["Soin post-opératoire"], label: "suivi post-opératoire" },
      { skills: ["Premiers secours animaux", "Soins vétérinaires de base"], label: "premiers secours" },
    ],
  },
  {
    key: "jardin", label: "Jardin et potager", spot: "spot-jardin",
    entries: [
      { skills: ["Arrosage plantes", "Arrosage"], label: "arrosage des plantes" },
      { skills: ["Potager", "Soin du potager", "Jardinage naturel"], label: "potager" },
      { skills: ["Tonte et entretien jardin", "Taille de haies", "Horticulture"], prefixes: ["tonte"], label: "entretien du jardin" },
    ],
  },
  {
    key: "maison", label: "Maison", spot: "spot-bricolage",
    entries: [
      { skills: ["Entretien piscine", "Entretien bassins"], label: "piscine" },
      { skills: ["Petites réparations", "Bricolage", "Petits travaux", "Montage de meubles"], label: "petites réparations" },
      { skills: ["Ménage occasionnel"], label: "ménage" },
      { skills: ["Réception de colis"], label: "colis" },
    ],
  },
];

/** Codes techniques d'animal_types rencontrés en base, ramenés au libellé. */
// Lot R1 : normalizeAnimalTypes vit dans sitterDistinctLine (un seul fichier partagé).
export { normalizeAnimalTypes };

const norm = (s: string) => s.trim().toLowerCase();
const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

export function groupSitterSkills(input: {
  animalTypes?: string[] | null;
  competences?: string[] | null;
  specialSkills?: string[] | null;
}): { groups: SkillGroup[]; totalCount: number } {
  const skills = [...(input.competences ?? []), ...(input.specialSkills ?? [])]
    .filter((s): s is string => typeof s === "string" && s.trim().length > 0);
  const skillSet = new Set(skills.map(norm));
  const animals = new Set(normalizeAnimalTypes(input.animalTypes).map(norm).filter((a) => a !== "tous"));

  const scored = GROUPS.map((g, order) => {
    const matchedValues = new Set<string>();
    const labels: string[] = [];
    let animalOnlyLabel: string | null = null;
    for (const e of g.entries) {
      let hit = false;
      for (const s of e.skills ?? []) {
        if (skillSet.has(norm(s))) { matchedValues.add(`s:${norm(s)}`); hit = true; }
      }
      for (const p of e.prefixes ?? []) {
        for (const v of skillSet) if (v.startsWith(p)) { matchedValues.add(`s:${v}`); hit = true; }
      }
      for (const a of e.animals ?? []) {
        if (animals.has(norm(a))) { matchedValues.add(`a:${norm(a)}`); hit = true; }
      }
      if (!hit) continue;
      if (e.animalOnly) animalOnlyLabel = e.label;
      else if (!labels.includes(e.label)) labels.push(e.label);
    }
    const shown = labels.length > 0 ? labels : animalOnlyLabel ? [animalOnlyLabel] : [];
    return {
      order,
      score: matchedValues.size,
      group: { key: g.key, label: g.label, spot: g.spot, detail: cap(shown.slice(0, 3).join(", ")) },
    };
  });

  const groups = scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score || a.order - b.order)
    .slice(0, 4)
    .map((s) => s.group);

  return { groups, totalCount: new Set(skills.map(norm)).size };
}

/** Titre de la section savoir-faire. */
export function skillsHeadline(animalTypes: string[] | null | undefined, hasSoins: boolean, firstName = ""): string {
  const list = normalizeAnimalTypes(animalTypes);
  const end = hasSoins ? ", y compris ceux qui demandent des soins." : ".";
  if (list.some((a) => norm(a) === "tous")) return `Tous les animaux${end}`;
  const uniq = Array.from(new Set(list)).slice(0, 4).map((a) => (a === "NAC" ? a : a.toLowerCase()));
  if (uniq.length === 0) return `Ce que ${firstName} fait volontiers.`;
  const joined = uniq.length === 1 ? uniq[0] : `${uniq.slice(0, -1).join(", ")} et ${uniq[uniq.length - 1]}`;
  return `${cap(joined)}${end}`;
}
