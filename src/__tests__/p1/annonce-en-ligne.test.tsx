// Lot P1 (19/10/2026, arène « annonce en ligne lisible ») : une annonce en
// ligne reste visible et lisible pour sa propriétaire.
import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: vi.fn(async () => ({ data: null, error: null })),
    from: () => { throw new Error("aucune lecture attendue"); },
  },
}));
vi.mock("@/lib/analytics", () => ({ trackEvent: vi.fn(async () => undefined) }));
vi.mock("@/hooks/useViewerOwnerForAffinity", () => ({ useViewerOwnerForAffinity: () => ({ owner: null }) }));
vi.mock("@/hooks/useImpressionOnce", () => ({ useImpressionOnce: () => undefined }));

import OwnerStarSection from "@/components/dashboard/owner/OwnerStarSection";
import OwnerAnnonceSection from "@/components/dashboard/owner/OwnerAnnonceSection";
import { selectOwnerStarVariant } from "@/lib/ownerStarVariant";
import {
  isBareCreateEntry,
  isLiveSit,
  periodsOverlap,
  pickLiveSit,
  resumeRedirectFor,
} from "@/lib/ownerLiveSit";

const TODAY = "2026-10-19";

describe("P1.1 · carte principale : l'annonce en ligne passe avant le brouillon", () => {
  const base = { ongoingSit: null, pendingAppsCount: 0, todayIso: TODAY };

  it("annonce en ligne et brouillon vivant : variante annonce", () => {
    expect(selectOwnerStarVariant({ ...base, hasActiveAnnonce: true, latestDraft: { end_date: null } })).toBe("annonce");
  });
  it("garde en cours et candidatures gardent la priorité", () => {
    expect(selectOwnerStarVariant({ ...base, ongoingSit: { id: "x" }, hasActiveAnnonce: true, latestDraft: null })).toBe("ongoing");
    expect(selectOwnerStarVariant({ ...base, pendingAppsCount: 1, hasActiveAnnonce: true, latestDraft: null })).toBe("applications");
  });
  it("brouillon seul : variante brouillon inchangée ; rien : publier", () => {
    expect(selectOwnerStarVariant({ ...base, latestDraft: { end_date: "2026-12-01" } })).toBe("draft");
    expect(selectOwnerStarVariant({ ...base, latestDraft: null })).toBe("publish");
  });

  const published = {
    id: "s-live", status: "published", title: "Garde 1 chien et 2 vaches",
    start_date: "2026-12-31", end_date: "2027-01-15", created_at: "2026-10-12",
  } as any;
  const props = (latestDraft: any) => ({
    ongoingSit: null,
    pendingApps: [],
    sitterProfiles: {},
    latestDraft,
    primaryAction: null,
    activeAnnonce: <OwnerAnnonceSection sits={[published]} pendingAppCount={0} />,
  });

  it("annonce et brouillon sans dates : une carte, l'annonce, puis la ligne brouillon", () => {
    const draft = { id: "s-draft", status: "draft", title: "Garde 1 chien et 2 vaches", start_date: null, end_date: null } as any;
    render(<MemoryRouter><OwnerStarSection {...props(draft)} /></MemoryRouter>);
    expect(document.querySelectorAll("[data-dashboard-star]").length).toBe(1);
    const text = document.body.textContent ?? "";
    expect(text).not.toMatch(/presque prête/);
    expect(text).toMatch(/Brouillon en cours : Garde 1 chien et 2 vaches, dates à choisir\./);
    expect(screen.getByRole("link", { name: "Voir et modifier l'annonce" }).getAttribute("href")).toBe("/sits/s-live");
    expect(screen.getByRole("link", { name: "Continuer ce brouillon" }).getAttribute("href")).toBe("/sits/create?draftId=s-draft");
    expect(screen.getByRole("link", { name: "Voir mes brouillons" }).getAttribute("href")).toBe("/sits?tab=drafts");
    expect(text).not.toMatch(/[–—]/);
  });

  it("brouillon d'une autre période : dates affichées, jamais « cette garde »", () => {
    const draft = { id: "s-mars", status: "draft", title: "Garde en mars", start_date: "2027-03-07", end_date: "2027-03-13" } as any;
    render(<MemoryRouter><OwnerStarSection {...props(draft)} /></MemoryRouter>);
    const line = screen.getByTestId("owner-star-draft-line").textContent ?? "";
    expect(line).toMatch(/2027/);
    expect(line).not.toMatch(/cette garde/);
  });

  it("annonce sans brouillon : aucune ligne brouillon", () => {
    render(<MemoryRouter><OwnerStarSection {...props(null)} /></MemoryRouter>);
    expect(screen.queryByTestId("owner-star-draft-line")).toBeNull();
    expect(screen.getByRole("link", { name: "Voir et modifier l'annonce" })).toBeTruthy();
  });
});

describe("P1.2 · lien de reprise d'une annonce qui n'est plus un brouillon", () => {
  it("annonce en ligne : vers l'annonce, message neutre", () => {
    const r = resumeRedirectFor({ id: "a1", status: "published" });
    expect(r.to).toBe("/sits/a1");
    expect(r.title).toBe("Bonne nouvelle, votre annonce est déjà en ligne.");
  });
  it("garde confirmée ou en cours : vers l'annonce", () => {
    expect(resumeRedirectFor({ id: "a2", status: "confirmed" }).to).toBe("/sits/a2");
    expect(resumeRedirectFor({ id: "a3", status: "in_progress" }).title).toBe("Cette garde est déjà organisée.");
  });
  it("annonce terminée, annulée, expirée ou archivée : annonces passées", () => {
    for (const status of ["completed", "cancelled", "expired", "archived"]) {
      expect(resumeRedirectFor({ id: "a4", status }).to).toBe("/sits?tab=past");
    }
  });
  it("identifiant inconnu ou d'un autre compte : tableau de bord, sans accusation", () => {
    const r = resumeRedirectFor(null);
    expect(r.to).toBe("/dashboard");
    expect(`${r.title} ${r.description}`).not.toMatch(/appartient|introuvable/);
  });
  it("CreateSit : plus de message rouge, seconde lecture par identifiant et propriétaire", () => {
    const src = readFileSync("src/pages/CreateSit.tsx", "utf8");
    expect(src).not.toMatch(/Brouillon introuvable/);
    expect(src).not.toMatch(/ne vous appartient pas/);
    expect(src).toMatch(/select\("id, status"\)\.eq\("id", draftIdParam\)\.eq\("user_id", user\.id\)/);
    expect(src).toMatch(/resumeRedirectFor\(/);
  });
  it("reprise sans paramètre : même brouillon que le tableau de bord (updated_at)", () => {
    const src = readFileSync("src/pages/CreateSit.tsx", "utf8");
    expect(src).toMatch(/eq\("status", "draft"\)\.order\("updated_at", \{ ascending: false \}\)\.limit\(1\)/);
  });
});

describe("P1.3 · entrée du formulaire et dates qui se recoupent", () => {
  it("entrée nue : ni reprise, ni copie, ni express", () => {
    expect(isBareCreateEntry(new URLSearchParams(""))).toBe(true);
    expect(isBareCreateEntry(new URLSearchParams("debut=2026-12-20"))).toBe(true);
    for (const q of ["draftId=x", "resume=x", "from=x&mode=copy", "express=1"]) {
      expect(isBareCreateEntry(new URLSearchParams(q))).toBe(false);
    }
  });
  it("annonce en ligne : publiée ou confirmée, fin non passée", () => {
    expect(isLiveSit({ id: "1", status: "published", end_date: "2027-01-15" }, TODAY)).toBe(true);
    expect(isLiveSit({ id: "2", status: "confirmed", end_date: null }, TODAY)).toBe(true);
    expect(isLiveSit({ id: "3", status: "published", end_date: "2026-10-01" }, TODAY)).toBe(false);
    expect(isLiveSit({ id: "4", status: "draft", end_date: null }, TODAY)).toBe(false);
    expect(pickLiveSit([
      { id: "b", status: "published", start_date: "2027-03-07", end_date: "2027-03-13" },
      { id: "a", status: "published", start_date: "2026-12-31", end_date: "2027-01-15" },
    ], TODAY)?.id).toBe("a");
  });
  it("chevauchement par dates, bornes incluses ; période distincte sans alerte", () => {
    expect(periodsOverlap("2027-01-10", "2027-01-20", "2026-12-31", "2027-01-15")).toBe(true);
    expect(periodsOverlap("2027-01-15", "2027-01-15", "2026-12-31", "2027-01-15")).toBe(true);
    expect(periodsOverlap("2027-03-07", "2027-03-13", "2026-11-14", "2026-11-16")).toBe(false);
    expect(periodsOverlap(null, null, "2026-12-31", "2027-01-15")).toBe(false);
  });
  it("CreateSit : écran de choix avant toute saisie, libellés et alerte", () => {
    const src = readFileSync("src/pages/CreateSit.tsx", "utf8");
    expect(src).toMatch(/Vous avez déjà une annonce en ligne/);
    expect(src).toMatch(/Modifier mon annonce/);
    expect(src).toMatch(/Préparer une autre garde/);
    expect(src).toMatch(/Voir mon annonce/);
    expect(src).toMatch(/Ces dates recoupent votre annonce/);
    expect(src).toMatch(/Garder ces dates/);
    // Le choix s'affiche avant le formulaire (et donc avant l'autosave).
    const choice = src.indexOf('data-testid="create-live-choice"');
    const stepper = src.indexOf("<StepperBar");
    expect(choice).toBeGreaterThan(0);
    expect(choice).toBeLessThan(stepper);
  });
});

describe("P1.4 · phrase d'accueil exacte", () => {
  it("plus de promesse « les candidatures arrivent »", () => {
    const src = readFileSync("src/components/dashboard/OwnerDashboard.tsx", "utf8");
    expect(src).not.toMatch(/les candidatures arrivent/);
    expect(src).toMatch(/Votre annonce est en ligne\. Une notification vous prévient dès qu'un gardien se propose\./);
  });
});

describe("P1.0 · publication réservée au propriétaire", () => {
  it("migration drizzle 0094 enregistrée au journal", () => {
    const journal = JSON.parse(readFileSync("drizzle/migrations/meta/_journal.json", "utf8"));
    expect(journal.entries.some((e: { tag: string }) => e.tag === "0094_p1_publication_proprietaire")).toBe(true);
    const sql = readFileSync("drizzle/migrations/0094_p1_publication_proprietaire.sql", "utf8");
    expect(sql).toMatch(/publication_reservee_au_proprietaire/);
    expect(sql).toMatch(/guardiens\.publication_forcee/);
  });
});
