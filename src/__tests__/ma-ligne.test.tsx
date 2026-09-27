import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  RATE_LIMIT_PER_IP, RATE_LIMIT_PER_TOKEN, SERVER_MONEY_RX,
  isRateLimited, isWellFormedToken, tokenState, validateHelpsWith,
} from "../../supabase/functions/_shared/ma-ligne-logic";
import { MONEY_RX } from "@/lib/missionContentGuards";

vi.mock("@/lib/analytics", () => ({ trackEvent: vi.fn() }));
vi.mock("@/components/ai/alma/AlmaAvatar", () => ({ default: () => null }));
import { trackEvent } from "@/lib/analytics";
import HelpsWithLineForm, {
  HELPS_WITH_AVAILABILITY_NOTE, HELPS_WITH_CONFIRMATION, HELPS_WITH_EXAMPLES, HELPS_WITH_HELP_TEXT, HELPS_WITH_MONEY_MESSAGE,
} from "@/components/entraide/HelpsWithLineForm";

const read = (p: string) => readFileSync(p, "utf8");
const now = new Date("2026-09-27T10:00:00Z");
const base = { profile_id: "u1", revoked_at: null, expires_at: "2026-10-20T00:00:00Z" };

describe("transparence et table dédiée", () => {
  it("annonce la disponibilité avant le clic, sans label redondant", () => {
    renderForm();
    expect(screen.getByText(HELPS_WITH_AVAILABILITY_NOTE)).toBeTruthy();
    expect(screen.queryByText("Ce que vous aimez faire")).toBeNull();
  });
  it("lit helps_line_tokens, jamais mission_action_tokens", () => {
    const src = read("supabase/functions/ma-ligne/index.ts") + read("supabase/functions/send-mass-email/index.ts");
    expect(src).toContain('from("helps_line_tokens")');
    expect(src).not.toMatch(/HELPS_WITH_TOKEN_ACTION/);
  });
});

describe("jeton de la ligne d'entraide", () => {
  it("valide, expiré, révoqué", () => {
    expect(tokenState(base, now)).toBe("valid");
    expect(tokenState({ ...base, expires_at: "2026-09-01T00:00:00Z" }, now)).toBe("expired");
    expect(tokenState({ ...base, revoked_at: "2026-09-20T00:00:00Z" }, now)).toBe("revoked");
  });
  it("refuse un jeton d'une autre portée ou absent", () => {
    expect(tokenState({ ...base, profile_id: null }, now)).toBe("invalid");
    expect(tokenState(null, now)).toBe("invalid");
    expect(isWellFormedToken("abc")).toBe(false);
    expect(isWellFormedToken("a".repeat(64))).toBe(true);
  });
  it("l'écriture cible le porteur du jeton, jamais un identifiant du client", () => {
    const src = read("supabase/functions/ma-ligne/index.ts");
    expect(src).toContain('userId = row!.profile_id');
    expect(src).not.toMatch(/body\?\.(user_id|userId|helper_id)/);
    expect(src).toContain('.update({ helps_with: check.value');
  });
  it("limite de débit par jeton et par IP", () => {
    expect(isRateLimited(RATE_LIMIT_PER_TOKEN, RATE_LIMIT_PER_TOKEN)).toBe(true);
    expect(isRateLimited(RATE_LIMIT_PER_TOKEN - 1, RATE_LIMIT_PER_TOKEN)).toBe(false);
    const src = read("supabase/functions/ma-ligne/index.ts");
    expect(src).toContain("ma-ligne:ip:");
    expect(src).toContain("ma-ligne:tok:");
    expect(RATE_LIMIT_PER_IP).toBeGreaterThan(RATE_LIMIT_PER_TOKEN);
  });
  it("garde-fou argent côté serveur, parité avec le client", () => {
    expect(SERVER_MONEY_RX.source).toBe(MONEY_RX.source);
    expect(validateHelpsWith("Tondre la pelouse pour 20 €")).toEqual({ ok: false, reason: "money" });
    expect(validateHelpsWith("  Cueillir   des pommes ")).toEqual({ ok: true, value: "Cueillir des pommes" });
    expect(validateHelpsWith("x".repeat(201))).toEqual({ ok: false, reason: "too_long" });
    expect(validateHelpsWith("")).toEqual({ ok: false, reason: "empty" });
  });
  it("route publique, noindex, hors sitemap", () => {
    expect(read("src/App.tsx")).toContain('path="/ma-ligne/:token"');
    expect(read("src/pages/MaLigne.tsx")).toContain("noindex");
    expect(read("scripts/generate-sitemap.mjs")).not.toContain("ma-ligne");
    expect(read("supabase/functions/sitemap/index.ts")).not.toContain("ma-ligne");
  });
  it("les deux emails portent le lien à jeton", () => {
    const mass = read("supabase/functions/send-mass-email/index.ts");
    expect(mass).toContain('"entraide-ligne-relance": "entraide_ligne_relance"');
    expect(mass).toContain("lineUrl:");
    expect(read("supabase/functions/_shared/transactional-email-templates/entraide-ligne-relance.tsx")).toContain("Rendre service fait du bien. À vous aussi.");
  });
});

const renderForm = (onSave = vi.fn().mockResolvedValue({ ok: true })) => {
  const qc = new QueryClient();
  const spy = vi.spyOn(qc, "invalidateQueries");
  render(
    <QueryClientProvider client={qc}><MemoryRouter>
      <HelpsWithLineForm firstName="Jérémie" onSave={onSave} source="token" />
    </MemoryRouter></QueryClientProvider>,
  );
  return { onSave, spy };
};

describe("écran à un seul champ", () => {
  beforeEach(() => vi.clearAllMocks());

  it("label réel, aide reliée, cibles 44 px", () => {
    renderForm();
    const field = screen.getByLabelText("Une chose que vous aimez faire pour les gens du coin ?");
    const helpId = screen.getByText(HELPS_WITH_HELP_TEXT).id;
    expect(field.getAttribute("aria-describedby")).toContain(helpId);
    expect(field).toHaveAttribute("maxLength", "200");
    expect(screen.getByText("Bonjour Jérémie. Se rendre utile, c'est aussi se faire du bien : une ligne suffit pour commencer.")).toBeInTheDocument();
    for (const ex of HELPS_WITH_EXAMPLES) {
      expect(screen.getByRole("button", { name: `Écrire l'exemple : ${ex}` }).className).toContain("min-h-[44px]");
    }
    expect(screen.getAllByRole("button", { name: "Je l'enregistre" })).toHaveLength(1);
  });

  it("un exemple remplit le champ et garde le focus", () => {
    renderForm();
    fireEvent.click(screen.getByRole("button", { name: `Écrire l'exemple : ${HELPS_WITH_EXAMPLES[0]}` }));
    const field = screen.getByLabelText("Une chose que vous aimez faire pour les gens du coin ?") as HTMLTextAreaElement;
    expect(field.value).toBe(HELPS_WITH_EXAMPLES[0]);
    expect(document.activeElement).toBe(field);
    expect(trackEvent).toHaveBeenCalledWith("helps_line_example_clicked", expect.anything());
  });

  it("message argent à la sortie du champ, retiré à la frappe", () => {
    const { onSave } = renderForm();
    const field = screen.getByLabelText("Une chose que vous aimez faire pour les gens du coin ?");
    fireEvent.change(field, { target: { value: "Jardinage 15 euros" } });
    fireEvent.blur(field);
    expect(screen.getByText(HELPS_WITH_MONEY_MESSAGE)).toBeInTheDocument();
    expect(field).toHaveAttribute("aria-invalid", "true");
    fireEvent.change(field, { target: { value: "Jardinage" } });
    expect(screen.queryByText(HELPS_WITH_MONEY_MESSAGE)).toBeNull();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("enregistre une fois, confirme et rafraîchit Autour de vous", async () => {
    const { onSave, spy } = renderForm();
    fireEvent.change(screen.getByLabelText("Une chose que vous aimez faire pour les gens du coin ?"), { target: { value: "Monter un meuble" } });
    const btn = screen.getByRole("button", { name: "Je l'enregistre" });
    fireEvent.click(btn);
    fireEvent.click(btn);
    await waitFor(() => expect(screen.getByText(HELPS_WITH_CONFIRMATION)).toBeInTheDocument());
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith("Monter un meuble");
    expect(spy).toHaveBeenCalledWith({ queryKey: ["nearby-helpers"] });
    expect(screen.getByRole("link", { name: "Voir la page Entraide" })).toHaveAttribute("href", "/petites-missions");
    expect(screen.getByRole("button", { name: "Modifier ma ligne" })).toBeInTheDocument();
  });
});
