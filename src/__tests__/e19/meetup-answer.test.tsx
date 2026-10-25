/**
 * Lot E19 : fin d'un coup de main. Case de publication décochée par défaut,
 * mot avec coordonnées signalé avant l'envoi, troisième issue « annulé » et
 * lien Signaler.
 */
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";

const { auth } = vi.hoisted(() => ({ auth: { user: null as null | { id: string } } }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: auth.user }) }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: vi.fn() } }));

import MeetupAnswer, { MEETUP_LABELS, publicConsentHint } from "@/components/entraide/MeetupAnswer";

afterEach(() => { cleanup(); auth.user = null; });

const renderAnswer = (props: Partial<Parameters<typeof MeetupAnswer>[0]> = {}) => {
  const onYes = vi.fn();
  const onNo = vi.fn();
  const onCancelled = vi.fn();
  render(
    <MemoryRouter initialEntries={["/entraide/je-peux?a=rencontre&t=abc"]}>
      <MeetupAnswer otherFirstName="Hugo" onYes={onYes} onNo={onNo} onCancelled={onCancelled} missionId="m1" {...props} />
    </MemoryRouter>,
  );
  return { onYes, onNo, onCancelled };
};

describe("case de publication", () => {
  it("est décochée par défaut et part à false", () => {
    const { onYes } = renderAnswer();
    fireEvent.click(screen.getByRole("button", { name: MEETUP_LABELS.yes }));
    const box = screen.getByRole("checkbox");
    expect(box.getAttribute("aria-checked")).toBe("false");
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Un vrai plaisir." } });
    fireEvent.click(screen.getByRole("button", { name: "Valider" }));
    expect(onYes).toHaveBeenCalledWith("Un vrai plaisir.", false);
  });

  it("part à true seulement après un clic", () => {
    const { onYes } = renderAnswer();
    fireEvent.click(screen.getByRole("button", { name: MEETUP_LABELS.yes }));
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Valider" }));
    expect(onYes).toHaveBeenCalledWith("", true);
  });

  it("dit que les prénoms demandent l'accord des deux personnes", () => {
    renderAnswer();
    fireEvent.click(screen.getByRole("button", { name: MEETUP_LABELS.yes }));
    expect(screen.getByText(MEETUP_LABELS.publicOk)).toBeTruthy();
    expect(screen.getByText(publicConsentHint("Hugo"))).toBeTruthy();
  });
});

describe("mot avec coordonnées", () => {
  it.each([
    ["un numéro", "Appelez-moi au 06 12 34 56 78"],
    ["un email", "hugo@exemple.fr"],
    ["une adresse", "Je suis au 12 rue des Lilas"],
  ])("%s bloque l'envoi", (_label, word) => {
    const { onYes } = renderAnswer();
    fireEvent.click(screen.getByRole("button", { name: MEETUP_LABELS.yes }));
    fireEvent.change(screen.getByRole("textbox"), { target: { value: word } });
    expect(screen.getByRole("alert").textContent).toContain("Retirez ces coordonnées");
    const send = screen.getByRole("button", { name: "Valider" }) as HTMLButtonElement;
    expect(send.disabled).toBe(true);
    fireEvent.click(send);
    expect(onYes).not.toHaveBeenCalled();
  });
});

describe("troisième issue", () => {
  it("« Le coup de main a été annulé » appelle onCancelled", () => {
    const { onCancelled, onNo, onYes } = renderAnswer();
    fireEvent.click(screen.getByRole("button", { name: MEETUP_LABELS.cancelled }));
    expect(onCancelled).toHaveBeenCalledTimes(1);
    expect(onNo).not.toHaveBeenCalled();
    expect(onYes).not.toHaveBeenCalled();
  });

  it("propose Signaler, par la connexion quand la personne est déconnectée", () => {
    renderAnswer();
    const link = screen.getByRole("link", { name: "Signaler" });
    expect(link.getAttribute("href")).toBe(`/login?redirect=${encodeURIComponent("/entraide/je-peux?a=rencontre&t=abc")}`);
  });

  it("ouvre la modale existante pour un membre connecté", () => {
    auth.user = { id: "u1" };
    renderAnswer();
    expect(screen.getByTestId("meetup-report").querySelector("button[title='Signaler cette petite mission']")).toBeTruthy();
  });

  it("reste à deux issues quand onCancelled est absent", () => {
    renderAnswer({ onCancelled: undefined });
    expect(screen.queryByRole("button", { name: MEETUP_LABELS.cancelled })).toBeNull();
  });
});

describe("textes", () => {
  it("affirmatifs, sans tiret long", () => {
    for (const text of [...Object.values(MEETUP_LABELS), publicConsentHint("Hugo")]) {
      expect(text).not.toMatch(/[\u2013\u2014]/);
      expect(text).not.toMatch(/\b(ne|pas|jamais)\b|n'/i);
    }
  });
});
