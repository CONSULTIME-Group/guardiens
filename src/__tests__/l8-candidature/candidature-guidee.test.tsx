/**
 * Lot L8 (09/11/2026, arène tableau de bord v2) : candidature guidée depuis
 * l'annonce. Sur téléphone, une candidature envoyée ramène au récit de
 * l'accueil (« Votre candidature est envoyée à Laurence. », récit sur
 * Réponse) ; sur ordinateur, le gardien reste sur l'annonce. Sous 40 %,
 * l'étape « D'abord, vous. » précède le mot.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import { render, screen, fireEvent, act, cleanup } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";

const h = vi.hoisted(() => ({ rec: null as any, toasts: [] as any[], events: [] as string[] }));
const U = "00000000-0000-4000-8000-000000000001";

vi.mock("@/integrations/supabase/client", async () => {
  const m = await import("../p1b/supabaseRecorder");
  h.rec = m.createRecorder();
  return { supabase: m.createSupabaseMock(h.rec, "00000000-0000-4000-8000-000000000001") };
});
vi.mock("@/contexts/AuthContext", () => {
  const user = { id: "00000000-0000-4000-8000-000000000001", role: "sitter", firstName: "Léa", profileCompletion: 45 };
  return { useAuth: () => ({ user, activeRole: "sitter", isAuthenticated: true, loading: false }) };
});
vi.mock("@/hooks/useAccessLevel", () => ({ useAccessLevel: () => ({ identityRecommended: false, level: 2, canApplyGuards: true }) }));
vi.mock("@/hooks/use-toast", () => ({ toast: (t: any) => { h.toasts.push(t); }, useToast: () => ({ toast: (t: any) => h.toasts.push(t) }) }));
vi.mock("@/lib/moderation", () => ({
  moderateContent: async () => ({ status: "ok" }),
  describeRetainedText: () => "",
  RETENTION_TITLE: { application: "" },
}));
vi.mock("@/lib/analytics", () => ({
  trackEvent: async (name: string) => { h.events.push(name); },
  trackFirstAction: async () => {},
}));
vi.mock("@/components/ai/alma/AlmaBubble", () => ({ default: () => null }));

import { fixtures } from "../p1b/supabaseRecorder";
import ApplicationModal from "@/components/sits/ApplicationModal";
import PublishedNotice from "@/components/dashboard/story/PublishedNotice";
import { APPLIED_PARAM, afterApplyTarget } from "@/lib/afterPublish";
import { registerAppQueryClient } from "@/lib/appQueryClient";
import { QueryClient } from "@tanstack/react-query";

function setDesktop(on: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: on && /min-width:\s*1024px/.test(query),
    media: query, onchange: null,
    addListener: () => {}, removeListener: () => {}, addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => false,
  })) as any;
}

let where = "";
function Where() {
  const l = useLocation();
  where = l.pathname + l.search;
  return null;
}

function mountModal(returnToStory: boolean) {
  for (const k of Object.keys(fixtures)) delete fixtures[k];
  Object.assign(fixtures, {
    sits: [{ status: "published", accepting_applications: true, max_applications: 10 }],
    applications: [{ id: "app-1" }],
  });
  return render(
    <MemoryRouter initialEntries={["/sits/s1"]}>
      <Where />
      <Routes>
        <Route path="/sits/:id" element={
          <ApplicationModal
            open onOpenChange={() => {}} sitId="s1" ownerId="o1" ownerFirstName="Laurence Martin"
            petNames={["Pompon"]} city="Écully" startDate="9 janvier" endDate="20 janvier"
            onSuccess={() => {}} returnToStory={returnToStory}
          />
        } />
        <Route path="/dashboard" element={<p>accueil</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

async function send() {
  const box = screen.getByRole("textbox");
  fireEvent.change(box, { target: { value: "Bonjour Laurence, je serais ravie de veiller sur Pompon. J'ai grandi avec des chiens." } });
  await act(async () => { fireEvent.click(screen.getByText("Envoyer ma candidature")); });
  for (let i = 0; i < 20; i++) await act(async () => { await new Promise((r) => setTimeout(r, 10)); });
}

describe("L8, retour au récit après une candidature", () => {
  beforeEach(() => { h.toasts.length = 0; h.events.length = 0; registerAppQueryClient(new QueryClient()); });
  afterEach(() => { cleanup(); setDesktop(false); });

  it("adresse de retour : téléphone vers le récit, ordinateur sur l'annonce", () => {
    expect(afterApplyTarget({ firstName: "Laurence Martin", phone: true })).toBe(`/dashboard?${APPLIED_PARAM}=Laurence`);
    expect(afterApplyTarget({ firstName: "", phone: true })).toBe(`/dashboard?${APPLIED_PARAM}=1`);
    expect(afterApplyTarget({ firstName: "Laurence", phone: false })).toBeNull();
  });

  it("téléphone : la candidature part, puis l'accueil, sans toast en double", async () => {
    setDesktop(false);
    mountModal(true);
    await send();
    expect(h.rec.writes).toContain("insert:applications");
    expect(h.events).toContain("application_submitted");
    expect(where).toBe("/dashboard?candidature=Laurence");
    expect(h.toasts.find((t) => t.title === "Candidature envoyée !")).toBeUndefined();
  });

  it("ordinateur : le gardien reste sur l'annonce, avec la confirmation habituelle", async () => {
    setDesktop(true);
    mountModal(true);
    await send();
    expect(where).toBe("/sits/s1");
    expect(h.toasts.find((t) => t.title === "Candidature envoyée !")).toBeTruthy();
  });

  it("fiche publique (sans retour au récit) : comportement d'avant", async () => {
    setDesktop(false);
    mountModal(false);
    await send();
    expect(where).toBe("/sits/s1");
  });

  it("l'accueil dit la candidature envoyée en role=status, puis retire le paramètre", async () => {
    render(
      <MemoryRouter initialEntries={["/dashboard?candidature=Laurence"]}>
        <Where />
        <PublishedNotice />
      </MemoryRouter>,
    );
    const n = screen.getByTestId("story-published-notice");
    expect(n.getAttribute("role")).toBe("status");
    expect(n.getAttribute("data-kind")).toBe("applied");
    expect(n.textContent).toBe("Votre candidature est envoyée à Laurence.");
    await act(async () => {});
    expect(where).toBe("/dashboard");
  });
});

describe("L8, l'étape « D'abord, vous. » sous 40 %", () => {
  it("la fiche gardien ramène au récit et l'étape précède le mot", () => {
    const view = readFileSync("src/components/sits/views/SitterSitView.tsx", "utf8");
    expect(view).toMatch(/<ApplicationModal[\s\S]*?returnToStory[\s\S]*?\/>/);
    expect(view).toContain("onReadyToApply={() => setApplyOpen(true)}");
    const modal = readFileSync("src/components/profile/CompleteProfileToApplyModal.tsx", "utf8");
    expect(modal).toContain("D'abord, vous.");
    expect(modal).toContain("Enregistrer et écrire mon mot");
  });

  it("un profil à 25 % atteint 40 % avec le noyau proposé (photo, ou quelques lignes)", async () => {
    const { computeSitterCompletion } = await import("@/lib/profileCompletion");
    const base = { first_name: "Léa", postal_code: "69005", city: "Lyon", country: "FR", languages: ["Français"], animal_types: ["Chiens"], life_pace: "calme" } as any;
    const start = computeSitterCompletion(base).score;
    expect(start).toBeGreaterThanOrEqual(20);
    expect(start).toBeLessThan(40);
    expect(computeSitterCompletion({ ...base, avatar_url: "a.jpg" }).score).toBeGreaterThanOrEqual(40);
    expect(computeSitterCompletion({ ...base, bio: "x".repeat(60) }).score).toBeGreaterThanOrEqual(30);
  });
});

describe("L8, tenue à 360 px et à 130 % (captures du 09/11)", () => {
  it("les fenêtres de candidature restent dans l'écran", () => {
    const apply = readFileSync("src/components/sits/ApplicationModal.tsx", "utf8");
    // La grille interne prenait la largeur de son contenu (bulle d'Alma, champ du mot) : 380 px pour 360.
    expect(apply).toContain('className="grid grid-cols-[minmax(0,1fr)] md:grid-cols-[minmax(0,1fr)_220px] gap-4"');
    expect(apply.match(/h-auto min-h-\[44px\] whitespace-normal text-left/g)?.length).toBe(2);
    const gate = readFileSync("src/components/profile/CompleteProfileToApplyModal.tsx", "utf8");
    expect(gate).toContain("overflow-x-hidden rounded-3xl p-0 grid-cols-[minmax(0,1fr)]");
    expect(gate).toContain('<div className="flex flex-wrap items-center justify-between gap-2">');
    const bubble = readFileSync("src/components/ai/alma/AlmaBubble.tsx", "utf8");
    expect(bubble).toContain("max-[340px]:flex-col");
  });
});
