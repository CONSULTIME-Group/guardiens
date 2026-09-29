import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { buildVerifiedFacts } from "../../supabase/functions/_shared/alma-facts";
import { emptyInventory } from "../../supabase/functions/_shared/alma-inventory";
import { applyDraftToAction, computeNextAction, type NextActionInput } from "../../supabase/functions/_shared/alma-next-action";
import { extractClassification, needsHumanContact } from "../../supabase/functions/_shared/alma-classify";
import { pickAlmaRailPhrase } from "@/lib/almaRailPhrase";
import { promptStarters } from "@/lib/alma/prompt-starters";
import { profileNudgeAllowed } from "@/lib/alma/profileNudge";
import { measureActionFollowUp } from "@/lib/admin/alma-conversations";

const read = (p: string) => readFileSync(p, "utf8");
const QUESTION = "je cherche de l'aide pour mes chevaux !!!";

const base = (over: Partial<NextActionInput> = {}): NextActionInput => ({
  facts: buildVerifiedFacts({ role: "both", ownSits: [], received: [], sent: [], missions: [], today: "2026-09-29" }),
  inventory: emptyInventory({ postal_code: "69001" }),
  accountRole: "both",
  activeRole: "sitter",
  question: QUESTION,
  register: "reassurance",
  completion: 94,
  helpIntent: true,
  frustration: true,
  ...over,
} as NextActionInput);

/**
 * Sortie du modèle reconstituée à partir de l'échange du 29/09 à 14:17:16 UTC
 * (df4b449d) : texte enregistré, suivi des deux lignes techniques dans l'ordre
 * qui a tout effacé avant J3 (CLASSEMENT puis BROUILLON).
 */
const REAL_OUTPUT = `Vous cherchez de l'aide pour vos chevaux, c'est une demande légitime que l'on peut publier sur Guardiens. Vous avez deux options principales pour cela, selon le type d'aide que vous recherchez.

Si vous avez besoin d'une garde complète pour vos chevaux pendant une absence, vous pouvez créer une annonce de garde. Si c'est plutôt un coup de main ponctuel ou régulier pour le foin, le pansage, ou d'autres tâches, une demande d'entraide est plus adaptée. Je vous propose le titre : "Aide quotidienne pour mes chevaux".
CLASSEMENT: {"intent":"aide_recherchee","frustration":2,"bug_suspected":false,"bug_item":"","churn":false,"unanswered":false}
BROUILLON: Aide quotidienne pour mes chevaux | Je cherche quelqu'un pour le foin et le pansage de mes chevaux.`;

describe("J3, défaut 3 : classement du modèle", () => {
  it("lit CLASSEMENT même suivi de BROUILLON, sans effacer BROUILLON", () => {
    const r = extractClassification(REAL_OUTPUT);
    expect(r.classification?.source).toBe("model");
    expect(r.classification?.intent).toBe("aide_recherchee");
    expect(r.answer).toContain("BROUILLON: Aide quotidienne pour mes chevaux");
    expect(r.answer).not.toContain("CLASSEMENT");
  });
  it("accepte le gras et le bloc de code", () => {
    const r = extractClassification("Réponse.\n**CLASSEMENT:** {\"intent\":\"entraide\",\"frustration\":0}");
    expect(r.classification?.intent).toBe("entraide");
    expect(r.answer).toBe("Réponse.");
  });
  it("une ligne illisible est retirée seule, le reste reste", () => {
    const r = extractClassification("Réponse.\nCLASSEMENT: {cassé\nBROUILLON: Titre | Desc");
    expect(r.classification).toBeNull();
    expect(r.answer).toBe("Réponse.\nBROUILLON: Titre | Desc");
  });
  it("le serveur journalise une ligne manquante", () => {
    expect(read("supabase/functions/alma-chat/index.ts")).toContain('console.warn("alma-chat classement absent"');
  });
});

describe("J3, défauts 1 et 2 : action principale et titre", () => {
  it("de l'aide pour des chevaux : l'action principale est de demander un coup de main", () => {
    const next = computeNextAction(base());
    expect(next.action?.label).toBe("Demander un coup de main");
    expect(next.action?.path.startsWith("/petites-missions/creer")).toBe(true);
  });
  it("un départ déclaré garde l'annonce de garde en tête", () => {
    expect(computeNextAction(base({ question: "je pars en vacances, qui garde mes chevaux ?" })).action?.path.startsWith("/sits/create")).toBe(true);
  });
  it("le titre du lien est exactement celui d'Alma, sans mot ajouté", () => {
    const next = computeNextAction(base());
    const { answer } = extractClassification(REAL_OUTPUT);
    const d = applyDraftToAction(answer, next.action, next.chips);
    const titre = new URLSearchParams(d.action!.path.split("?")[1]).get("titre");
    expect(titre).toBe("Aide quotidienne pour mes chevaux");
    expect(d.action!.path).not.toMatch(/poney/i);
    expect(d.answer).not.toContain("BROUILLON");
    for (const c of d.chips) expect(c.path ?? "").not.toMatch(/titre=/);
  });
  it("titre cité seul dans le texte : même titre", () => {
    const next = computeNextAction(base());
    const d = applyDraftToAction('Je vous propose le titre : "Aide quotidienne pour mes chevaux".', next.action, next.chips);
    expect(new URLSearchParams(d.action!.path.split("?")[1]).get("titre")).toBe("Aide quotidienne pour mes chevaux");
  });
  it("sans titre d'Alma, le formulaire s'ouvre sans titre inventé", () => {
    const next = computeNextAction(base());
    const d = applyDraftToAction("Une demande d'entraide convient.", next.action, next.chips);
    expect(d.action!.path).toBe("/petites-missions/creer");
  });
  it("le contact humain ne remplace plus l'action principale", () => {
    const src = read("supabase/functions/alma-chat/index.ts");
    expect(src).not.toContain('reason: "contact_humain"');
    expect(src).toContain("const action = drafted.action;");
    expect(needsHumanContact({ intent: "aide_recherchee", frustration: 2, bug_suspected: false, bug_item: null, churn: false, unanswered: false, source: "model" })).toBe(true);
  });
  it("le fil affiche le contact humain en lien secondaire sous l'action", () => {
    const src = read("src/components/ai/alma/AlmaConversation.tsx");
    expect(src).toContain("alma-human-contact-link");
  });
});

describe("J3, défaut 5 : indicateur d'action", () => {
  it("ne compte que les réponses avec une action proposée", () => {
    expect(measureActionFollowUp([{ action_reason: "aucune", register: "x", answers: 67, acted: 64 }, { action_reason: "aide_entraide", register: "x", answers: 1, acted: 1 }]))
      .toEqual({ total: 1, count: 1, rate: 1 });
  });
  it("non mesurable sans action proposée", () => {
    expect(measureActionFollowUp([{ action_reason: "aucune", register: "x", answers: 68, acted: 65 }]).rate).toBeNull();
    expect(read("src/pages/admin/_components/alma/ConversationsTab.tsx")).toContain("Non mesurable");
  });
});

describe("J3, défaut 6 : le profil seulement sous 40 %", () => {
  it("seuil", () => {
    expect(profileNudgeAllowed(94)).toBe(false);
    expect(profileNudgeAllowed(39)).toBe(true);
    expect(profileNudgeAllowed(null)).toBe(false);
  });
  it("carte Alma du tableau de bord à 94 % : aucune phrase de profil", () => {
    const p = pickAlmaRailPhrase({ variant: "confirmed", hidden: false, profileCompletion: 94 });
    expect(p).not.toMatch(/profil/i);
    expect(p).toMatch(/coup de main|projet|garde/);
    expect(pickAlmaRailPhrase({ variant: "confirmed", hidden: false, profileCompletion: 30 })).toMatch(/profil/);
  });
  it("amorces du tableau de bord tournées vers l'entraide", () => {
    const s = promptStarters("dashboard", { profileCompletion: 94 });
    expect(s.join(" ")).not.toMatch(/profil/i);
    expect(s).toContain("Un coup de main près de chez moi");
    expect(promptStarters("dashboard", { profileCompletion: 20 })[0]).toBe("Qu'est-ce qui manque à mon profil ?");
  });
  it("journal et bulle passent par le même seuil", () => {
    expect(read("src/hooks/useAlmaJournal.ts")).toContain("profileNudgeAllowed(completion.score)");
    expect(read("src/components/ai/alma/AlmaDock.tsx")).toContain("profileNudgeAllowed(signals.profileCompletion)");
  });
});

describe("J3, défaut 7 : comptes admins exclus des signaux", () => {
  it("raiseSignals vérifie le rôle admin", () => {
    const src = read("supabase/functions/alma-chat/index.ts");
    expect(src).toMatch(/rpc\("has_role", \{ _user_id: userId, _role: "admin" \}\)/);
  });
});

describe("J3, ton", () => {
  it("aucun tiret long ni mot proscrit dans les fichiers J3", () => {
    for (const f of ["src/lib/alma/profileNudge.ts", "src/lib/almaRailPhrase.ts", "supabase/functions/_shared/alma-classify.ts", "supabase/functions/_shared/alma-next-action.ts"]) {
      const s = read(f);
      expect(s).not.toMatch(/[\u2013\u2014]/);
      expect(s).not.toMatch(/\bgratuit|\bvoisin/i);
    }
  });
});
