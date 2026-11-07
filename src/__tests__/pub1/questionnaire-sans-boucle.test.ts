// Lot PUB1 : après le questionnaire, la porte relit le statut au lieu du cache
// de 5 minutes (52 personnes sur 193 renvoyées au questionnaire juste rempli,
// du 01/10 au 07/11/2026).
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { QueryClient } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

const reads: string[] = [];
let ownerRow: Record<string, unknown> | null = null;

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => {
            reads.push(table);
            return { data: table === "owner_profiles" ? ownerRow : { id: "u1" }, error: null };
          },
        }),
      }),
    }),
  },
}));

import { registerAppQueryClient } from "@/lib/appQueryClient";
import { fetchMyOwnerProfile, invalidateMyOnboardingStatus } from "@/lib/myProfile";

describe("statut du questionnaire relu après enregistrement", () => {
  beforeEach(() => {
    reads.length = 0;
    ownerRow = null;
    registerAppQueryClient(new QueryClient());
  });

  it("sans relecture, le cache garde le profil vide d'avant le questionnaire", async () => {
    await fetchMyOwnerProfile("u1");
    ownerRow = { presence_expected: "absent", preferred_sitter_types: ["retraite"] };
    const r = await fetchMyOwnerProfile("u1");
    expect(r.data).toBeNull();
  });

  it("après invalidateMyOnboardingStatus, la lecture suivante voit les réponses", async () => {
    await fetchMyOwnerProfile("u1");
    ownerRow = { presence_expected: "absent", preferred_sitter_types: ["retraite"] };
    await invalidateMyOnboardingStatus("u1");
    const r = await fetchMyOwnerProfile("u1");
    expect(r.data).toEqual(ownerRow);
    expect(reads.filter((t) => t === "owner_profiles")).toHaveLength(2);
  });

  it("chaque écran qui enregistre le questionnaire relit le statut avant de partir", () => {
    for (const f of [
      "src/pages/OnboardingAffinity.tsx",
      "src/pages/arrival/ArriveeAffinites.tsx",
      "src/pages/arrival/ArriveeGarder.tsx",
      "src/pages/arrival/ArriveeVousConnaitre.tsx",
      "src/pages/arrival/ArriveeVous.tsx",
      "src/pages/arrival/ArriveeVousGardien.tsx",
    ]) {
      const src = readFileSync(resolve(process.cwd(), f), "utf8");
      expect(src, f).toContain("await invalidateMyOnboardingStatus(user.id)");
    }
  });
});

describe("Décrire en une phrase reste sur le formulaire", () => {
  it("la bulle d'Alma n'envoie plus vers le tableau de bord", () => {
    const src = readFileSync(resolve(process.cwd(), "src/pages/CreateSit.tsx"), "utf8");
    expect(src).not.toContain('navigate("/dashboard?intent=draft_from_prompt")');
    expect(src).toContain("<SitDraftFromPrompt />");
  });

  it("le formulaire ne renvoie plus vers le profil pour gérer les photos", () => {
    const src = readFileSync(resolve(process.cwd(), "src/pages/CreateSit.tsx"), "utf8");
    expect(src).not.toContain('to="/owner-profile#galerie"');
  });
});
