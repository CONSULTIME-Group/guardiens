import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

/**
 * Lot ALMA2 (arène « Alma vivante » du 10/11/2026, lot L2, décisions validées
 * par Jérémie) : écrire avec Alma aux quatre moments (annonce, candidature,
 * besoin, réponse du propriétaire à une candidature), mesure commune
 * alma_cowrite_*, bulle « premier message » montée après lecture du fil.
 */

const events: Array<{ type: string; metadata: Record<string, unknown> }> = [];
vi.mock("@/lib/analytics", () => ({
  trackEvent: (type: string, opts: { metadata?: Record<string, unknown> } = {}) => {
    events.push({ type, metadata: opts.metadata ?? {} });
    return Promise.resolve();
  },
}));

import { cowriteEdited, cowriteEventName, COWRITE_MOMENTS, trackCowrite } from "@/lib/alma/cowrite";
import { shouldOfferApplicationReply } from "@/lib/alma/applicationReply";
import { readMissionDraft } from "@/lib/alma/missionDraft";
import AlmaCoWrite from "@/components/ai/alma/AlmaCoWrite";
import { isRefusedMissionDraft } from "../../../supabase/functions/draft-mission-from-prompt/guard.ts";

const read = (p: string) => readFileSync(p, "utf8");

beforeEach(() => {
  events.length = 0;
});

describe("mesure commune", () => {
  it("trois événements, cinq moments", () => {
    expect(cowriteEventName("shown")).toBe("alma_cowrite_shown");
    expect(cowriteEventName("used")).toBe("alma_cowrite_used");
    expect(cowriteEventName("sent")).toBe("alma_cowrite_sent");
    expect([...COWRITE_MOMENTS]).toEqual(["annonce", "candidature", "besoin", "reponse_candidature", "premier_message"]);
    const analytics = read("src/lib/analytics.ts");
    for (const e of ["alma_cowrite_shown", "alma_cowrite_used", "alma_cowrite_sent"]) expect(analytics).toContain(`"${e}"`);
  });

  it("le moment part dans les métadonnées", () => {
    trackCowrite("sent", "besoin", { edited: true });
    expect(events).toEqual([{ type: "alma_cowrite_sent", metadata: { moment: "besoin", edited: true } }]);
  });

  it("retouche : espaces ignorés, mot changé compté", () => {
    expect(cowriteEdited("Bonjour  Anne,\nmerci", "Bonjour Anne, merci")).toBe(false);
    expect(cowriteEdited("Bonjour Anne", "Bonjour Anne, à bientôt")).toBe(true);
    expect(cowriteEdited(null, "")).toBe(false);
  });
});

describe("réponse du propriétaire à une candidature", () => {
  const base = {
    loaded: true,
    isOwner: true,
    sitId: "s1",
    applicationStatus: "pending",
    myMessages: 0,
    theirMessages: 1,
  };

  it("proposée sur une candidature ouverte, avant le premier mot du propriétaire", () => {
    expect(shouldOfferApplicationReply(base)).toBe(true);
    expect(shouldOfferApplicationReply({ ...base, applicationStatus: "viewed" })).toBe(true);
    expect(shouldOfferApplicationReply({ ...base, applicationStatus: "discussing" })).toBe(true);
  });

  it("retirée ailleurs", () => {
    expect(shouldOfferApplicationReply({ ...base, loaded: false })).toBe(false);
    expect(shouldOfferApplicationReply({ ...base, isOwner: false })).toBe(false);
    expect(shouldOfferApplicationReply({ ...base, sitId: null })).toBe(false);
    expect(shouldOfferApplicationReply({ ...base, applicationStatus: "accepted" })).toBe(false);
    expect(shouldOfferApplicationReply({ ...base, applicationStatus: "rejected" })).toBe(false);
    expect(shouldOfferApplicationReply({ ...base, applicationStatus: null })).toBe(false);
    expect(shouldOfferApplicationReply({ ...base, myMessages: 1 })).toBe(false);
    expect(shouldOfferApplicationReply({ ...base, theirMessages: 0 })).toBe(false);
  });

  it("la fonction serveur réserve la réponse à l'auteur de l'annonce et lit le mot du candidat", () => {
    const fn = read("supabase/functions/draft-conversation-opener/index.ts");
    expect(fn).toContain('ctx.mode === "reply_application"');
    expect(fn).toContain("!ctx.sit_id || posterId !== userId");
    expect(fn).toMatch(/from\("applications"\)\s*\.select\("message, status"\)/);
    expect(fn).toContain("Une rencontre en personne reste facultative");
  });

  it("la messagerie monte la bulle après lecture du fil et mesure l'envoi", () => {
    const page = read("src/pages/Messages.tsx");
    expect(page).toContain("setMessagesLoadedFor(convId)");
    expect(page).toContain("messagesLoadedFor === activeConv.id && messages.length === 0");
    expect(page).toContain('mode="reply_application"');
    expect(page).toContain('trackCowrite("sent", almaDraft.moment');
  });
});

describe("besoin écrit avec Alma", () => {
  it("lecture de la réponse serveur", () => {
    expect(readMissionDraft({ title: " Tailler la haie ", description: "J'ai besoin d'aide pour tailler la haie du jardin samedi matin.", warnings: ["x", 3] }, null)).toEqual({
      ok: true,
      title: "Tailler la haie",
      description: "J'ai besoin d'aide pour tailler la haie du jardin samedi matin.",
      warnings: ["x"],
    });
    expect(readMissionDraft({ available: false, message: "Plus tard." }, null)).toEqual({ ok: false, message: "Plus tard." });
    expect(readMissionDraft({ error: "Limite atteinte" }, new Error("429"))).toEqual({ ok: false, message: "Limite atteinte" });
    expect(readMissionDraft({ title: "", description: "" }, null).ok).toBe(false);
  });

  it("un brouillon court et correct passe le contrôle de refus (ALMA2c)", () => {
    const description = "Je cherche un coup de main pour tailler la haie de mon jardin. Je fournis le matériel, un café vous attend.";
    expect(isRefusedMissionDraft("Tailler la haie du jardin", description)).toBe(false);
    expect(isRefusedMissionDraft("Aide", description)).toBe(true);
    expect(isRefusedMissionDraft("Tailler la haie", "Je suis désolé, mais je ne peux pas rédiger ce besoin pour vous.")).toBe(true);
    const fn = read("supabase/functions/draft-mission-from-prompt/index.ts");
    expect(fn).toContain("isRefusedMissionDraft(title, description)");
    expect(fn).not.toMatch(/isLlmRefusal\(title\)/);
  });

  it("formulaire, fonction et configuration", () => {
    const form = read("src/pages/CreateSmallMission.tsx");
    expect(form).toContain('moment="besoin"');
    expect(form).toContain('trackCowrite("sent", "besoin"');
    const fn = read("supabase/functions/draft-mission-from-prompt/index.ts");
    expect(fn).toContain("RATE_LIMIT_PER_HOUR = 5");
    expect(fn).toContain("DECLARED_FACTS_RULE");
    expect(fn).toContain("Aucun montant");
    expect(read("supabase/config.toml")).toMatch(/\[functions\.draft-mission-from-prompt\]\s+verify_jwt = true/);
  });
});

describe("annonce et candidature mesurées", () => {
  it("les trois étapes sont posées", () => {
    const sit = read("src/pages/CreateSit.tsx");
    // Lot ANN1 : le premier écran de /sits/create porte l'affichage et l'usage.
    const welcome = read("src/components/sits/create/SitCreateWelcome.tsx");
    expect(sit).toContain("<SitCreateWelcome");
    expect(welcome).toContain('trackCowrite("shown", "annonce")');
    expect(welcome).toContain('trackCowrite("used", "annonce"');
    expect(sit).toContain('trackCowrite("sent", "annonce"');
    expect(read("src/components/dashboard/SitDraftFromPrompt.tsx")).toContain('trackCowrite("used", "annonce"');
    const modal = read("src/components/sits/ApplicationModal.tsx");
    expect(modal).toContain('trackCowrite("shown", "candidature"');
    expect(modal).toContain('trackCowrite("used", "candidature"');
    expect(modal).toContain('trackCowrite("sent", "candidature"');
  });
});

describe("encart « Écrire avec Alma »", () => {
  it("compté à l'affichage, actif à 10 signes, brouillon compté", async () => {
    const onDraft = vi.fn().mockResolvedValue(true);
    render(<AlmaCoWrite moment="besoin" intro="Dites-le simplement." placeholder="Ex" onDraft={onDraft} />);
    expect(events.filter((e) => e.type === "alma_cowrite_shown")).toHaveLength(1);
    expect(screen.getByText(/Compagne IA de Guardiens/)).toBeTruthy();
    const button = screen.getByRole("button", { name: "Écrire avec Alma" });
    expect((button as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(screen.getByLabelText("Votre besoin en une phrase"), { target: { value: "tailler la haie samedi" } });
    expect((button as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(button);
    await waitFor(() => expect(onDraft).toHaveBeenCalledWith("tailler la haie samedi"));
    await waitFor(() => expect(events.some((e) => e.type === "alma_cowrite_used" && e.metadata.moment === "besoin")).toBe(true));
    expect(screen.getByText(/C'est dans le formulaire/)).toBeTruthy();
  });

  it("un échec laisse la main au membre", async () => {
    const onDraft = vi.fn().mockResolvedValue(false);
    render(<AlmaCoWrite moment="besoin" intro="Dites-le." placeholder="Ex" onDraft={onDraft} />);
    fireEvent.change(screen.getByLabelText("Votre besoin en une phrase"), { target: { value: "un trajet vendredi soir" } });
    fireEvent.click(screen.getByRole("button", { name: "Écrire avec Alma" }));
    await waitFor(() => expect(onDraft).toHaveBeenCalled());
    expect(events.some((e) => e.type === "alma_cowrite_used")).toBe(false);
    expect(screen.getByRole("button", { name: "Écrire avec Alma" })).toBeTruthy();
  });
});
