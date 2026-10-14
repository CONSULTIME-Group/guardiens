/**
 * Lot A1 (audit Alma en arène du 14/10/2026) : Alma dit vrai et protège.
 * Verrouille les corrections P1 faites avant le redéploiement d'alma-chat.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { selectKnowledge, triggerMatches, foldText, ALMA_SITE_KNOWLEDGE } from "../../../supabase/functions/_shared/alma-site-knowledge";
import { buildVerifiedFacts } from "../../../supabase/functions/_shared/alma-facts";
import { emptyInventory } from "../../../supabase/functions/_shared/alma-inventory";
import { computeNextAction, isAnimalEmergency, type NextActionInput } from "../../../supabase/functions/_shared/alma-next-action";
import { detectRegister, ALMA_SYSTEM_PROMPT } from "../../../supabase/functions/_shared/alma-system-prompt";
import { rewriteForbiddenWords } from "../../../supabase/functions/_shared/alma-output";
import { ALMA_VERSION } from "../../../supabase/functions/_shared/alma-version";
import { isChildCareRequest } from "@/lib/missionChildCare";
import { buildAccordDeGardeData } from "@/lib/accordDeGarde";

const read = (p: string) => readFileSync(p, "utf8");
const keys = (question: string, role: "owner" | "sitter" = "sitter") =>
  selectKnowledge({ question, role }).map((e) => e.key);

const base = (over: Partial<NextActionInput>): NextActionInput => ({
  facts: buildVerifiedFacts({ role: "owner", ownSits: [], received: [], sent: [], missions: [], today: "2026-10-14" }),
  inventory: emptyInventory({ postal_code: "69005" }),
  accountRole: "owner",
  activeRole: "owner",
  question: "Bonjour",
  register: "reassurance",
  completion: 60,
  today: "2026-10-14",
  ...over,
});

describe("A1 · carte du site par mots entiers", () => {
  it("« gardiennage » en métropole ne mène plus à la page Québec", () => {
    expect(keys("Comment se passe le gardiennage d'une maison ?")).not.toContain("gardiennage_quebec");
  });
  it("une question sur le Québec mène à la page Québec", () => {
    expect(keys("Est-ce que Guardiens existe au Québec ?")).toContain("gardiennage_quebec");
    expect(keys("Je vis à Montréal")).toContain("gardiennage_quebec");
  });
  it("« spa » ne se trouve plus dans « espace », ni « cles » dans « articles »", () => {
    expect(keys("Je veux changer d'espace")).not.toContain("associations");
    expect(triggerMatches(foldText("vos articles"), "cles")).toBe(false);
    expect(triggerMatches(foldText("les associations du coin"), "association")).toBe(true);
  });
  it("le réseau d'urgence est présenté comme à venir, sans déclencheur « demain » ni « annulation »", () => {
    const e = ALMA_SITE_KNOWLEDGE.find((x) => x.key === "urgence")!;
    expect(e.purpose).toMatch(/arrive bientôt/);
    expect(e.purpose).not.toMatch(/rayon de 35 km|alerte les gardiens/);
    expect(e.triggers).not.toContain("demain");
    expect(e.triggers).not.toContain("annulation");
  });
});

describe("A1 · « gratuit » dans la voix d'Alma (décision du 14/10/2026)", () => {
  it("« Guardiens est gratuit » passe, les autres formes restent reformulées", () => {
    expect(rewriteForbiddenWords("Guardiens est gratuit.")).toBe("Guardiens est gratuit.");
    expect(rewriteForbiddenWords("C'est gratuit.")).not.toMatch(/gratuit/i);
    expect(ALMA_SYSTEM_PROMPT).toContain("« Guardiens est gratuit »");
  });
  it("un lien d'article garde son adresse", () => {
    const t = "Lisez /actualites/voyager-gratuitement-france-house-sitting.";
    expect(rewriteForbiddenWords(t)).toBe(t);
  });
});

describe("A1 · urgence animale et garde d'enfants", () => {
  it.each([
    "Mon chien a avalé du chocolat",
    "Mon chat saigne de la patte",
    "Le chien convulse depuis deux minutes",
    "Mon chien a fugué pendant la garde",
  ])("« %s » : registre sensible, aucune action", (q) => {
    expect(isAnimalEmergency(q)).toBe(true);
    expect(detectRegister(q)).toBe("sensible");
    const r = computeNextAction(base({ question: q, register: "sensible", helpIntent: true }));
    expect(r.action).toBeNull();
    expect(r.chips).toEqual([]);
  });
  it("une question ordinaire reste hors urgence", () => {
    expect(isAnimalEmergency("Comment se passe une garde ?")).toBe(false);
  });
  it("la garde d'enfants ne mène à aucun formulaire de publication", () => {
    const q = "J'ai besoin de quelqu'un pour garder mes enfants mercredi";
    expect(isChildCareRequest(q)).toBe(true);
    const r = computeNextAction(base({ question: q, helpIntent: true }));
    const paths = [r.action?.path ?? "", ...r.chips.map((c) => c.path ?? "")];
    expect(paths.some((p) => p.startsWith("/sits/create") || p.startsWith("/petites-missions/creer"))).toBe(false);
    expect(r.action?.path).toBe("/petites-missions");
  });
  it("le prompt donne les conditions de l'aide aux devoirs (CGU 7.4)", () => {
    expect(ALMA_SYSTEM_PROMPT).toMatch(/adulte du foyer reste présent/);
    expect(ALMA_SYSTEM_PROMPT).toMatch(/article 7\.4/);
  });
});

describe("A1 · vérité du contexte et de la sortie", () => {
  const chat = read("supabase/functions/alma-chat/index.ts");
  it("une annonce non publiée d'autrui reste hors du contexte", () => {
    expect(chat).toContain('const linkedOnly = sit.status !== "published";');
  });
  it("la relance retire la ligne BROUILLON", () => {
    expect(chat).toMatch(/applyDraftToAction\(normalizeAlmaOutput\(extractClassification\(raw2\)\.answer\), null\)/);
  });
  it("chaque ligne journalisée porte la version, lisible aussi par OPTIONS", () => {
    expect(ALMA_VERSION).toMatch(/^\d{4}-\d{2}-\d{2}\./);
    expect(chat).toContain("version: ALMA_VERSION");
    expect(chat).toContain('"X-Alma-Version": ALMA_VERSION');
  });
  it("le prompt ne promet plus une densité invérifiable", () => {
    expect(ALMA_SYSTEM_PROMPT).not.toMatch(/se densifie chaque semaine/);
    expect(ALMA_SYSTEM_PROMPT).not.toMatch(/Tu vois les écrans/);
  });
});

describe("A1 · avis et accord de garde", () => {
  it("draft-review n'écrit plus d'avis tout fait ni ne tait les notes basses", () => {
    const src = read("supabase/functions/draft-review/index.ts");
    expect(src).not.toMatch(/Nous recommandons ce gardien/);
    expect(src).not.toMatch(/<=3 = ne pas mentionner/);
  });
  it("une trame d'Alma entre accolades n'entre jamais dans l'accord", () => {
    const data = buildAccordDeGardeData({
      sitId: "s1",
      dateDebut: "2026-11-01",
      dateFin: "2026-11-08",
      guide: { vet_address: "Clinique du centre, {téléphone du vétérinaire}", emergency_contact_name: "{nom du contact de secours}", emergency_contact_phone: "0600000000" },
    } as any);
    const json = JSON.stringify(data);
    expect(json).not.toMatch(/\{t[ée]l[ée]phone|\{nom du contact/);
  });
});

describe("A1 · migration préparée", () => {
  const sql = read("supabase/prepared-migrations/20261014170000_a1_alma_dit_vrai.sql");
  it("les faits suivent target_role dans les deux lectures", () => {
    expect(sql.match(/f\.target_role = v_target/g)?.length).toBe(2);
  });
  it("l'effacement d'un compte retire ses échanges avec Alma", () => {
    expect(sql).toMatch(/DELETE FROM public\.alma_conversations WHERE user_id = _user_id;/);
  });
  it("aucun tiret cadratin ni demi-cadratin dans les textes écrits", () => {
    const texts = [...sql.matchAll(/SET content = '([^']|'')*'/g)].map((m) => m[0]);
    for (const t of texts) expect(t).not.toMatch(/[–—]/);
  });
});
