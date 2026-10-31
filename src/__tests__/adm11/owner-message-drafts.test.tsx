import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { ownerMessageDraft, departureWhen, mainSitType } from "@/lib/admin/ownerMessageDrafts";
import { validateAdminPersonalInput, SUBJECT_MAX, BODY_MAX } from "../../../supabase/functions/_shared/admin-personal-message";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: { invoke: vi.fn() },
    auth: { getUser: vi.fn(async () => ({ data: { user: null } })) },
    from: vi.fn(),
  },
}));

const NOW = Date.parse("2026-10-31T09:00:00Z");
const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const ctx = { ownerName: "Camille", city: "Marseille", startDate: "2026-10-31", applications: 10, now: NOW };

describe("ADM11 · gabarits « Écrire au propriétaire »", () => {
  it("choisit le sujet selon la priorité de la carte", () => {
    expect(mainSitType(["pending_application", "stalled_discussion"])).toBe("stalled_discussion");
    expect(mainSitType(["pending_application", "owner_sit_unconfirmed"])).toBe("owner_sit_unconfirmed");
    expect(mainSitType(["pending_application"])).toBe("pending_application");
    expect(ownerMessageDraft(["digest_queue_stalled"], ctx)).toBeNull();
  });

  it("résout les variables : prénom, ville, échéance, nombre de candidatures", () => {
    const d = ownerMessageDraft(["pending_application"], ctx)!;
    expect(d.subject).toBe("Votre garde à Marseille : 10 gardiens attendent une réponse");
    expect(d.body.startsWith("Bonjour Camille,")).toBe(true);
    expect(d.body).toContain("démarre aujourd'hui et 10 gardiens attendent une réponse de votre part");
    expect(d.body).toContain("aujourd'hui");
    expect(d.body.trimEnd().endsWith("Belle journée à vous,")).toBe(true);
    expect(d.body).not.toMatch(/[{}]/);
  });

  it("échéance lisible : aujourd'hui, demain, dans N jours, rien si passée ou inconnue", () => {
    expect(departureWhen("2026-10-31", NOW)).toBe("aujourd'hui");
    expect(departureWhen("2026-11-01", NOW)).toBe("demain");
    expect(departureWhen("2026-11-04", NOW)).toBe("dans 4 jours");
    expect(departureWhen("2026-10-20", NOW)).toBeNull();
    expect(departureWhen(null, NOW)).toBeNull();
  });

  it("sans prénom connu : salutation simple, sans variable laissée", () => {
    const d = ownerMessageDraft(["owner_sit_unconfirmed"], { ownerName: "le propriétaire", startDate: null, now: NOW })!;
    expect(d.body.startsWith("Bonjour,")).toBe(true);
    expect(d.body).not.toMatch(/undefined|null|\{/);
  });

  it("une seule candidature : accord au singulier", () => {
    const d = ownerMessageDraft(["pending_application"], { ...ctx, applications: 1 })!;
    expect(d.body).toContain("un gardien attend une réponse");
    expect(d.subject).toContain("1 gardien attend une réponse");
  });

  const CASES: Array<[string, string[]]> = [
    ["pending_application", ["pending_application"]],
    ["owner_sit_unconfirmed", ["owner_sit_unconfirmed", "pending_application"]],
    ["stalled_discussion", ["stalled_discussion"]],
  ];
  for (const [label, types] of CASES) {
    for (const start of ["2026-10-31", "2026-11-01", "2026-11-04", null]) {
      it(`${label} (départ ${start ?? "inconnu"}) : valide côté serveur, règles de contenu`, () => {
        const d = ownerMessageDraft(types, { ...ctx, startDate: start })!;
        expect(d.subject.length).toBeLessThanOrEqual(SUBJECT_MAX);
        expect(d.body.length).toBeLessThanOrEqual(BODY_MAX);
        expect(validateAdminPersonalInput({ mode: "preview", recipientUserId: uuid(2), subject: d.subject, body: d.body, sitId: uuid(1) }).ok).toBe(true);
        const all = `${d.subject}\n${d.body}`;
        expect(all).not.toMatch(/[—–]/);
        expect(all).not.toMatch(/Guardiens vous trouve|nous trouvons un gardien|je vous trouve/i);
        expect(all).not.toMatch(/L'équipe Guardiens/);
        expect(all).not.toMatch(/\b(pas|ne |aucun|jamais|sans)\b/i);
      });
    }
  }

  it("chaque texte propose la sortie : dépublier en prévenant les gardiens", () => {
    for (const [, types] of CASES) {
      const d = ownerMessageDraft(types, ctx)!;
      expect(d.body).toContain("Je vous écris pour savoir où vous en êtes");
      expect(d.body).toContain("dépubliez votre annonce en déclinant les candidatures");
      expect(d.body).toContain("prévenu par message et par email");
    }
  });

  it("la rencontre reste facultative quand elle est évoquée", () => {
    for (const [, types] of CASES) {
      const d = ownerMessageDraft(types, ctx)!;
      if (/rencontre|faire connaissance|visio/i.test(d.body)) expect(d.body).toMatch(/facultati/i);
    }
  });
});

describe("ADM11 · boîte d'écriture", () => {
  const wrap = (ui: React.ReactElement) =>
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter>{ui}</MemoryRouter>
      </QueryClientProvider>,
    );

  it("s'ouvre avec l'objet et le texte proposés, modifiables", async () => {
    const { WriteToMemberDialog } = await import("@/pages/admin/_components/users/WriteToMemberDialog");
    const draft = ownerMessageDraft(["pending_application"], ctx)!;
    wrap(<WriteToMemberDialog target={{ userId: uuid(2), userName: "Camille", sitId: uuid(1), draft }} onClose={() => {}} />);
    expect((screen.getByLabelText("Objet") as HTMLInputElement).value).toBe(draft.subject);
    expect((screen.getByLabelText(/^Texte/) as HTMLTextAreaElement).value).toBe(draft.body);
    expect((screen.getByRole("button", { name: "Aperçu" }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("sans gabarit, les champs restent vides comme avant", async () => {
    const { WriteToMemberDialog } = await import("@/pages/admin/_components/users/WriteToMemberDialog");
    wrap(<WriteToMemberDialog target={{ userId: uuid(2), userName: "Camille" }} onClose={() => {}} />);
    expect((screen.getByLabelText("Objet") as HTMLInputElement).value).toBe("");
    expect((screen.getByLabelText(/^Texte/) as HTMLTextAreaElement).value).toBe("");
  });
});
