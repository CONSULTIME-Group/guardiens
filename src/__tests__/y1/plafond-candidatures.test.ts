/**
 * Lot Y1 (13/10/2026), plafond de candidatures, décision du fondateur :
 * une annonce au plafond reste publiée, ouverte et visible ; seules les
 * nouvelles candidatures sont refusées côté serveur (SIT_CLOSED). Seul le
 * propriétaire ferme une annonce.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  DEFAULT_MAX_APPLICATIONS,
  MAX_APPLICATION_STEPS,
  applicationAvailability,
  clampMaxApplications,
  describeSitClosedError,
  nextCapSteps,
} from "@/lib/applicationCap";

const read = (p: string) => readFileSync(p, "utf8");

describe("Y1, réglages par défaut", () => {
  it("10 candidatures par défaut, comme la base", () => {
    expect(DEFAULT_MAX_APPLICATIONS).toBe(10);
    const sql = read("supabase/prepared-migrations/20261013200000_y1_plafond_messages.sql");
    expect(sql).toContain("ALTER TABLE public.sits ALTER COLUMN max_applications SET DEFAULT 10;");
  });
  it("les paliers proposés relèvent toujours le plafond", () => {
    expect(nextCapSteps(10)).toEqual(MAX_APPLICATION_STEPS.filter((s) => s > 10));
    expect(nextCapSteps(10).length).toBeGreaterThan(0);
    expect(nextCapSteps(null).every((s) => s > DEFAULT_MAX_APPLICATIONS)).toBe(true);
  });
  it("la saisie reste entre 1 et 50, vide = sans plafond", () => {
    expect(clampMaxApplications(0)).toBe(1);
    expect(clampMaxApplications(80)).toBe(50);
    expect(clampMaxApplications(12)).toBe(12);
    expect(clampMaxApplications(null)).toBeNull();
    expect(clampMaxApplications(Number.NaN)).toBeNull();
  });
});

describe("Y1, état de candidature vu par le gardien", () => {
  const base = { status: "published", acceptingApplications: true, maxApplications: 5 };
  it("sous le plafond : ouverte", () => {
    expect(applicationAvailability({ ...base, liveApplications: 4 })).toBe("open");
  });
  it("au plafond ou au-delà : complète, l'annonce reste ouverte", () => {
    expect(applicationAvailability({ ...base, liveApplications: 5 })).toBe("full");
    expect(applicationAvailability({ ...base, liveApplications: 8 })).toBe("full");
  });
  it("fermée par le propriétaire : close, quel que soit le décompte", () => {
    expect(applicationAvailability({ ...base, acceptingApplications: false, liveApplications: 0 })).toBe("closed");
  });
  it("annonce non publiée : close", () => {
    expect(applicationAvailability({ ...base, status: "confirmed", liveApplications: 0 })).toBe("closed");
  });
  it("sans plafond : toujours ouverte", () => {
    expect(applicationAvailability({ ...base, maxApplications: null, liveApplications: 200 })).toBe("open");
  });
});

describe("Y1, erreur SIT_CLOSED traduite dans la fenêtre de candidature", () => {
  it("plafond atteint : « Candidatures complètes »", () => {
    const n = describeSitClosedError("SIT_CLOSED: cette annonce a reçu toutes les candidatures prévues");
    expect(n?.reason).toBe("full");
    expect(n?.title).toBe("Candidatures complètes");
    expect(n?.description).not.toMatch(/SIT_CLOSED/);
  });
  it("annonce close : « Candidatures fermées »", () => {
    const n = describeSitClosedError("SIT_CLOSED: cette annonce n'accepte plus de candidatures");
    expect(n?.reason).toBe("closed");
    expect(n?.title).toBe("Candidatures fermées");
  });
  it("toute autre erreur est laissée aux autres branches", () => {
    expect(describeSitClosedError("PROFILE_INCOMPLETE")).toBeNull();
    expect(describeSitClosedError(undefined)).toBeNull();
  });
  it("aucun tiret cadratin ni demi-cadratin dans les textes", () => {
    const lib = read("src/lib/applicationCap.ts");
    expect(lib).not.toMatch(/[–—]/);
  });
});

describe("Y1, écrans", () => {
  it("le gardien lit « Candidatures complètes » à la place du bouton, sans écriture", () => {
    const view = read("src/components/sits/views/SitterSitView.tsx");
    expect(view).toContain("applicationAvailability(");
    expect(view).toContain('? "full"');
    expect(view).not.toMatch(/accepting_applications:\s*false/);
    const sticky = read("src/components/sits/SitMobileStickyApply.tsx");
    expect(sticky).toContain('state === "full"');
    expect(sticky).toContain("Candidatures complètes");
  });
  it("la fiche publique calcule l'état à partir des candidatures vivantes", () => {
    const page = read("src/pages/PublicSitDetail.tsx");
    expect(page).toContain('supabase.rpc("get_sit_application_counts"');
    expect(page).toContain("applicationsFull={");
    const view = read("src/components/sits/PublicSitView.tsx");
    expect(view).toContain("const capReached = accepting && applicationsFull");
  });
  it("le propriétaire règle le plafond à la création et à la modification", () => {
    const field = read("src/components/sits/owner/MaxApplicationsField.tsx");
    expect(field).toContain("Nombre de candidatures que vous souhaitez recevoir");
    const create = read("src/pages/CreateSit.tsx");
    expect(create).toContain("<MaxApplicationsField");
    expect(create).not.toContain("Nombre max de candidatures");
    const edit = read("src/pages/EditSit.tsx");
    expect(edit).toContain("<MaxApplicationsField");
    expect(edit).toContain("max_applications: maxApplications");
  });
  it("relever le plafond n'écrit que max_applications", () => {
    const section = read("src/components/dashboard/owner/ApplicationCapSection.tsx");
    expect(section).toContain(".update({ max_applications: value } as any)");
    const card = read("src/components/sits/views/ReopenApplicationsCard.tsx");
    expect(card).toContain('mode === "full" ? { max_applications: newMax } : { accepting_applications: true }');
  });
  it("la recherche n'affiche plus de badge de plafond tiré de accepting_applications", () => {
    const card = read("src/components/search/listing/SearchListingCard.tsx");
    expect(card).not.toContain("application_cap.badge");
  });
});
