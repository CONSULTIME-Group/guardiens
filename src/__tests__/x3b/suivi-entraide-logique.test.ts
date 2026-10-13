/**
 * Lot X3b : logique pure du suivi d'entraide.
 * C-04 : besoin en cours de l'auteur sur le tableau de bord propriétaire.
 * C-11 : l'aidant suit ses propositions d'aide.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { entraideMissionPath, pickActiveEntraideMission } from "@/lib/activeEntraideMission";
import { buildHelpProposals, CLOSED_PROPOSAL_DAYS, MAX_PROPOSALS } from "@/lib/myHelpProposals";

describe("C-04, pickActiveEntraideMission", () => {
  const rows = [
    { id: "m3", status: "open", title: "Sortir le chien", created_at: "2026-10-12T10:00:00Z", small_mission_responses: [] },
    { id: "m2", status: "open", title: "Monter une coiffeuse", city: "gonfaron", created_at: "2026-10-05T10:00:00Z", small_mission_responses: [{ id: "r1", status: "pending" }, { id: "r2", status: "declined" }] },
    { id: "m1", status: "completed", title: "Arroser", created_at: "2026-10-13T10:00:00Z", small_mission_responses: [{ id: "r3", status: "pending" }] },
  ];
  it("un besoin avec une proposition à lire passe avant un besoin plus récent", () => {
    const a = pickActiveEntraideMission(rows);
    expect(a).toMatchObject({ id: "m2", pendingCount: 1, path: "/petites-missions/m2", status: "open" });
  });
  it("un besoin terminé ou clos n'est jamais retenu", () => {
    expect(pickActiveEntraideMission([rows[2]])).toBeNull();
    expect(pickActiveEntraideMission([{ id: "x", status: "cancelled" }])).toBeNull();
    expect(pickActiveEntraideMission(null)).toBeNull();
  });
  it("sans proposition, un besoin en cours passe avant un besoin ouvert", () => {
    const a = pickActiveEntraideMission([
      { id: "o", status: "open", created_at: "2026-10-12T00:00:00Z" },
      { id: "p", status: "in_progress", created_at: "2026-10-01T00:00:00Z" },
    ]);
    expect(a && a.id).toBe("p");
  });
  it("un projet pointe vers sa page /projets/{slug}", () => {
    expect(entraideMissionPath({ id: "p1", slug: "chantier", category: "projet" })).toBe("/projets/chantier");
    expect(entraideMissionPath({ id: "p1", slug: null, category: "projet" })).toBe("/projets/p1");
    expect(entraideMissionPath({ id: "m1", slug: "arroser", category: "garden" })).toBe("/petites-missions/m1");
  });
  it("le tableau de bord transmet le besoin au bandeau, sans lecture de plus", () => {
    const dash = readFileSync("src/components/dashboard/OwnerDashboard.tsx", "utf8");
    const band = dash.slice(dash.indexOf("<OwnerEntraideBand"), dash.indexOf("/>", dash.indexOf("<OwnerEntraideBand")));
    expect(band).toContain("activeMission={myActiveMission}");
    const hook = readFileSync("src/hooks/useOwnerDashboardData.ts", "utf8");
    expect(hook).toContain("activeMission: pickActiveEntraideMission(allMyMissions as any[])");
    expect(hook.match(/fetchMySmallMissionsIndex\(/g)?.length).toBe(2);
  });
});

describe("C-11, buildHelpProposals", () => {
  const NOW = new Date("2026-10-13T12:00:00Z");
  const missions = [
    { id: "a", title: "Garder ma chienne", city: "toulon", status: "open", category: "animals" },
    { id: "b", title: "Cours de maths", city: "lyon", status: "cancelled", category: "other" },
    { id: "c", title: "Chantier participatif", status: "open", category: "projet", slug: "chantier" },
    { id: "d", title: "Bricolage", status: "in_progress", category: "diy" },
    { id: "e", title: "Ancien besoin", status: "cancelled", category: "other" },
  ];
  const responses = [
    { id: "r-a", mission_id: "a", status: "pending", created_at: "2026-10-12T09:00:00Z", conversation_id: null },
    { id: "r-b", mission_id: "b", status: "pending", created_at: "2026-10-10T09:00:00Z", conversation_id: null },
    { id: "r-c", mission_id: "c", status: "accepted", created_at: "2026-10-09T09:00:00Z", conversation_id: "conv-1" },
    { id: "r-d", mission_id: "d", status: "accepted", created_at: "2026-10-08T09:00:00Z", conversation_id: "conv-2" },
    { id: "r-e", mission_id: "e", status: "declined", created_at: "2026-09-01T09:00:00Z", conversation_id: null },
    { id: "r-x", mission_id: "zz", status: "pending", created_at: "2026-10-12T09:00:00Z", conversation_id: null },
  ];
  const list = buildHelpProposals(responses, missions, NOW);

  it("en attente d'abord, puis retenue sur un projet rouvert, puis besoin clos", () => {
    expect(list.map((p) => p.responseId)).toEqual(["r-a", "r-c", "r-b"]);
    expect(list.map((p) => p.state)).toEqual(["waiting", "chosen", "closed"]);
  });
  it("chaque ligne dit où, le statut, le lien du besoin et la conversation", () => {
    expect(list[0]).toMatchObject({ title: "Garder ma chienne", city: "toulon", label: "En attente de réponse", missionPath: "/petites-missions/a", conversationPath: null });
    expect(list[1]).toMatchObject({ missionPath: "/projets/chantier", conversationPath: "/messages/conv-1", label: "Vous êtes la personne retenue" });
    expect(list[2].label).toBe("Besoin clos, merci pour votre proposition");
  });
  it("un coup de main en cours reste dans « Vos coups de main », sans doublon", () => {
    expect(list.some((p) => p.missionId === "d")).toBe(false);
  });
  it(`une proposition close de plus de ${CLOSED_PROPOSAL_DAYS} jours laisse la place`, () => {
    expect(list.some((p) => p.missionId === "e")).toBe(false);
  });
  it("une réponse retirée ou sans besoin lisible n'apparaît pas", () => {
    expect(buildHelpProposals([{ id: "w", mission_id: "a", status: "withdrawn" }], missions, NOW)).toEqual([]);
    expect(list.some((p) => p.responseId === "r-x")).toBe(false);
  });
  it(`au plus ${MAX_PROPOSALS} lignes`, () => {
    const many = Array.from({ length: 9 }, (_, i) => ({ id: `r${i}`, mission_id: "a", status: "pending", created_at: `2026-10-0${i + 1}T00:00:00Z` }));
    expect(buildHelpProposals(many, missions, NOW)).toHaveLength(MAX_PROPOSALS);
  });
  it("libellés positifs, sans tiret long", () => {
    for (const p of list) expect(p.label).not.toMatch(/[—–]/);
  });
  it("une seule lecture des réponses et une seule des besoins dans useMyHelpExchanges", () => {
    const src = readFileSync("src/components/dashboard/MesCoupsDeMain.tsx", "utf8");
    const load = src.slice(src.indexOf("const load = useCallback"), src.indexOf("useEffect(() => { void load(); }"));
    expect(load.match(/from\("small_mission_responses"\)/g)?.length).toBe(2);
    expect(load.match(/from\("small_missions"\)/g)?.length).toBe(1);
    expect(load).toContain('.in("status", ["pending", "accepted", "declined"])');
  });
});
