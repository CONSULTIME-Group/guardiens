/**
 * Lot INS1 étape 1 (12/11/2026) : à l'inscription, la garde se coche (une
 * case, les deux, ou aucune) et « Entraide & sorties » est acquis à tout
 * membre. « Continuer » est toujours actif.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import "@/i18n";
import { MemoryRouter } from "react-router-dom";
import { arrivalIntentForGuardChoice, guardBoxesFor, resolveGuardChoice } from "@/lib/signupIntent";
import { afterWelcome, arrivalIntentFor } from "@/lib/arrival";

(globalThis as any).ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} };
const tracked = vi.hoisted(() => ({ events: [] as Array<{ type: string; meta: Record<string, unknown> | undefined }> }));
const registerMock = vi.hoisted(() => vi.fn(async () => ({ user: { id: "u1", identities: [{}] }, session: null })));
let flag = { enabled: true, appliesSince: "2026-10-01T00:00:00Z" as string | null, loading: false };
let search = new URLSearchParams();

vi.mock("react-router-dom", async (orig) => {
  const real: any = await orig();
  return { ...real, useNavigate: () => vi.fn(), useSearchParams: () => [search, vi.fn()] };
});
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: null, refreshProfile: vi.fn(), register: registerMock }) }));
vi.mock("@/hooks/useFeatureFlag", () => ({ useFeatureFlag: () => flag }));
vi.mock("@/lib/analytics", () => ({
  trackEvent: (type: string, opts?: { metadata?: Record<string, unknown> }) => { tracked.events.push({ type, meta: opts?.metadata }); },
  trackEventWithUserId: vi.fn(),
  mapSignupError: () => "x",
}));
vi.mock("@/integrations/lovable", () => ({ lovable: { auth: { signInWithOAuth: vi.fn() } } }));

const read = (f: string) => readFileSync(resolve(process.cwd(), f), "utf8");
const texts = JSON.parse(read("src/i18n/locales/fr/arrival.json"));
const R = async () => {
  const { default: Register } = await import("@/pages/Register");
  return render(<MemoryRouter><Register /></MemoryRouter>);
};
const selected = () => tracked.events.filter((e) => e.type === "signup_role_selected");

beforeEach(() => {
  cleanup();
  tracked.events.length = 0;
  registerMock.mockClear();
  localStorage.clear();
  search = new URLSearchParams();
  flag = { enabled: true, appliesSince: "2026-10-01T00:00:00Z", loading: false };
});

describe("les quatre combinaisons : rôle, intention, rappel", () => {
  it("aucune case : rôle polyvalent, intention entraide", () => {
    expect(resolveGuardChoice(false, false)).toEqual({ choice: "none", role: "both", entraide: true, recapKey: "arrival.c2.entraide_recap" });
    expect(arrivalIntentForGuardChoice(true, null, "both", false)).toBe("entraide");
  });
  it("« Je cherche un gardien » seule : propriétaire, comme avant", () => {
    expect(resolveGuardChoice(true, false)).toEqual({ choice: "owner", role: "owner", entraide: false, recapKey: "arrival.c1.owner_title" });
    expect(arrivalIntentForGuardChoice(false, null, "owner", false)).toBe("owner");
  });
  it("« Je veux garder » seule : gardien, comme avant", () => {
    expect(resolveGuardChoice(false, true)).toEqual({ choice: "sitter", role: "sitter", entraide: false, recapKey: "arrival.c1.sitter_title" });
    expect(arrivalIntentForGuardChoice(false, null, "sitter", false)).toBe("sitter");
  });
  it("les deux cases : double rôle, propriétaire d'abord", () => {
    expect(resolveGuardChoice(true, true)).toEqual({ choice: "both", role: "both", entraide: false, recapKey: "arrival.c2.both_recap" });
    expect(arrivalIntentForGuardChoice(false, null, "both", true)).toBe("owner");
  });
  it("un lien ?role=both, sans passer par les cases, garde l'intention d'avant", () => {
    expect(arrivalIntentForGuardChoice(false, null, "both", false)).toBeNull();
  });
  it("« Modifier » : les cases retrouvent l'état du rôle posé", () => {
    expect(guardBoxesFor("owner", false)).toEqual({ owner: true, sitter: false });
    expect(guardBoxesFor("both", false)).toEqual({ owner: true, sitter: true });
    expect(guardBoxesFor("both", true)).toEqual({ owner: false, sitter: false });
    expect(guardBoxesFor(null, false)).toEqual({ owner: false, sitter: false });
  });
});

describe("après l'écran de bienvenue : propriétaire d'abord pour un double rôle", () => {
  it("double rôle sans entraide : parcours propriétaire", () => {
    expect(arrivalIntentFor("both", false)).toBe("owner");
    expect(afterWelcome(arrivalIntentFor("both", false), "/sits/create?source=signup")).toBe(`/arrivee/vous?next=${encodeURIComponent("/sits/create?source=signup")}`);
  });
  it("double rôle venu par l'entraide : parcours entraide, inchangé", () => {
    expect(arrivalIntentFor("both", true)).toBe("entraide");
  });
  it("propriétaire et gardien : inchangés", () => {
    expect(arrivalIntentFor("owner", false)).toBe("owner");
    expect(arrivalIntentFor("sitter", false)).toBe("sitter");
  });
});

describe("écran C1", () => {
  it("textes de la spécification, au mot près", () => {
    expect(texts.c1.title).toBe("Qu'est-ce qui vous amène ?");
    expect(texts.c1.guard_eyebrow).toBe("La garde");
    expect(texts.c1.guard_hint).toBe("Cochez ce qui vous concerne : une case, les deux, ou aucune.");
    expect(texts.c1.owner_title).toBe("Je cherche un gardien");
    expect(texts.c1.owner_text).toBe("Pour ma maison, mes animaux, pendant mes absences.");
    expect(texts.c1.sitter_title).toBe("Je veux garder");
    expect(texts.c1.sitter_text).toBe("Des maisons et des animaux près de chez moi, ou plus loin.");
    expect(texts.c1.all_eyebrow).toBe("Pour tous les membres");
    expect(texts.c1.included_title).toBe("Entraide & sorties");
    expect(texts.c1.included_text).toBe("Un coup de main, une belote, une balade près de chez vous. C'est inclus, rien à cocher.");
    expect(texts.c2.entraide_recap).toBe("Entraide & sorties");
    expect(texts.c2.both_recap).toBe("Je cherche un gardien, et je veux garder");
    expect(texts.c1.text).toBeUndefined();
    expect(texts.c1.entraide_link).toBeUndefined();
  });

  it("« Continuer » n'est jamais désactivé, sans case cochée on arrive par l'entraide", async () => {
    await R();
    const go = await screen.findByRole("button", { name: "Continuer" });
    expect((go as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(go);
    expect(await screen.findByText("Créez votre compte")).toBeTruthy();
    expect(screen.getByText("Entraide & sorties")).toBeTruthy();
    expect(localStorage.getItem("guardiens_signup_intent")).toBe("entraide");
    expect(selected()).toHaveLength(1);
    expect(selected()[0].meta).toEqual({ role: "both", choice: "none", intent: "entraide" });
  });

  it("une case : même rôle et même rappel qu'avant", async () => {
    await R();
    fireEvent.click(await screen.findByRole("checkbox", { name: "Je veux garder" }));
    fireEvent.click(screen.getByRole("button", { name: "Continuer" }));
    expect(await screen.findByText("Créez votre compte")).toBeTruthy();
    expect(screen.getByText("Je veux garder")).toBeTruthy();
    expect(localStorage.getItem("guardiens_signup_intent")).toBeNull();
    expect(selected()[0].meta).toEqual({ role: "sitter", choice: "sitter" });
  });

  it("deux cases : double rôle, un seul événement, rappel des deux", async () => {
    await R();
    fireEvent.click(await screen.findByRole("checkbox", { name: "Je cherche un gardien" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Je veux garder" }));
    fireEvent.click(screen.getByRole("button", { name: "Continuer" }));
    expect(await screen.findByText("Je cherche un gardien, et je veux garder")).toBeTruthy();
    expect(selected()).toHaveLength(1);
    expect(selected()[0].meta).toEqual({ role: "both", choice: "both" });
  });

  it("cases natives (Espace les coche, l'état est annoncé), le bloc inclus ne prend pas le focus", async () => {
    await R();
    const owner = await screen.findByRole("checkbox", { name: "Je cherche un gardien" }) as HTMLInputElement;
    const sitter = screen.getByRole("checkbox", { name: "Je veux garder" }) as HTMLInputElement;
    // Une case native se coche à la barre d'espace et annonce son état sans code de plus.
    for (const box of [owner, sitter]) {
      expect(box.tagName).toBe("INPUT");
      expect(box.type).toBe("checkbox");
      expect(box.disabled).toBe(false);
      expect(box.tabIndex).toBe(0);
    }
    fireEvent.click(owner);
    expect(owner.checked).toBe(true);
    fireEvent.click(owner);
    expect(owner.checked).toBe(false);
    // Ordre de tabulation de l'écran : les deux cases, « Continuer », puis le lien de connexion.
    const c1 = screen.getByTestId("arrival-c1");
    const focusable = Array.from(c1.querySelectorAll("input, button, a, [tabindex]"));
    expect(focusable.map((el) => el.tagName)).toEqual(["INPUT", "INPUT", "BUTTON", "A"]);
    const included = screen.getByTestId("arrival-c1-included");
    expect(included.querySelector("button, a, input, [tabindex], [role='button'], [role='checkbox']")).toBeNull();
    expect(screen.getAllByRole("checkbox")).toHaveLength(2);
  });

  it("« Modifier » ramène à l'étape 1 avec les cases dans l'état laissé", async () => {
    await R();
    fireEvent.click(await screen.findByRole("checkbox", { name: "Je cherche un gardien" }));
    fireEvent.click(screen.getByRole("button", { name: "Continuer" }));
    fireEvent.click(await screen.findByText("Modifier"));
    expect((await screen.findByRole("checkbox", { name: "Je cherche un gardien" }) as HTMLInputElement).checked).toBe(true);
    expect((screen.getByRole("checkbox", { name: "Je veux garder" }) as HTMLInputElement).checked).toBe(false);
  });

  it("/inscription?role=owner saute toujours l'étape 1", async () => {
    search = new URLSearchParams({ role: "owner" });
    await R();
    expect(await screen.findByText("Créez votre compte")).toBeTruthy();
    expect(screen.queryByTestId("arrival-c1")).toBeNull();
  });

  it("drapeau éteint : l'ancienne étape à trois rôles reste en place", async () => {
    flag = { enabled: false, appliesSince: null, loading: false };
    await R();
    expect(await screen.findByText(/Les deux|polyvalent/i)).toBeTruthy();
    expect(screen.queryByTestId("arrival-c1")).toBeNull();
  });
});

describe("code : ce que le lot retire et ce qu'il laisse", () => {
  const parts = read("src/components/arrival/RegisterArrivalParts.tsx");
  it("plus de groupe radio ni de lien entraide", () => {
    const c1 = parts.slice(parts.indexOf("export function ArrivalC1"), parts.indexOf("export function ArrivalC2Header"));
    expect(c1).not.toContain("radiogroup");
    expect(c1).not.toContain("entraide_link");
    expect(c1).not.toContain("disabled");
    expect(c1).toContain('type="checkbox"');
  });
  it("aucune illustration nouvelle : les trois images existent déjà dans le dépôt", () => {
    expect(parts).toContain("assets/missions/spot-jeux-160.webp");
    expect(parts).toContain("assets/aquarelles/univers-gardes-320.webp");
    expect(parts).toContain("assets/aquarelles/final-arrivee-240.webp");
  });
  it("l'inscription transmet l'intention des cases", () => {
    expect(read("src/pages/Register.tsx")).toContain("arrivalIntentForGuardChoice(entraideIntent, detectedIntent, selectedRole, v2 && guardChosen && guardBoxes.owner && guardBoxes.sitter)");
  });
});
