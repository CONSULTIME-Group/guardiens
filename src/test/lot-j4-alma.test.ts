import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { buildVerifiedFacts } from "../../supabase/functions/_shared/alma-facts";
import { emptyInventory } from "../../supabase/functions/_shared/alma-inventory";
import { computeNextAction, type NextActionInput } from "../../supabase/functions/_shared/alma-next-action";
import { detectAlmaIntent } from "../../supabase/functions/_shared/alma-intent";
import { extractClassification } from "../../supabase/functions/_shared/alma-classify";
import { ALMA_PAGE_LABELS } from "../../supabase/functions/_shared/alma-page-labels";
import {
  almaProfileVisibleToModel,
  moveOpeningAnecdote,
  polishAlmaAnswer,
  rewriteForbiddenWords,
} from "../../supabase/functions/_shared/alma-output";
import { ALMA_SYSTEM_PROMPT } from "../../supabase/functions/_shared/alma-system-prompt";
import { parseAlmaMessage } from "@/components/ai/alma/AlmaConversation";
import { checkReplayAnswer, isClosingMessage } from "@/lib/alma/replayChecks";

const read = (p: string) => readFileSync(p, "utf8");
const QUESTION = "je cherche de l'aide pour mes chevaux !!!";

/** Réponse enregistrée le 29/09 à 17:25:10 UTC (alma_conversations). */
const REAL_17_25 = `Ah, vous cherchez de l'aide pour vos chevaux ! Vous avez deux possibilités sur Guardiens pour cela.

Vous pouvez publier une demande d'entraide pour un coup de main ponctuel, comme nourrir vos chevaux ou un besoin spécifique, sur la page /petites-missions/creer. Je peux vous aider à formuler un titre pour cette demande.

Si vous avez besoin d'une garde complète pendant votre absence, vous pouvez créer une annonce de garde d'animaux sur /sits/create.`;

describe("J4, point 1 : aucun vide à la place d'un chemin", () => {
  const parsed = parseAlmaMessage(REAL_17_25);
  it("remplace chaque chemin par le nom de sa page, dans la phrase", () => {
    expect(parsed.text).toContain("sur la page Demander un coup de main.");
    expect(parsed.text).toContain("sur Créer une annonce de garde.");
    expect(parsed.text).not.toMatch(/sur la page \./);
    expect(parsed.text).not.toMatch(/sur\s*\./);
    expect(parsed.text).not.toContain("/petites-missions");
  });
  it("les noms de page deviennent des liens cliquables dans le texte", () => {
    const links = parsed.segments.filter((s) => s.type === "link");
    expect(links).toEqual([
      { type: "link", href: "/petites-missions/creer", title: "Demander un coup de main" },
      { type: "link", href: "/sits/create", title: "Créer une annonce de garde" },
    ]);
  });
  it("la consigne interdit d'écrire un chemin dans une phrase", () => {
    expect(ALMA_SYSTEM_PROMPT).toContain("Tu n'écris jamais de chemin");
  });
});

describe("J4, point 2 : libellés des pages", () => {
  const app = read("src/App.tsx");
  it.each(Object.entries(ALMA_PAGE_LABELS))("%s existe et porte un nom lisible", (path, label) => {
    expect(app).toContain(`path="${path}"`);
    expect(label.startsWith("/")).toBe(false);
  });
  it("créer une mission, c'est demander ; parcourir, c'est proposer", () => {
    expect(ALMA_PAGE_LABELS["/petites-missions/creer"]).toBe("Demander un coup de main");
    expect(ALMA_PAGE_LABELS["/petites-missions"]).toBe("Proposer un coup de main");
    for (const [path, label] of Object.entries(ALMA_PAGE_LABELS)) {
      if (/\/(creer|create|publier)$/.test(path)) expect(label).toMatch(/^(Demander|Créer|Publier|Lancer)/);
      expect(/\/(creer|create|publier)$/.test(path) && /^Proposer/.test(label)).toBe(false);
    }
  });
  it("le fil d'Alma lit ce dictionnaire", () => {
    expect(read("src/components/ai/alma/AlmaConversation.tsx")).toContain("ALMA_PAGE_LABELS");
    expect(read("src/components/ai/alma/AlmaConversation.tsx")).not.toContain('"Proposer un coup de main"');
  });
});

describe("J4, point 3 : action principale", () => {
  const intent = detectAlmaIntent(QUESTION, []);
  const input = {
    facts: buildVerifiedFacts({ role: "both", ownSits: [], received: [], sent: [], missions: [], today: "2026-09-29" }),
    inventory: emptyInventory({ postal_code: "69001" }),
    accountRole: "both",
    activeRole: "sitter",
    question: QUESTION,
    register: "reassurance",
    completion: 94,
    helpIntent: intent.helpSeeking,
    largeAnimals: Boolean(intent.largeAnimals),
  } as NextActionInput;
  it("la question contient des chevaux, cause du défaut", () => {
    expect(intent.largeAnimals).toBe(true);
  });
  it("sans départ, l'action principale est de demander un coup de main", () => {
    const next = computeNextAction(input);
    expect(next.action?.reason).toBe("aide_entraide");
    expect(next.action?.label).toBe("Demander un coup de main");
  });
  it("un départ déclaré passe la garde devant", () => {
    const next = computeNextAction({ ...input, question: "je pars en vacances, qui garde mes chevaux ?" });
    expect(next.action?.reason).toBe("aide_garde");
  });
  it("un seul bouton principal, affiché même si le texte cite la même page", () => {
    const src = read("src/components/ai/alma/AlmaConversation.tsx");
    expect(src).toContain("{message.action && (");
    expect(src).not.toContain("!parsed.links.some((l) => l.href === message.action!.path)");
    expect(src).toContain('link.kind === "source"');
  });
});

describe("J4, point 4 : indicateur Pilotage", () => {
  const src = read("src/pages/admin/_components/alma/PilotageTab.tsx");
  it("les lignes sans action ne remplissent plus le tableau", () => {
    expect(src).toContain('r.action_reason !== "aucune"');
    expect(src).toContain("Comptes admins exclus");
  });
  it("aucun « (· pas utile) » sans retour", () => {
    expect(src).toContain("aucun retour sur la période");
  });
});

describe("J4, point 5 : CLASSEMENT collé à une phrase (cas-12)", () => {
  const out = "Je vous propose de régler votre alerte sur /mon-secteur.CLASSEMENT: {\"intent\":\"mode_emploi\",\"frustration\":0,\"bug_suspected\":false,\"bug_item\":\"\",\"churn\":false,\"unanswered\":false}";
  it("le serveur lit et retire la ligne", () => {
    const r = extractClassification(out);
    expect(r.classification?.intent).toBe("mode_emploi");
    expect(r.answer).toBe("Je vous propose de régler votre alerte sur /mon-secteur.");
  });
  it("l'écran ne crée jamais de lien vers /mon-secteur.CLASSEMENT:", () => {
    const p = parseAlmaMessage(out);
    expect(p.links.map((l) => l.href)).toEqual(["/mon-secteur"]);
    expect(p.text).toBe("Je vous propose de régler votre alerte sur Mon secteur.");
  });
  it("un « classement » en minuscules dans une phrase reste intact", () => {
    expect(extractClassification("Voici le classement : les chiens d'abord.").answer).toBe("Voici le classement : les chiens d'abord.");
  });
});

describe("J4, point 6 : « gratuit » reformulé (cas-04)", () => {
  it("reformule la phrase réelle", () => {
    const r = rewriteForbiddenWords("vous bénéficiez du logement gratuitement pendant la durée de la garde.");
    expect(r).toBe("vous bénéficiez du logement sans rien payer pendant la durée de la garde.");
  });
  it.each(["C'est gratuit.", "Une inscription gratuite.", "La gratuité du logement.", "Gratuitement, bien sûr.", "gratuité"])("aucune forme ne reste : %s", (t) => {
    expect(rewriteForbiddenWords(t)).not.toMatch(/gratuit/i);
  });
  it("la consigne proscrit toutes les formes", () => {
    expect(ALMA_SYSTEM_PROMPT).toContain("gratuit sous toutes ses formes");
    expect(ALMA_SYSTEM_PROMPT).toContain("sans rien payer pour le logement");
  });
});

describe("J4, point 7 : pas de score au dessus de 40 % (cas-17, 19, 22, 35)", () => {
  it.each([
    ["cas-17", "Accompagnez moi", 94],
    ["cas-19", "Comment je m'y prends ?", 94],
    ["cas-22", "Je suis disponible", 94],
    ["cas-35", "Proposez moi un texte", 90],
  ])("%s : le score n'est pas transmis", (_id, q, completion) => {
    expect(almaProfileVisibleToModel(completion as number, q as string)).toBe(false);
  });
  it("une question sur le profil ou un profil sous 40 % le transmet", () => {
    expect(almaProfileVisibleToModel(94, "Qu'est-ce qui manque à mon profil ?")).toBe(true);
    expect(almaProfileVisibleToModel(30, "Bonjour")).toBe(true);
  });
  it("le serveur branche la règle dans le dossier", () => {
    const src = read("supabase/functions/alma-chat/index.ts");
    expect(src).toContain("completion_profil: showProfile ? completion : null");
    expect(src).toContain("profil_a_completer: showProfile ? profilACompleter : []");
  });
});

describe("J4, point 8 : l'information d'abord", () => {
  const cas04 = "J'ai passé la nuit à courir après un chat qui m'a regardée de haut. Je me sens un peu chiffonnée ce matin.\n\nSur Guardiens, vous veillez sur la maison et les animaux.";
  it("l'anecdote d'ouverture passe en fin, en une phrase", () => {
    const r = moveOpeningAnecdote(cas04, { perso: false, quiet: false });
    expect(r.startsWith("Sur Guardiens")).toBe(true);
    expect(r.endsWith("J'ai passé la nuit à courir après un chat qui m'a regardée de haut.")).toBe(true);
    expect(r).not.toContain("chiffonnée");
  });
  it("aucune anecdote en cas d'aide, de frustration ou de problème", () => {
    const r = moveOpeningAnecdote(cas04, { perso: false, quiet: true });
    expect(r).toBe("Sur Guardiens, vous veillez sur la maison et les animaux.");
  });
  it("cas-17 : la sieste quitte l'ouverture", () => {
    const r = polishAlmaAnswer("Bonjour Jérémie, je viens de faire une petite sieste sur la marche du milieu de l'escalier, et je suis prête à vous accompagner.\n\nDites-moi ce que vous aimeriez faire.", { perso: false, quiet: false });
    expect(r.startsWith("Dites-moi")).toBe(true);
  });
  it("une question sur Alma garde sa réponse intacte", () => {
    expect(moveOpeningAnecdote(cas04, { perso: true, quiet: false })).toBe(cas04);
  });
  it("le rejeu signale une anecdote en ouverture", () => {
    expect(checkReplayAnswer({ question: "Je suis disponible", answer: cas04, action: { label: "x", path: "/annonces" }, register: "reassurance" }).reasons).toContain("anecdote en ouverture");
  });
});

describe("J4, point 9 : un remerciement n'exige aucune action (cas-29)", () => {
  it("cas-29 réussit sans action", () => {
    const v = checkReplayAnswer({ question: "merci", answer: "Avec plaisir. Je reste ici, dans le coin de l'écran, dès que vous en avez besoin.", action: null, register: "reassurance" });
    expect(v.passed).toBe(true);
  });
  it.each(["merci", "Merci beaucoup !", "au revoir", "Bonne journée"])("clôture reconnue : %s", (q) => {
    expect(isClosingMessage(q)).toBe(true);
  });
  it.each(["merci, et comment je publie ?", "Je suis disponible", "Comment se passe une garde ?"])("l'exigence reste ailleurs : %s", (q) => {
    expect(isClosingMessage(q)).toBe(false);
    expect(checkReplayAnswer({ question: q, answer: "Réponse.", action: null, register: "reassurance" }).reasons).toContain("aucune action cliquable");
  });
});
