// Lot E17 « La boucle tenue » : répondants nommés avec « Choisir {prénom} »,
// relance à 24 h une seule fois par réponse, « Merci, c'est pourvu », texte de
// clôture côté aidant, intention d'inscription, src=vague.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  chooseHint,
  chooseLabel,
  chooseUrl,
  exchangeDateLabel,
  normalizeResponders,
  responderDistanceLabel,
} from "../../../supabase/functions/_shared/mission-responders";
import {
  RESPONSE_WAITING_HOURS,
  groupDueResponses,
  isResponseWaitingDue,
} from "../../../supabase/functions/_shared/mission-response-waiting";
import { CLOSURE_DECLINE_TEXT, CLOSURE_DECLINE_TITLE, isClosureDecline } from "@/lib/missionResponseClosure";
import { arrivalIntentForSignup } from "@/lib/signupIntent";
import { CHOSEN_TEXT, chooseConversationPath, confirmText } from "@/pages/MissionChooseHelper";

const read = (p: string) => readFileSync(p, "utf8");
const TPL = "supabase/functions/_shared/transactional-email-templates";
const NEG = /\b(ne|pas|jamais|aucun|aucune|rien)\b|n'|n’/i;
const FORBIDDEN = /voisin|mission|annonce|candidature|preneur/i;

const NEW_TEXTS = [
  chooseHint(1),
  chooseHint(3),
  CLOSURE_DECLINE_TEXT,
  CLOSURE_DECLINE_TITLE,
  CHOSEN_TEXT,
  confirmText("Camille"),
  "Merci, c’est pourvu",
  "« Promener Filou » a trouvé son coup de main. Merci pour votre Je peux : votre élan compte, et il fait vivre l'entraide près de chez vous.",
];

describe("règles de texte des textes neufs", () => {
  it.each(NEW_TEXTS)("%s", (t) => {
    expect(t).not.toMatch(/[—–]/);
    expect(t).not.toMatch(NEG);
    expect(t).not.toMatch(FORBIDDEN);
  });
});

describe("répondants en attente, un bouton par personne", () => {
  const raw = [
    { responseId: "r1", firstName: "camille", distanceKm: 3.4, helpsWith: " Promener les chiens ", verified: true, exchangeDate: "2026-11-07", chooseToken: "tok1" },
    { responseId: "r2", firstName: "Karim", distanceKm: null, helpsWith: "", verified: false, exchangeDate: null, chooseToken: "tok2" },
    { responseId: "r3", firstName: "Sans jeton", chooseToken: "" },
  ];

  it("normalise prénom, distance, ligne, écusson, date ; écarte une ligne sans jeton", () => {
    const list = normalizeResponders(raw);
    expect(list).toHaveLength(2);
    expect(list[0]).toEqual({ responseId: "r1", firstName: "Camille", distanceKm: 3, helpsWith: "Promener les chiens", verified: true, exchangeDate: "2026-11-07", chooseToken: "tok1" });
    expect(list[1].helpsWith).toBeNull();
    expect(list[1].distanceKm).toBeNull();
    expect(normalizeResponders(null)).toEqual([]);
  });

  it("bouton « Choisir {prénom} » vers la page de choix sans connexion", () => {
    expect(chooseLabel({ firstName: "Camille" })).toBe("Choisir Camille");
    expect(chooseUrl("tok1")).toBe("https://guardiens.fr/entraide/choisir?t=tok1");
    expect(responderDistanceLabel(3)).toBe("à 3 km");
    expect(exchangeDateLabel("2026-11-07")).toBe("samedi 7 novembre");
  });

  it("la liste partagée affiche ligne, écusson, date et bouton", () => {
    const list = read(`${TPL}/_responder-list.tsx`);
    expect(list).toContain("Ce que je propose volontiers : ");
    expect(list).toContain("Identité vérifiée");
    expect(list).toContain("Date proposée : ");
    expect(list).toContain("href={chooseUrl(r.chooseToken)}");
    expect(list).toContain("{chooseLabel(r)}");
    expect(list).not.toMatch(/[—–]/);
  });

  it.each(["mission-response-received", "mission-wave-status", "mission-response-waiting"])("%s porte la liste", (name) => {
    const tpl = read(`${TPL}/${name}.tsx`);
    expect(tpl).toContain("<ResponderList");
    expect(tpl).not.toMatch(/[—–]/);
  });

  it("notify-mission-wave et send-mission-nudges lisent les répondants", () => {
    expect(read("supabase/functions/notify-mission-wave/index.ts")).toContain("fetchPendingResponders(supabase, missionId)");
    expect(read("supabase/functions/send-mission-nudges/index.ts")).toContain("fetchPendingResponders(admin, mission.id)");
    expect(read("supabase/functions/_shared/mission-responders.ts")).toContain('rpc("mission_pending_responders"');
  });
});

describe("relance du demandeur à 24 h, une seule fois par réponse", () => {
  const now = new Date("2026-10-25T12:00:00Z");
  it("24 h, marqueur choose_prompt_sent_at", () => {
    expect(RESPONSE_WAITING_HOURS).toBe(24);
    expect(isResponseWaitingDue({ created_at: "2026-10-24T11:59:00Z" }, now)).toBe(true);
    expect(isResponseWaitingDue({ created_at: "2026-10-24T13:00:00Z" }, now)).toBe(false);
    expect(isResponseWaitingDue({ created_at: "2026-10-20T10:00:00Z", choose_prompt_sent_at: "2026-10-21T10:00:00Z" }, now)).toBe(false);
  });

  it("un email par besoin, chaque réponse une fois", () => {
    const groups = groupDueResponses([
      { id: "r1", mission_id: "m1", responder_id: "a", created_at: "x" },
      { id: "r2", mission_id: "m1", responder_id: "b", created_at: "x" },
      { id: "r2", mission_id: "m1", responder_id: "b", created_at: "x" },
      { id: "r3", mission_id: "m2", responder_id: "c", created_at: "x" },
      { id: "r4", mission_id: "m2", responder_id: "d", created_at: "x", choose_prompt_sent_at: "y" },
    ]);
    expect(groups.map((g) => [g.missionId, g.responseIds])).toEqual([["m1", ["r1", "r2"]], ["m2", ["r3"]]]);
  });

  it("send-mission-nudges filtre et pose le marqueur après envoi", () => {
    const src = read("supabase/functions/send-mission-nudges/index.ts");
    expect(src).toContain(".is('choose_prompt_sent_at', null)");
    expect(src).toContain("new Date(now - RESPONSE_WAITING_HOURS * 3600 * 1000)");
    expect(src).toContain("rpc('mark_mission_choose_prompt_sent'");
    expect(src).not.toContain("now - 48 * 3600 * 1000).toISOString()\n      let q = admin\n        .from('small_mission_responses')");
  });

  it("mission-choose-helper fondue : la fonction n'envoie plus rien, sa tâche planifiée est retirée", () => {
    const fn = read("supabase/functions/send-mission-choose-prompt/index.ts");
    expect(fn).not.toContain("send-transactional-email");
    expect(fn).toContain("sent: 0");
    expect(read("drizzle/migrations/0099_e17_boucle_tenue.sql")).toContain("PERFORM cron.unschedule('send-mission-choose-prompt');");
  });
});

describe("choix par jeton et « Merci, c'est pourvu »", () => {
  it("mission-choose-action prévient la personne choisie et les autres", () => {
    const fn = read("supabase/functions/mission-choose-action/index.ts");
    expect(fn).toContain('event_type: "mission_accepted"');
    expect(fn).toContain('event_type: "mission_declined"');
    expect(fn).toContain("conversation_id: result.conversation_id ?? null");
  });

  it("la page de choix ouvre la conversation", () => {
    expect(chooseConversationPath("c1")).toBe("/messages/c1");
    expect(chooseConversationPath(null)).toBe("/messages");
  });

  it("mission-proposal-declined : affirmatif et chaleureux", () => {
    const tpl = read(`${TPL}/mission-proposal-declined.tsx`);
    expect(tpl).toMatch(/Merci, c(’|\\u2019)est pourvu/);
    expect(tpl).not.toContain("Proposition non retenue");
    expect(tpl).not.toContain("pas été retenue");
    expect(tpl).not.toMatch(/[—–]/);
  });

  it("notify-mission-event distingue « c'est pourvu » d'un refus simple", () => {
    const src = read("supabase/functions/notify-mission-event/index.ts");
    expect(src).toContain("const filled = (responseRows ?? []).some((r) => (r as { status?: string }).status === 'accepted')");
    expect(src).toContain("title: 'Merci, c\\'est pourvu'");
    expect(src).not.toContain("title: 'Votre proposition n\\'a pas été retenue'");
  });
});

describe("côté aidant : besoin clos sans choix", () => {
  it("decline_reason mission_closed", () => {
    expect(isClosureDecline({ status: "declined", decline_reason: "mission_closed" })).toBe(true);
    expect(isClosureDecline({ status: "declined", decline_reason: null })).toBe(false);
    expect(isClosureDecline({ status: "pending", decline_reason: "mission_closed" })).toBe(false);
    expect(CLOSURE_DECLINE_TEXT).toBe("Ce besoin est clos, merci pour votre proposition.");
  });

  it("SmallMissionDetail affiche le texte de clôture avant le texte de refus", () => {
    const src = read("src/pages/SmallMissionDetail.tsx");
    const closure = src.indexOf('myResponse.status === "declined" && isClosureDecline(myResponse)');
    const refusal = src.indexOf("Quelqu'un d'autre a été choisi cette fois");
    expect(closure).toBeGreaterThan(0);
    expect(refusal).toBeGreaterThan(closure);
    expect(src).toContain("{CLOSURE_DECLINE_TEXT}");
  });
});

describe("mesure", () => {
  it("intention d'inscription écrite sur le compte", () => {
    expect(arrivalIntentForSignup(true, null)).toBe("entraide");
    expect(arrivalIntentForSignup(true, "owner")).toBe("entraide");
    expect(arrivalIntentForSignup(false, "entraide")).toBeNull();
    expect(arrivalIntentForSignup(false, "sitter")).toBe("sitter");
    expect(arrivalIntentForSignup(false, null)).toBeNull();
    expect(read("src/pages/Register.tsx")).toContain("arrivalIntentForSignup(entraideIntent, detectedIntent)");
    expect(read("src/contexts/AuthContext.tsx")).toContain("...(arrivalIntent ? { arrival_intent: arrivalIntent } : {})");
    expect(read("drizzle/migrations/0099_e17_boucle_tenue.sql")).toContain("_intent := NEW.raw_user_meta_data ->> 'arrival_intent';");
  });

  it("src=vague sur les liens de mission-help-needed, texte principal inchangé", () => {
    const tpl = read(`${TPL}/mission-help-needed.tsx`);
    expect(tpl).toContain("export const WAVE_LINK_SOURCE = 'vague'");
    expect(tpl).toContain("/entraide/je-peux?t=${token}&src=${WAVE_LINK_SOURCE}");
    expect(tpl).toContain("/petites-missions/${missionId}?src=${WAVE_LINK_SOURCE}");
    expect(tpl).toContain("<Heading style={h1}>Un besoin près de chez vous</Heading>");
    expect(tpl).toContain("En retour : un merci, un café, ou un coup de main quand ce sera votre tour.");
  });

  it("entrée de journal 0099", () => {
    expect(read("drizzle/migrations/meta/_journal.json")).toContain('"tag": "0099_e17_boucle_tenue"');
  });
});
