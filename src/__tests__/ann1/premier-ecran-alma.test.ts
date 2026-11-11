/**
 * Lot ANN1 (11/11/2026) : premier écran de « Publier une annonce », Alma
 * remplit l'annonce, trie le besoin, et la preuve affichée est le nombre
 * réel de gardiens à moins de 50 km.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildNearbyProof, pickNearbyFaces, kmBetween, NEARBY_PROOF_MIN_LOCAL } from "@/lib/nearbyProof";
import { readSitDraftReply, entraidePrefillHref } from "@/lib/sitNeedSort";
import { resolveNeedKind, hasSitDraftFields, NEED_KIND_RULE } from "../../../supabase/functions/draft-sit-from-prompt/need-kind";

const read = (f: string) => readFileSync(resolve(process.cwd(), f), "utf8");

describe("preuve : gardiens à moins de 50 km", () => {
  it("dit le nombre réel et cite trois prénoms", () => {
    const p = buildNearbyProof({ localCount: 23, nationalCount: null, names: ["Marie", "Sylvain", "Camille"] })!;
    expect(p.scope).toBe("local");
    expect(p.headline).toBe("23 gardiens à moins de 50 km de chez vous");
    expect(p.line).toBe("Marie, Sylvain, Camille et 20 autres voient votre annonce dès sa publication. Ceux que votre garde intéresse vous écrivent.");
  });
  it("sans trois prénoms, la phrase reste vraie", () => {
    const p = buildNearbyProof({ localCount: 9, nationalCount: null, names: ["Marie"] })!;
    expect(p.line.startsWith("Ils voient votre annonce")).toBe(true);
    expect(p.names).toEqual([]);
  });
  it("sous le seuil ou sans position, le total des inscrits prend le relais", () => {
    expect(NEARBY_PROOF_MIN_LOCAL).toBe(5);
    const low = buildNearbyProof({ localCount: 4, nationalCount: 1213 })!;
    expect(low.scope).toBe("national");
    expect(low.headline).toBe("1 213 gardiens inscrits sur Guardiens");
    expect(buildNearbyProof({ localCount: null, nationalCount: 1213 })!.scope).toBe("national");
  });
  it("aucun chiffre lu : aucun bloc, jamais de zéro", () => {
    expect(buildNearbyProof({ localCount: 0, nationalCount: null })).toBeNull();
    expect(buildNearbyProof({ localCount: null, nationalCount: null })).toBeNull();
  });
  it("visages : dans le rayon, sans le membre lui-même", () => {
    const lyon = { lat: 45.76, lng: 4.83, id: "me" };
    const faces = pickNearbyFaces(lyon, [
      { id: "me", first_name: "Moi", avatar_url: "a", latitude_approx: 45.76, longitude_approx: 4.83 },
      { id: "a", first_name: "Marie Dupont", avatar_url: "a", latitude_approx: 45.8, longitude_approx: 4.9 },
      { id: "b", first_name: "Paul", avatar_url: "b", latitude_approx: 48.85, longitude_approx: 2.35 },
      { id: "c", first_name: null, avatar_url: "c", latitude_approx: 45.7, longitude_approx: 4.8 },
    ]);
    expect(faces.map((f) => f.first_name)).toEqual(["Marie"]);
    expect(Math.round(kmBetween({ lat: 45.76, lng: 4.83 }, { lat: 48.85, lng: 2.35 }))).toBeGreaterThan(380);
  });
});

describe("tri du besoin par Alma", () => {
  it("une garde confirmée par le membre l'emporte", () => {
    expect(resolveNeedKind("coup_de_main", true)).toBe("garde");
    expect(resolveNeedKind("coup_de_main", false)).toBe("coup_de_main");
    expect(resolveNeedKind("incertain", false)).toBe("incertain");
  });
  it("une valeur absente garde le comportement d'avant", () => {
    expect(resolveNeedKind(undefined, false)).toBe("garde");
    expect(resolveNeedKind("autre", false)).toBe("garde");
  });
  it("un brouillon de garde exige ses textes", () => {
    expect(hasSitDraftFields({ title: "Garde de Nala à Lyon", specific_expectations: "x".repeat(60), daily_routine: "y".repeat(60), owner_message: "z".repeat(60) })).toBe(true);
    expect(hasSitDraftFields({ title: "", specific_expectations: "", daily_routine: "", owner_message: "" })).toBe(false);
  });
  it("la consigne nomme le coup de main et l'installation au domicile", () => {
    expect(NEED_KIND_RULE).toContain("s'installe chez lui");
    expect(NEED_KIND_RULE).toContain("ramener");
  });
  it("la fonction n'enregistre rien pour un coup de main", () => {
    const src = read("supabase/functions/draft-sit-from-prompt/index.ts");
    const sort = src.indexOf('if (needKind !== "garde") return json({ needKind }, 200);');
    expect(sort).toBeGreaterThan(-1);
    expect(sort).toBeLessThan(src.indexOf('.from("sits")\n      .insert('));
    expect(sort).toBeLessThan(src.indexOf(".insert({ user_id: userId })"));
  });
});

describe("réponse lue par le site", () => {
  it("brouillon, tri, erreur", () => {
    expect(readSitDraftReply({ draftId: "abc", confidence: 0.8 })).toEqual({ kind: "draft", draftId: "abc", confidence: 0.8, generatedLength: null });
    expect(readSitDraftReply({ needKind: "coup_de_main" })).toEqual({ kind: "sorted", need: "coup_de_main" });
    expect(readSitDraftReply({ needKind: "incertain" })).toEqual({ kind: "sorted", need: "incertain" });
    expect(readSitDraftReply({ error: "Limite atteinte." })).toEqual({ kind: "error", message: "Limite atteinte." });
    expect(readSitDraftReply(null).kind).toBe("error");
  });
  it("l'Entraide reçoit titre et description à relire", () => {
    const href = entraidePrefillHref({ title: "Ramener mon chien samedi", description: "Je cherche une personne du coin." });
    expect(href.startsWith("/petites-missions/creer?")).toBe(true);
    const q = new URLSearchParams(href.split("?")[1]);
    expect(q.get("titre")).toBe("Ramener mon chien samedi");
    expect(q.get("via")).toBe("alma");
  });
});

describe("écran", () => {
  const page = read("src/pages/CreateSit.tsx");
  const welcome = read("src/components/sits/create/SitCreateWelcome.tsx");
  it("le premier écran remplace la bulle et reste pendant la saisie", () => {
    expect(page).toContain("<SitCreateWelcome");
    expect(page).not.toContain("Non merci, je remplis manuellement");
    expect(page).toContain("const [welcomeOn, setWelcomeOn] = useState(false);");
  });
  it("un profil qui préremplit l'environnement ou la photo garde l'écran (lot ANN1b)", () => {
    const i = page.indexOf("const nothingWritten =");
    const block = page.slice(i, page.indexOf("const welcomeEligible =", i));
    expect(i).toBeGreaterThan(-1);
    expect(block).not.toContain("sitEnvironments");
    expect(block).not.toContain("coverPhotoUrl");
    expect(block).not.toContain("openTo");
    expect(page).toContain("&& nothingWritten && currentStep === 0");
  });
  it("« À mon domicile » est choisi d'office", () => {
    expect(page).toContain('useState<"home" | "away" | null>("home")');
  });
  it("micro de 76 px, gratuité, rencontre au choix, aucun tiret long", () => {
    expect(welcome).toContain("h-[76px] w-[76px]");
    expect(welcome).toContain("Guardiens est gratuit.");
    expect(welcome).toContain("La rencontre avant la garde est à votre choix.");
    for (const src of [welcome, read("src/lib/nearbyProof.ts"), read("src/lib/sitNeedSort.ts")]) {
      expect(src).not.toMatch(/[—–]/);
    }
  });
  it("un seul bouton plein par état de la carte Alma", () => {
    const sortedBlock = welcome.slice(welcome.indexOf('data-testid="sit-need-sorted"'), welcome.indexOf("Racontez votre absence"));
    expect((sortedBlock.match(/variant="outline"/g) ?? []).length).toBe(2);
  });
});
