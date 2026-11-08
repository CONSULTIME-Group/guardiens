/**
 * Lot L4 (08/11/2026) : accueil propriétaire sur téléphone, récit en tête.
 * Verrous : entrée du récit sans lecture, un seul bouton plein, frise dès
 * l'annonce publiée, question avant, mode compact, ligne entraide, carte
 * photos, double rôle, accueil ordinateur inchangé, budget de lectures.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, act, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { buildOwnerStoryInput } from "@/lib/ownerStoryInput";
import { resolveOwnerStory } from "@/lib/dashboardStory";
import StoryHero from "@/components/dashboard/story/StoryHero";
import { entraideLineCopy } from "@/components/dashboard/story/EntraideLine";
import { homePhotoCardLead } from "@/components/dashboard/story/HomePhotoCard";
import { readFileSync } from "node:fs";

vi.mock("@/lib/analytics", () => ({ trackEvent: vi.fn() }));

const TODAY = "2026-11-08";
const base = {
  today: TODAY,
  sits: [] as any[],
  pets: [{ name: "Caramel" }, { name: "Noisette" }],
  awaitingApps: [] as any[],
  sitterProfiles: { s1: { first_name: "Léa Martin" }, s2: { first_name: "Hugo" } },
  pendingReviews: [] as any[],
  city: "Lyon",
  nearbySittersCount: 12,
};

describe("L4, entrée du récit propriétaire", () => {
  it("candidature nouvelle d'abord, prénom seul, autres comptées", () => {
    const input = buildOwnerStoryInput({
      ...base,
      sits: [{ id: "t1", status: "published", start_date: "2026-12-19", end_date: "2027-01-03" }],
      awaitingApps: [
        { sit_id: "t1", sitter_id: "s2", status: "viewed" },
        { sit_id: "t1", sitter_id: "s1", status: "pending" },
      ],
    });
    expect(input.awaiting).toEqual({ total: 2, unread: 1, first: { sitId: "t1", sitterFirstName: "Léa" } });
    const story = resolveOwnerStory(input);
    expect(story.chapter).toBe("applications");
    expect(story.cta.label).toBe("Lire la candidature de Léa");
    expect(story.title).toBe("Léa propose de veiller sur Caramel et Noisette.");
  });

  it("garde confirmée à venir avec le gardien retenu, garde passée ignorée", () => {
    const input = buildOwnerStoryInput({
      ...base,
      sits: [
        { id: "old", status: "confirmed", start_date: "2026-10-01", end_date: "2026-10-05", applications: [] },
        { id: "c1", status: "confirmed", start_date: "2026-12-20", end_date: "2026-12-28", applications: [{ status: "accepted", sitter_id: "s2" }] },
      ],
    });
    expect(input.confirmedSit).toMatchObject({ id: "c1", sitterFirstName: "Hugo" });
  });

  it("avis dû : prénom du gardien seul", () => {
    const input = buildOwnerStoryInput({ ...base, pendingReviews: [{ sitId: "x", sitterName: "Hugo B" }] });
    expect(input.reviewDue).toEqual({ sitId: "x", sitterFirstName: "Hugo" });
  });

  it("annonce publiée : la plus proche en date", () => {
    const input = buildOwnerStoryInput({
      ...base,
      sits: [
        { id: "late", status: "published", start_date: "2027-03-01" },
        { id: "soon", status: "published", start_date: "2026-12-01" },
      ],
    });
    expect(input.activeSit?.id).toBe("soon");
  });
});

function renderHero(node: React.ReactElement) {
  const qc = new QueryClient();
  return render(<QueryClientProvider client={qc}><MemoryRouter>{node}</MemoryRouter></QueryClientProvider>);
}

const filledCount = (root: HTMLElement) =>
  Array.from(root.querySelectorAll("a, button")).filter((el) => /(^|\s)bg-primary(\s|$)/.test(el.className)).length;

describe("L4, StoryHero", () => {
  afterEach(cleanup);

  it("première annonce : question en puces, sans frise, un bouton plein", () => {
    const onPick = vi.fn();
    const story = resolveOwnerStory(buildOwnerStoryInput({ ...base, period: "noel" }));
    renderHero(<StoryHero story={story} periodPicker={{ value: "noel", onPick }} />);
    const hero = screen.getByTestId("story-hero");
    expect(hero.getAttribute("data-chapter")).toBe("first_listing");
    expect(screen.queryByTestId("garde-frise")).toBeNull();
    const chips = screen.getByTestId("story-periods").querySelectorAll("button");
    expect(Array.from(chips).map((b) => b.textContent)).toEqual(["Pour Noël", "Cet hiver", "Au printemps", "Cet été"]);
    expect(chips[0].getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(chips[1]);
    expect(onPick).toHaveBeenCalledWith("hiver");
    expect(filledCount(hero)).toBe(1);
    expect(screen.getByTestId("story-cta").getAttribute("href")).toContain("/sits/create?express=1&periode=noel");
  });

  it("annonce publiée : frise dès la publication, étape Candidats", () => {
    const story = resolveOwnerStory(buildOwnerStoryInput({
      ...base,
      sits: [{ id: "t1", status: "published", start_date: "2026-12-19", end_date: "2027-01-03" }],
    }));
    renderHero(<StoryHero story={story} />);
    const frieze = screen.getByTestId("garde-frise");
    expect(frieze.getAttribute("data-mode")).toBe("full");
    expect(frieze.querySelector("[aria-current='step']")?.textContent).toBe("Candidats");
    expect(screen.getByTestId("story-secondary").textContent).toBe("12 gardiens à proximité");
    expect(filledCount(screen.getByTestId("story-hero"))).toBe(1);
    expect(screen.getByTestId("story-art")).toBeTruthy();
  });

  it("mode compact : gouache retirée, frise sur une ligne", () => {
    const story = resolveOwnerStory(buildOwnerStoryInput({
      ...base,
      sits: [{ id: "c1", status: "confirmed", start_date: "2026-11-20", end_date: "2026-11-28", applications: [{ status: "accepted", sitter_id: "s2" }] }],
    }));
    renderHero(<StoryHero story={story} compact />);
    expect(screen.queryByTestId("story-art")).toBeNull();
    const frieze = screen.getByTestId("garde-frise");
    expect(frieze.getAttribute("data-mode")).toBe("compact");
    expect(frieze.textContent).toContain("Étape 3 sur 5 : Rencontre");
    expect(frieze.textContent).toContain("(facultative)");
  });
});

describe("L4, ligne entraide et carte photos", () => {
  it("ligne entraide : besoin en cours d'abord, sinon voisins prêts à aider", () => {
    expect(entraideLineCopy({ helpersCount: 9, radiusKm: 30 })).toMatchObject({
      text: "Entre deux gardes, 9 voisins prêts à aider à moins de 30 km.",
      href: "/petites-missions/creer",
    });
    expect(entraideLineCopy({ helpersCount: 9, radiusKm: 30, activeMission: { id: "m1", path: "/petites-missions/m1", pendingCount: 2 } })).toMatchObject({
      text: "2 personnes proposent de vous aider.",
      link: "Voir les propositions",
    });
  });

  it("carte photos : un texte par manque, rien quand le logement se voit", () => {
    expect(homePhotoCardLead("no_photo", 0)).toMatch(/extérieur/);
    expect(homePhotoCardLead("few", 2)).toMatch(/deux photos/);
    expect(homePhotoCardLead("no_home", 4)).toMatch(/c'est là que votre gardien vivra/);
    expect(homePhotoCardLead("none", 5)).toBeNull();
  });

  it("textes sans tournure négative ni tiret cadratin", () => {
    const files = ["StoryHero.tsx", "GardeFrise.tsx", "EntraideLine.tsx", "HomePhotoCard.tsx", "RoleSwitch.tsx"];
    for (const f of files) {
      const src = readFileSync(`src/components/dashboard/story/${f}`, "utf8");
      const strings = src.match(/"[^"\n]*"|`[^`\n]*`/g) ?? [];
      for (const s of strings) {
        expect(s, `${f}: ${s}`).not.toMatch(/[—–]/);
        expect(s, `${f}: ${s}`).not.toMatch(/(?<!\p{L})(ne|pas|jamais|aucun|aucune)(?!\p{L})|(?<!\p{L})n['’]/iu);
      }
    }
  });
});
