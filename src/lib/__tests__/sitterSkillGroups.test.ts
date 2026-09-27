import { describe, it, expect } from "vitest";
import { groupSitterSkills, skillsHeadline } from "@/lib/sitterSkillGroups";

describe("groupSitterSkills, cas réel Krystina", () => {
  const input = {
    animalTypes: ["Tous"],
    competences: ["Administration médicaments animaux","Promenade chiens","Soins chats","Soins chevaux","Arrosage plantes","Courses pour personne âgée","Transport","Ménage occasionnel"],
    specialSkills: ["Administration de médicaments","Injection insuline / diabète","NAC (rongeurs, reptiles, oiseaux)","Cheval / poney","Animaux de ferme","Animal âgé ou en fin de vie","Chien réactif ou peureux","Chat FIV / FeLV","Soin post-opératoire"],
  };
  const r = groupSitterSkills(input);
  it("quatre groupes dans l'ordre soins, ferme, chats, chiens", () => {
    expect(r.groups.map((g) => g.key)).toEqual(["soins", "ferme", "chats", "chiens"]);
  });
  it("détails attendus", () => {
    expect(r.groups.map((g) => g.detail)).toEqual([
      "Médicaments, insuline, animal âgé",
      "Animaux de ferme, chevaux, NAC",
      "Soins des chats, chats FIV ou FeLV",
      "Promenades, chiens réactifs ou peureux",
    ]);
  });
  it("totalCount 17 et titre", () => {
    expect(r.totalCount).toBe(17);
    expect(skillsHeadline(input.animalTypes, true)).toBe("Tous les animaux, y compris ceux qui demandent des soins.");
  });
});

describe("groupSitterSkills, cas limites", () => {
  it("sans compétence ni animal : aucun groupe", () => {
    expect(groupSitterSkills({ animalTypes: [], competences: [], specialSkills: [] }).groups).toEqual([]);
    expect(skillsHeadline([], false, "Paul")).toBe("Ce que Paul fait volontiers.");
  });
  it("« Chats » seul : un groupe, détail « Garde de chats »", () => {
    const r = groupSitterSkills({ animalTypes: ["Chats"], competences: [], specialSkills: [] });
    expect(r.groups).toHaveLength(1);
    expect(r.groups[0].detail).toBe("Garde de chats");
    expect(skillsHeadline(["Chats"], false)).toBe("Chats.");
  });
});
