/**
 * Lot Z (14/10/2026), parcours de garde : « Besoin d'aide », accord de garde,
 * gardes réalisées, bandeaux de messagerie, avis, notifications de fin.
 * Chaque constat a été vérifié en base le 13/10/2026.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  buildAccordDeGardeData,
  fetchAccordHouseGuide,
  joinFilled,
  mapOvernightGuest,
  mapSmokerAccepted,
} from "@/lib/accordDeGarde";
import { groupApplications, isCompletedSitForSitter } from "@/lib/applicationSitState";
import { conversationSitBanner } from "@/lib/conversationSitBanner";
import { REVIEW_PUBLICATION_RULE, REVIEW_STALE_DAYS, reviewConversationPair } from "@/lib/reviewEligibility";
import { togglePublishedUpdate } from "@/pages/admin/AdminReviews";
import {
  completionNoticeCoveredByMorningReminder,
  previousUtcDay,
} from "../../../supabase/functions/_shared/sit-reminders";

const read = (p: string) => readFileSync(p, "utf8");
const NOW = new Date(2026, 9, 14, 12, 0, 0);

describe("Z1, « Besoin d'aide » pendant la garde", () => {
  it("appelle get_or_create_conversation avec la signature réelle", () => {
    const src = read("src/components/sits/HelpDuringSitDialog.tsx");
    expect(src).toContain('p_context_type: "sit_application"');
    expect(src).not.toMatch(/p_context:/);
    expect(src).not.toContain('"get_or_create_conversation" as any');
  });
});

describe("Z2, accord de garde construit sur le guide de la maison", () => {
  const base = {
    sitId: "sit-1",
    dateDebut: "1 novembre 2026",
    dateFin: "8 novembre 2026",
    adresse: "Lyon",
    ownerFirstName: "Claire",
    sitterFirstName: "Julien",
    pets: [{ name: "Milo", species: "dog", breed: "Berger" }],
  };

  it("reprend vétérinaire, voisin, contact d'urgence, règles et pièces réservées", () => {
    const data = buildAccordDeGardeData({
      ...base,
      guide: {
        vet_name: "Dr Martin",
        vet_phone: "04 78 12 34 56",
        vet_address: "8 rue Garibaldi",
        neighbor_name: "Sophie",
        neighbor_phone: "06 98 76 54 32",
        emergency_contact_name: "Paul",
        emergency_contact_phone: "06 11 22 33 44",
        forbidden_zones: "le bureau",
      },
      ownerRules: { overnight_guest: "Non", smoker_accepted: "Oui dehors uniquement", rules_notes: "Volets fermés la nuit" },
    });
    expect(data.urgences).toEqual({ vetNom: "Dr Martin", vetTel: "04 78 12 34 56", vetAdresse: "8 rue Garibaldi" });
    expect(data.voisinConfiance).toEqual({ prenom: "Sophie", telephone: "06 98 76 54 32" });
    expect(data.contactUrgence).toEqual({ nom: "Paul", telephone: "06 11 22 33 44" });
    expect(data.reglesVie.invites).toBe(false);
    expect(data.reglesVie.tabac).toBe("Dehors uniquement");
    expect(data.reglesVie.autresPrecisions).toBe("Volets fermés la nuit\nPièces réservées : le bureau");
    expect(data.animaux).toEqual([{ prenom: "Milo", espece: "dog", race: "Berger" }]);
  });

  it("aucun montant imposé, aucun téléphone inventé, champs vides à null", () => {
    const data = buildAccordDeGardeData({ ...base, guide: null, ownerRules: null });
    expect(data.montantVetMax).toBeNull();
    expect(data.proprio.telephone).toBe("");
    expect(data.urgences).toBeNull();
    expect(data.voisinConfiance).toBeNull();
    expect(data.contactUrgence).toBeNull();
    expect(data.reglesVie).toEqual({ animauxPartout: null, invites: null, tabac: null, autresPrecisions: null });
  });

  it("traduit les valeurs réelles d'owner_profiles", () => {
    expect(mapOvernightGuest("Oui conjoint/ami")).toBe("Oui, conjoint ou ami");
    expect(mapOvernightGuest("À discuter")).toBeNull();
    expect(mapOvernightGuest("")).toBeNull();
    expect(mapSmokerAccepted("Non")).toBe(false);
    expect(mapSmokerAccepted(null)).toBeNull();
  });

  it("assemble sans séparateur orphelin", () => {
    expect(joinFilled(["Dr Martin", "", null, "8 rue"])).toBe("Dr Martin · 8 rue");
    expect(joinFilled([undefined, " "])).toBe("");
  });

  it("lit le guide de la propriété le plus récent, publié ou non, et rend null en cas d'échec", async () => {
    const calls: string[] = [];
    const chain = (rows: unknown, error: unknown = null) => {
      const c: any = {
        select: (cols: string) => { calls.push(`select:${cols}`); return c; },
        eq: (col: string, v: string) => { calls.push(`eq:${col}=${v}`); return c; },
        order: () => c,
        limit: () => Promise.resolve({ data: rows, error }),
      };
      return c;
    };
    const guide = await fetchAccordHouseGuide({ from: () => chain([{ vet_name: "Dr A" }]) }, "prop-1");
    expect(guide).toEqual({ vet_name: "Dr A" });
    expect(calls).toContain("eq:property_id=prop-1");
    expect(calls.some((c) => c.startsWith("eq:published"))).toBe(false);
    expect(await fetchAccordHouseGuide({ from: () => chain(null, { message: "x" }) }, "prop-1")).toBeNull();
    expect(await fetchAccordHouseGuide({ from: () => chain([]) }, null)).toBeNull();
  });

  it("les deux points d'entrée passent par buildAccordDeGardeData, sans phone ni 300 €", () => {
    for (const path of ["src/components/sits/views/OwnerSitView.tsx", "src/hooks/useAcceptApplication.tsx"]) {
      const src = read(path);
      expect(src).toContain("buildAccordDeGardeData(");
      expect(src).toContain("fetchAccordHouseGuide(");
      expect(src).not.toContain("montantVetMax: 300");
      expect(src).not.toMatch(/\?\.phone\b/);
    }
  });

  it("le gabarit n'affiche ni champ vide après deux-points ni montant suggéré", () => {
    const src = read("src/components/gardes/AccordDeGarde.tsx");
    expect(src).not.toContain("Joindre {p} en premier : {garde.proprio.telephone}</p>");
    expect(src).toContain("Joindre {p} en premier, par la messagerie Guardiens.");
    expect(src).not.toContain("150€ est une base courante");
    expect(src).not.toContain("{garde.urgences.vetNom} · {garde.urgences.vetTel} · {garde.urgences.vetAdresse}");
  });
});

describe("Z3, textes exacts de l'accord", () => {
  it("aucun PDF promis, aucune relance ni verrou de dates annoncés", () => {
    const accord = read("src/components/gardes/AccordDeGarde.tsx");
    const banner = read("src/components/gardes/AccordOwnerStatusBanner.tsx");
    expect(accord).not.toContain("PDF par email");
    expect(accord).toContain("Votre gardien est prévenu et peut le signer à son tour.");
    expect(banner).not.toContain("verrouille les dates");
    expect(banner).not.toContain("Nous relançons");
    expect(banner).toContain("Votre gardien en a été prévenu");
    expect(`${accord}\n${banner}`).not.toMatch(/[–—]/);
  });
});

describe("Z4, gardes réalisées sur /mes-candidatures", () => {
  const apps = [
    { id: "a", sit_status: "completed", status: "accepted", sit_end_date: "2026-10-01" },
    { id: "b", sit_status: "archived", status: "accepted", sit_end_date: "2026-09-01" },
    { id: "c", sit_status: "archived", status: "accepted", sit_end_date: "2026-11-01" },
    { id: "d", sit_status: "completed", status: "rejected", sit_end_date: "2026-10-01" },
    { id: "e", sit_status: "published", status: "pending", sit_end_date: "2026-11-01" },
  ];

  it("une candidature acceptée sur une garde terminée ou archivée passée n'est plus « sans suite »", () => {
    const { active, done, closed } = groupApplications(apps, { now: NOW });
    expect(active.map((a) => a.id)).toEqual(["e"]);
    expect(done.map((a) => a.id)).toEqual(["a", "b"]);
    expect(closed.map((a) => a.id)).toEqual(["c", "d"]);
    expect(isCompletedSitForSitter({ sit_status: "archived", status: "accepted", sit_end_date: null }, NOW)).toBe(false);
  });

  it("la page affiche la section et l'accès à l'avis", () => {
    const src = read("src/pages/MesCandidatures.tsx");
    expect(src).toContain("Gardes réalisées ({done.length})");
    expect(src).toContain("isSitReviewable({ status: app.sit_status, end_date: app.sit_end_date })");
    expect(src).toContain("to={`/review/${app.sit_id}`}");
  });
});

describe("Z5, bandeaux de garde de la messagerie", () => {
  it("réservés à la candidature acceptée", () => {
    expect(conversationSitBanner({ sitStatus: "in_progress", applicationStatus: "rejected" })).toBeNull();
    expect(conversationSitBanner({ sitStatus: "completed", applicationStatus: "cancelled" })).toBeNull();
    expect(conversationSitBanner({ sitStatus: "in_progress", applicationStatus: "accepted" })).toBe("in_progress");
    expect(conversationSitBanner({ sitStatus: "completed", applicationStatus: "accepted" })).toBe("reviewable");
  });

  it("une garde archivée après sa fin reste évaluable", () => {
    expect(
      conversationSitBanner({ sitStatus: "archived", sitEndDate: "2026-09-01", applicationStatus: "accepted" }, NOW),
    ).toBe("reviewable");
    expect(
      conversationSitBanner({ sitStatus: "archived", sitEndDate: "2026-11-01", applicationStatus: "accepted" }, NOW),
    ).toBeNull();
  });

  it("ConversationHeader lit conversationSitBanner, plus le seul statut de l'annonce", () => {
    const src = read("src/components/messages/ConversationHeader.tsx");
    expect(src).toContain("conversationSitBanner({");
    expect(src).not.toContain('const isCompleted = conv.sit?.status === "completed"');
    expect(src).not.toContain('const isInProgress = conv.sit?.status === "in_progress"');
  });
});

describe("Z6, LeaveReview", () => {
  it("cible le couple exact propriétaire, gardien retenu", () => {
    expect(reviewConversationPair({ isOwnerReview: true, userId: "o", revieweeId: "s" })).toEqual({ owner_id: "o", sitter_id: "s" });
    expect(reviewConversationPair({ isOwnerReview: false, userId: "s", revieweeId: "o" })).toEqual({ owner_id: "o", sitter_id: "s" });
    const src = read("src/pages/LeaveReview.tsx");
    expect(src).not.toContain(".or(`owner_id.eq.${user.id},sitter_id.eq.${user.id}`)");
    expect(src).toContain("reviewConversationPair(");
  });

  it("dit la règle réelle de publication", () => {
    expect(REVIEW_STALE_DAYS).toBe(14);
    expect(REVIEW_PUBLICATION_RULE).toContain("14 jours");
    expect(REVIEW_PUBLICATION_RULE).not.toMatch(/[–—]/);
    const src = read("src/pages/LeaveReview.tsx");
    expect(src).not.toContain("quand les deux parties auront donné le leur");
    expect(src).not.toContain("dès que l'autre partie aura envoyé le sien");
    expect(src).not.toContain("publiés simultanément pour les deux");
    expect(src).toContain("{REVIEW_PUBLICATION_RULE}");
    expect(read("supabase/functions/publish-stale-reviews/index.ts")).toContain("const STALE_DAYS = 14;");
  });
});

describe("Z7, « Laisser un avis » pour une garde archivée", () => {
  it("ReviewsTab, Sits et la messagerie utilisent isSitReviewable", () => {
    const tab = read("src/components/sits/views/tabs/ReviewsTab.tsx");
    expect(tab).toContain("isSitReviewable({ status: sitStatus, end_date: sitEndDate })");
    expect(tab).not.toContain('sitStatus === "completed"');
    const sits = read("src/pages/Sits.tsx");
    expect(sits).toContain("isSitReviewable({ status: sit.status, end_date: sit.end_date })");
    expect(sits).not.toContain('if (effectiveStatus === "completed") {');
    expect(read("src/lib/conversationSitBanner.ts")).toContain("isSitReviewable(");
    expect(read("src/components/sits/views/SitterSitView.tsx")).toContain("isSitParty={isChosenSitter}");
  });
});

describe("Z8, publication d'un avis par l'équipe", () => {
  it("« Publier » pose moderation_status valide, « Masquer » le laisse", () => {
    expect(togglePublishedUpdate(false, "admin", "t")).toEqual({
      published: true,
      moderation_status: "valide",
      moderation_hidden_at: null,
      moderation_hidden_by: null,
    });
    const hide = togglePublishedUpdate(true, "admin", "t");
    expect(hide).toEqual({ published: false, moderation_hidden_at: "t", moderation_hidden_by: "admin" });
    expect(hide).not.toHaveProperty("moderation_status");
  });
});

describe("Z9, auto-transition-sits", () => {
  const src = read("supabase/functions/auto-transition-sits/index.ts");
  it("le message du guide suppose un guide publié", () => {
    expect(src).toContain('.eq("published", true)');
  });
  it("aucun dédoublonnage par maybeSingle", () => {
    const postGuide = src.slice(src.indexOf("async function postGuideMessage"), src.indexOf("// 0. Annonces publiées"));
    expect(postGuide).not.toContain("maybeSingle");
    const already = src.slice(src.indexOf("async function alreadyPosted"), src.indexOf("async function postSystemMessage"));
    expect(already).toContain(".limit(1)");
    expect(already).toContain("data.length > 0");
    expect(already).not.toContain("maybeSingle");
  });
});

describe("Z10, publish-stale-reviews", () => {
  it("laisse on_review_notify notifier seul", () => {
    const src = read("supabase/functions/publish-stale-reviews/index.ts");
    expect(src).not.toContain('from("notifications")');
    expect(src).not.toContain("Un avis vous concernant est publie");
  });
});

describe("Z11, une seule notification au lendemain d'une garde", () => {
  it("la fin de la veille est couverte par le rappel J+1 du matin", () => {
    expect(previousUtcDay("2026-10-14")).toBe("2026-10-13");
    expect(previousUtcDay("2026-11-01")).toBe("2026-10-31");
    expect(completionNoticeCoveredByMorningReminder("2026-10-13", "2026-10-14")).toBe(true);
    expect(completionNoticeCoveredByMorningReminder("2026-10-10", "2026-10-14")).toBe(false);
    expect(completionNoticeCoveredByMorningReminder(null, "2026-10-14")).toBe(false);
  });

  it("auto-transition-sits n'écrit sa notification que hors rappel du matin, les emails restent", () => {
    const src = read("supabase/functions/auto-transition-sits/index.ts");
    expect(src).toContain("completionNoticeCoveredByMorningReminder(sit.end_date, today)");
    expect((src.match(/if \(!coveredByMorningReminder\)/g) ?? []).length).toBe(2);
    expect(read("supabase/functions/send-sit-reminders/index.ts")).toContain("Comment s'est passée la garde ?");
    expect(read("supabase/functions/_shared/sit-reminders.ts")).not.toMatch(/Deno\./);
  });
});
