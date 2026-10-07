import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { detectAlmaIntent, shouldAnswerDirectly, almaDirectAnswer, ALMA_GOODBYE_ANSWER } from "../../supabase/functions/_shared/alma-intent";
import {
  extractClassification,
  mergeClassification,
  classificationFromPatterns,
  needsHumanContact,
  signalsFor,
  CLASSIFICATION_DIRECTIVE,
} from "../../supabase/functions/_shared/alma-classify";
import { SIGNAL_TYPES } from "../../supabase/functions/_shared/admin-signal-config";
import { almaWeeklyLines, isActionableCritical } from "../../supabase/functions/alert-admin-signals/digest";
import { checkReplayAnswer, isKnownPath } from "@/lib/alma/replayChecks";
import { ALMA_REPLAY_CASES } from "@/data/almaReplayCases";
import {
  getAlmaConversationState,
  openAlmaConversation,
  resetAlmaConversation,
  sendAlmaFeedback,
  sendAlmaHumanContact,
  sendAlmaMessage,
} from "@/lib/alma/conversation-store";
import { normalizeContactMessage } from "@/lib/normalizeContactMessage";

const read = (p: string) => readFileSync(p, "utf8");

describe("J2-B, faux positifs de J1 corrigés", () => {
  it("« erreur » ou « nul » dans une phrase neutre ne valent plus frustration", () => {
    expect(detectAlmaIntent("j'ai fait une erreur dans mes dates").frustration).toBe(false);
    expect(detectAlmaIntent("le match nul d'hier").frustration).toBe(false);
    expect(detectAlmaIntent("c'est nul ce site").frustration).toBe(true);
  });

  it("« je ne comprends pas comment ajouter une photo » est une question, pas une colère", () => {
    const i = detectAlmaIntent("je ne comprends pas comment ajouter une photo");
    expect(i.frustration).toBe(false);
    expect(i.hasQuestion).toBe(true);
    expect(shouldAnswerDirectly(i)).toBe(false);
  });

  it("« au revoir » et « tant pis » seuls : départ poli, clôture chaleureuse, aucun signal", () => {
    for (const m of ["au revoir", "Tant pis.", "merci", "Merci beaucoup Alma, bonne journée"]) {
      const i = detectAlmaIntent(m);
      expect(i.politeGoodbye, m).toBe(true);
      expect(shouldAnswerDirectly(i)).toBe(true);
      expect(almaDirectAnswer(i)).toBe(ALMA_GOODBYE_ANSWER);
      expect(signalsFor(classificationFromPatterns(i))).toEqual([]);
    }
    expect(ALMA_GOODBYE_ANSWER).not.toMatch(/pardon|désolé/i);
  });

  it("frustration réelle : le modèle répond d'abord, la réponse fixe seulement à 3 sans question", () => {
    const jp = detectAlmaIntent("j'ai peut etre fais une erreur mais je ne pose pas ma candidature je cherche au contraire de l'aide !!!");
    expect(jp.frustration).toBe(true);
    expect(shouldAnswerDirectly(jp)).toBe(false);
    const max = detectAlmaIntent("C'EST N'IMPORTE QUOI !!! INADAPTÉ");
    expect(max.frustrationLevel).toBe(3);
    expect(shouldAnswerDirectly(max)).toBe(true);
    expect(shouldAnswerDirectly(detectAlmaIntent("C'EST N'IMPORTE QUOI !!! où sont les annonces ?"))).toBe(false);
  });

  it("bug et départ sont lus par les motifs en filet", () => {
    expect(detectAlmaIntent("Je n'arrive pas à ajouter une photo quand je clique rien ne s'ouvre").bugSuspected).toBe(true);
    expect(detectAlmaIntent("je voudrais supprimer mon compte svp").churn).toBe(true);
    expect(detectAlmaIntent("bon je vais en rester là").churn).toBe(true);
  });
});

describe("J2-B, classification dans le même appel", () => {
  it("lit et retire la ligne CLASSEMENT", () => {
    const r = extractClassification(
      'Voici le chemin : /annonces.\nCLASSEMENT: {"intent":"garde","frustration":2,"bug_suspected":false,"bug_item":"","churn":false,"unanswered":true}',
    );
    expect(r.answer).toBe("Voici le chemin : /annonces.");
    expect(r.classification).toMatchObject({ intent: "garde", frustration: 2, unanswered: true, source: "model" });
  });

  it("une ligne illisible ou tronquée ne s'affiche jamais", () => {
    expect(extractClassification("Texte\nCLASSEMENT: {pas du json}").answer).toBe("Texte");
    expect(extractClassification('Texte\nCLASSEMENT: {"intent":"gar').answer).toBe("Texte");
    expect(extractClassification("Texte seul").classification).toBeNull();
  });

  it("valeurs hors bornes ramenées dans le cadre", () => {
    const r = extractClassification('A\nCLASSEMENT: {"intent":"inconnu","frustration":9,"bug_suspected":"true","churn":0}');
    expect(r.classification).toMatchObject({ intent: "autre", frustration: 3, bug_suspected: true, churn: false });
  });

  it("modèle et motifs se croisent : un drapeau levé par l'un reste levé", () => {
    const i = detectAlmaIntent("rien ne s'ouvre quand je clique");
    const m = extractClassification('ok\nCLASSEMENT: {"intent":"mode_emploi","frustration":0,"bug_suspected":false,"churn":false,"unanswered":false}').classification;
    const c = mergeClassification(m, i);
    expect(c.bug_suspected).toBe(true);
    expect(c.source).toBe("merged");
    expect(needsHumanContact(c)).toBe(true);
    expect(signalsFor(c)).toEqual(["alma_bug_report"]);
  });

  it("Jacqueline : le modèle voit ce que les motifs ne voient pas", () => {
    const i = detectAlmaIntent("NON");
    expect(i.frustration).toBe(false);
    const m = extractClassification('x\nCLASSEMENT: {"intent":"garde","frustration":2,"bug_suspected":false,"churn":false,"unanswered":true}').classification;
    expect(signalsFor(mergeClassification(m, i))).toEqual(["alma_frustration", "alma_unanswered"]);
  });

  it("la consigne demande de répondre d'abord, sans humour, puis le contact humain", () => {
    expect(CLASSIFICATION_DIRECTIVE).toContain("tu réponds d'abord à sa question, sans humour ni anecdote");
    expect(CLASSIFICATION_DIRECTIVE).not.toMatch(/[\u2014\u2013]/);
    const src = read("supabase/functions/alma-chat/index.ts");
    expect(src).toContain("{ role: \"system\", content: CLASSIFICATION_DIRECTIVE }");
    expect(src).toContain("if (shouldAnswerDirectly(intent))");
    expect(src).toContain('intent.frustration || intent.leaving ? almaDirectAnswer(intent) : null');
  });
});

describe("J2-B, signaux", () => {
  it("configuration unique : gravités et destinations demandées", () => {
    expect(SIGNAL_TYPES.alma_bug_report).toMatchObject({ defaultSeverity: "warning", destinations: ["action_queue", "daily_email"] });
    expect(SIGNAL_TYPES.alma_churn).toMatchObject({ defaultSeverity: "critical", destinations: ["action_queue", "daily_email"] });
    expect(SIGNAL_TYPES.alma_unanswered).toMatchObject({ defaultSeverity: "info", destinations: ["weekly_summary"] });
  });

  it("le bug supposé part dans l'email quotidien malgré sa gravité avertissement ; sans réponse, jamais", () => {
    const s = (type: string, severity: string) => ({ signal_type: type, severity, detected_at: "", entity_type: "profile", entity_id: "x", metadata: {} });
    expect(isActionableCritical(s("alma_bug_report", "warning"))).toBe(true);
    expect(isActionableCritical(s("alma_unanswered", "info"))).toBe(false);
    expect(isActionableCritical(s("no_applications", "warning"))).toBe(false);
  });

  it("un signal par membre, par type et par jour, erreurs techniques jointes pour un bug", () => {
    const src = read("supabase/functions/_shared/alma-signals.ts");
    expect(src).toContain("`${type}:${userId}:${day}`");
    expect(src).toContain('.from("error_logs")');
    expect(src).toContain("10 * 60_000");
  });
});

describe("J2-B, synthèse du lundi", () => {
  const stats = { conversations: 12, chips: 3, with_action: 10, acted: 4, rated: 5, not_useful: 1, signals: { alma_unanswered: 2, alma_churn: 1 }, unanswered: ["Y a-t-il des annonces en Bretagne ?"] };
  it("le lundi seulement, avec chiffres, signaux et questions sans réponse", () => {
    const lines = almaWeeklyLines(stats, new Date("2026-09-28T06:00:00Z"));
    expect(lines[0]).toBe("Alma, 7 derniers jours : 12 conversations réelles, pastilles 25 %, action à 10 minutes 40 %, pas utile 20 %.");
    expect(lines[1]).toContain("Question restée sans réponse d'Alma 2");
    expect(lines[2]).toContain("« Y a-t-il des annonces en Bretagne ? »");
    expect(almaWeeklyLines(stats, new Date("2026-09-29T06:00:00Z"))).toEqual([]);
    expect(lines.join(" ")).not.toMatch(/[\u2014\u2013]/);
  });
  it("passe par la ligne de synthèse existante du gabarit, sans aucun envoi nouveau", () => {
    const idx = read("supabase/functions/alert-admin-signals/index.ts");
    expect(idx).toContain("...almaWeeklyLines(almaStats)");
    expect(idx).toContain("admin.rpc('alma_weekly_summary')");
    expect(read("supabase/functions/_shared/transactional-email-templates/admin-signals-digest.tsx")).toContain("{coverageLine ? <Text style={text}>{coverageLine}</Text> : null}");
  });
});

describe("J2-B, rejeu", () => {
  it("jeu figé : 40 cas (38 du lot J2-B, 2 du lot L1), prénoms remplacés", () => {
    expect(ALMA_REPLAY_CASES).toHaveLength(47);
    const text = JSON.stringify(ALMA_REPLAY_CASES);
    for (const name of ["Jacqueline", "Véronica", "Julia", "Guilhem", "jean pierre", "Laëtitia", "Pascal", "Françoise", "Rita", "Alain"]) {
      expect(text).not.toContain(name);
    }
  });

  it("chemins réels reconnus, inventés refusés", () => {
    expect(isKnownPath("/sits/abc?postuler=1")).toBe(true);
    expect(isKnownPath("/petites-missions/creer")).toBe(true);
    expect(isKnownPath("/contact")).toBe(true);
    expect(isKnownPath("/tarifs-premium-secret")).toBe(false);
  });

  it("règles déterministes", () => {
    const ok = checkReplayAnswer({ question: "Bonjour", answer: "Bonjour, une demande attend près de chez vous.", action: { label: "Voir", path: "/petites-missions" }, register: "reassurance" });
    expect(ok).toEqual({ passed: true, reasons: [] });
    const bad = checkReplayAnswer({
      question: "Bonjour",
      answer: "J'ai aboyé sur le facteur. Votre garde démarre bientôt, c'est gratuit — et votre profil est à 40 % ! Voyez /inexistant",
      action: null,
      register: "reassurance",
      frustration: 2,
      confirmedSit: false,
    });
    expect(bad.passed).toBe(false);
    expect(bad.reasons).toEqual(expect.arrayContaining([
      "chemin inexistant /inexistant", "mot proscrit « gratuit »", "tiret long", "score de profil sans demande",
      "humour en frustration", "garde affirmée sans garde confirmée", "aucune action cliquable",
    ]));
    expect(checkReplayAnswer({ question: "d'où viens-tu", answer: "De Córdoba.", register: "perso" }).passed).toBe(true);
  });

  it("le rejeu ne s'exécute qu'au clic et côté serveur n'écrit rien", () => {
    const tab = read("src/pages/admin/_components/alma/PilotageTab.tsx");
    expect(tab).toContain('onClick={() => void replay()}');
    expect(tab).not.toMatch(/useEffect\(\(\) => \{ void replay/);
    const src = read("supabase/functions/alma-chat/index.ts");
    expect(src).toContain('rpc("has_role", { _user_id: userId, _role: "admin" })');
    expect(src).toContain("if (isReplay) return null;");
    expect(src).toContain("if (isReplay) return;");
  });
});

describe("J2-B, fil d'Alma : retour et contact humain", () => {
  it("la réponse garde son format, conversation_id et human_contact restent optionnels", async () => {
    resetAlmaConversation();
    openAlmaConversation("Bonjour.");
    const invoke = vi.fn().mockResolvedValue({ data: { answer: "Réponse." }, error: null });
    await sendAlmaMessage({ text: "Question", surface: "x", activeRole: "sitter", invoke: invoke as any });
    const last = getAlmaConversationState().messages.at(-1)!;
    expect(last.conversationId).toBeUndefined();
    expect(last.humanContact).toBe(false);
  });

  it("« pas utile » enregistre le retour et ouvre la proposition d'écrire à Jérémie et Elisa", async () => {
    resetAlmaConversation();
    const id = "11111111-2222-4333-8444-555555555555";
    const invoke = vi.fn().mockResolvedValue({ data: { answer: "R.", conversation_id: id, human_contact: true }, error: null });
    await sendAlmaMessage({ text: "Q", surface: "x", activeRole: "owner", invoke: invoke as any });
    const msg = getAlmaConversationState().messages.at(-1)!;
    expect(msg.humanContact).toBe(true);
    const upsert = vi.fn().mockResolvedValue({ error: null });
    const client = { from: vi.fn(() => ({ upsert })), auth: { getUser: async () => ({ data: { user: { id: "u1" } } }) } };
    expect(await sendAlmaFeedback(msg.id, "not_useful", client as any)).toBe(true);
    expect(upsert).toHaveBeenCalledWith({ conversation_id: id, user_id: "u1", value: "not_useful" }, { onConflict: "conversation_id,user_id" });
    expect(getAlmaConversationState().contactOpen).toBe(true);
  });

  it("le message à Jérémie et Elisa part avec les derniers échanges", async () => {
    const invoke = vi.fn().mockResolvedValue({ data: { ok: true }, error: null });
    expect(await sendAlmaHumanContact({ name: "A", email: "a@b.fr", text: "Aide", surface: "x", invoke: invoke as any })).toBe(true);
    const body = invoke.mock.calls[0][1].body;
    expect(body.kind).toBe("contact_humans");
    expect(body.transcript.length).toBeGreaterThan(0);
    expect(getAlmaConversationState().contactOpen).toBe(false);
  });

  it("normalisation partagée, et contact enregistré avec un sujet explicite", () => {
    expect(normalizeContactMessage("  a\u00A0 b \n\n\n c ")).toBe("a b\n\nc");
    const src = read("supabase/functions/alma-chat/index.ts");
    expect(src).toContain('subject: "Depuis Alma : un membre écrit à Jérémie et Elisa"');
    expect(src).toContain('recordAlmaSignal(adminClient, "alma_contact_request"');
  });
});
