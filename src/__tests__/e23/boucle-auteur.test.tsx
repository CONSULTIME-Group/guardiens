/**
 * Lot E23 « L'auteur revient sur sa fiche » (26/10/2026).
 * 1. Les emails d'entraide de l'auteur portent un lien profond vers la fiche ;
 *    sans lien profond, ?vous=auteur affiche le bandeau de connexion.
 * 2. Sur un besoin, l'auteur peut écrire à une personne avant de la choisir.
 */
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { readFileSync } from "node:fs";

vi.mock("@/integrations/supabase/client", () => {
  const chain: Record<string, unknown> = {};
  Object.assign(chain, {
    select: () => chain,
    eq: () => chain,
    maybeSingle: () => Promise.resolve({ data: null, error: null }),
  });
  return { supabase: { from: () => chain } };
});
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock("@/components/missions/MissionBadgesReceived", () => ({ default: () => null }));

import MissionResponseCard from "@/components/missions/MissionResponseCard";
import AuthorReturnBanner from "@/components/entraide/AuthorReturnBanner";
import { authorMissionUrl } from "../../../supabase/functions/_shared/mission-responders";

afterEach(cleanup);

const read = (p: string) => readFileSync(p, "utf8");
const ID = "a98e1787-737a-4d62-8880-d6c8b1c335b4";
const NEG = /\b(ne|pas|jamais|aucun|aucune|rien)\b|n'|n’/i;

describe("E23.1 : lien de l'auteur vers sa fiche", () => {
  it("préfère le lien profond", () => {
    expect(authorMissionUrl(ID, "https://guardiens.fr/acces?t=abc")).toBe("https://guardiens.fr/acces?t=abc");
  });
  it("sans lien profond, la fiche porte ?vous=auteur", () => {
    expect(authorMissionUrl(ID)).toBe(`https://guardiens.fr/petites-missions/${ID}?vous=auteur`);
    expect(authorMissionUrl(ID, "https://ailleurs.example/acces?t=abc")).toBe(`https://guardiens.fr/petites-missions/${ID}?vous=auteur`);
  });
  it("sans identifiant, la liste des besoins", () => {
    expect(authorMissionUrl(undefined)).toBe("https://guardiens.fr/petites-missions");
    expect(authorMissionUrl("../x")).toBe("https://guardiens.fr/petites-missions");
  });

  const sender = read("supabase/functions/send-transactional-email/index.ts");
  it("les trois emails d'entraide reçoivent un lien profond vers la fiche", () => {
    const list = sender.slice(sender.indexOf("const DEEP_LINK_TEMPLATES"), sender.indexOf("const MISSION_DEEP_LINK_TEMPLATES"));
    for (const n of ["mission-response-received", "mission-response-waiting", "mission-wave-status"]) {
      expect(list).toContain(`'${n}'`);
    }
    expect(sender).toContain("`/petites-missions/${missionId}`");
  });
  it("les boutons des gabarits utilisent le lien de l'auteur", () => {
    for (const f of ["mission-response-received", "mission-response-waiting", "mission-wave-status"]) {
      const tpl = read(`supabase/functions/_shared/transactional-email-templates/${f}.tsx`);
      expect(tpl).toContain("authorMissionUrl(missionId, deepLinkUrl)");
      expect(tpl).not.toMatch(/<Button[^>]*href=\{pageUrl\}/);
    }
  });
  it("migration 0106 inscrite au journal", () => {
    expect(read("drizzle/migrations/meta/_journal.json")).toContain('"tag": "0106_e23_lien_auteur_entraide"');
  });
});

describe("E23.1 : bandeau de l'auteur sans session", () => {
  const renderAt = (path: string) =>
    render(
      <MemoryRouter initialEntries={[path]}>
        <AuthorReturnBanner redirect={`/petites-missions/${ID}`} />
      </MemoryRouter>,
    );
  it("affiché avec ?vous=auteur, lien de connexion avec retour sur la fiche", () => {
    renderAt(`/petites-missions/${ID}?vous=auteur`);
    expect(screen.getByText("C'est votre besoin ?")).toBeTruthy();
    const link = screen.getByRole("link");
    expect(link.getAttribute("href")).toBe(`/login?redirect=${encodeURIComponent(`/petites-missions/${ID}`)}`);
  });
  it("absent sans le paramètre", () => {
    const { container } = renderAt(`/petites-missions/${ID}`);
    expect(container.querySelector("[data-author-return]")).toBeNull();
  });
  it("textes positifs", () => {
    for (const t of ["C'est votre besoin ?", "Connectez-vous pour lire les réponses et écrire à chaque personne.", "Me connecter", "Une question avant de choisir ? Écrivez-lui directement."]) {
      expect(t).not.toMatch(NEG);
      expect(t).not.toMatch(/[–—]/);
    }
  });
});

describe("E23.2 : écrire avant de choisir", () => {
  const response = { id: "r1", responder_id: "u1", message: "Quelle est votre crainte ?", status: "pending", created_at: "2026-10-21T09:19:00Z", helpful_count: 0, responder: { first_name: "Rachel" } };
  const renderCard = (isAuthor: boolean, onOpenMessages = vi.fn()) =>
    render(
      <MemoryRouter>
        <MissionResponseCard
          response={response as unknown as Parameters<typeof MissionResponseCard>[0]["response"]}
          isAuthor={isAuthor}
          currentUserId={isAuthor ? "owner" : "u1"}
          missionOwnerId="owner"
          processing={false}
          onSelect={vi.fn()}
          onDecline={vi.fn()}
          onOpenMessages={onOpenMessages}
        />
      </MemoryRouter>,
    );
  it("l'auteur voit « Écrire à Rachel » à côté de « Choisir Rachel »", () => {
    const open = vi.fn();
    renderCard(true, open);
    const btn = screen.getByRole("button", { name: "Écrire à Rachel" });
    expect(screen.getByRole("button", { name: "Choisir Rachel" })).toBeTruthy();
    fireEvent.click(btn);
    expect(open).toHaveBeenCalledTimes(1);
  });
  it("la personne qui a répondu ne le voit pas", () => {
    const { container } = renderCard(false);
    expect(container.querySelector("[data-write-before-choose]")).toBeNull();
  });
});
