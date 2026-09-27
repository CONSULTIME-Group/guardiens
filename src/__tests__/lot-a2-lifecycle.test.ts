import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  MIN_SUB_DESCRIPTION,
  MIN_SINGLE_DESCRIPTION,
  getTwoFieldsDescriptionBlockers,
  joinExpectations,
} from "@/lib/sitPublishRules";
import { MIN_SUB_DESCRIPTION as EDGE_MIN } from "../../supabase/functions/_shared/sit-draft-missing";
import {
  publishedSitExpiryReason,
  expiryCandidatesOrClause,
  sitExpiredNotificationBody,
} from "../../supabase/functions/_shared/sit-expiry";
import { appendSuggestion, EXPECTATION_SUGGESTIONS } from "@/components/sits/create/ExpectationSuggestions";

const read = (p: string) => readFileSync(p, "utf8");
/** Contrainte base sits_publiee_exige_description : length(specific_expectations) >= 30. */
const DB_MIN = 30;

describe("A. seuil de description à 15 caractères par champ", () => {
  const f15 = "Présence douce!"; // 15
  const f14 = "Présence douce"; // 14
  it("constantes alignées client et edge, bloc unique inchangé", () => {
    expect(MIN_SUB_DESCRIPTION).toBe(15);
    expect(EDGE_MIN).toBe(15);
    expect(MIN_SINGLE_DESCRIPTION).toBe(30);
  });
  it("deux champs de 15 caractères publiables", () => {
    expect(f15.length).toBe(15);
    expect(getTwoFieldsDescriptionBlockers(f15, f15)).toEqual([]);
  });
  it("14 caractères refusé", () => {
    const b = getTwoFieldsDescriptionBlockers(f15, f14);
    expect(b.map((x) => x.id)).toEqual(["desc-expectations"]);
    expect(b[0].label).toContain("15 caractères minimum, actuellement 14");
  });
  it("le texte joint passe la contrainte base", () => {
    expect(joinExpectations(f15, f15).length).toBeGreaterThanOrEqual(DB_MIN);
    expect(joinExpectations(f15, f15).length).toBe(32);
  });
  it("aucun « 30 » ou « trente » codé en dur dans les libellés de seuil", () => {
    for (const p of [
      "src/pages/CreateSit.tsx",
      "src/pages/EditSit.tsx",
      "src/components/sits/owner/DraftChecklist.tsx",
      "src/components/sits/views/OwnerSitView.tsx",
      "src/hooks/useAccessLevel.ts",
      "supabase/functions/_shared/sit-draft-missing.ts",
      "supabase/functions/send-sit-draft-reminder/index.ts",
    ]) {
      expect(read(p), p).not.toMatch(/(30|trente) caractères/);
    }
  });
});

describe("A. suggestions d'attentes", () => {
  it("les trois phrases demandées", () => {
    expect([...EXPECTATION_SUGGESTIONS]).toEqual([
      "Nourrir et câliner les animaux matin et soir",
      "Arroser les plantes et relever le courrier",
      "Une présence rassurante dans la maison",
    ]);
  });
  it("ajoute à la suite, sans écraser", () => {
    expect(appendSuggestion("", "Arroser les plantes et relever le courrier")).toBe("Arroser les plantes et relever le courrier.");
    expect(appendSuggestion("Présence rassurante", "Arroser les plantes")).toBe("Présence rassurante. Arroser les plantes.");
    expect(appendSuggestion("Présence rassurante.", "Arroser les plantes")).toBe("Présence rassurante. Arroser les plantes.");
    expect(appendSuggestion("Arroser les plantes.", "Arroser les plantes")).toBe("Arroser les plantes.");
  });
  it("branchées sous le champ attentes de CreateSit", () => {
    expect(read("src/pages/CreateSit.tsx")).toMatch(/<ExpectationSuggestions\s+value=\{sitterExpectations\}/);
  });
});

describe("B. expiration des gardes longues", () => {
  const today = "2026-09-27";
  it("garde longue commencée, plus de 7 jours restants : reste publiée", () => {
    expect(publishedSitExpiryReason("2026-09-10", "2026-10-20", today)).toBeNull();
    expect(publishedSitExpiryReason("2026-09-10", "2026-10-05", today)).toBeNull(); // J+8
  });
  it("7 jours ou moins restants et début dépassé de plus de 2 jours : expire", () => {
    expect(publishedSitExpiryReason("2026-09-10", "2026-10-04", today)).toBe("little_time_left"); // J+7
    expect(publishedSitExpiryReason("2026-09-24", "2026-09-30", today)).toBe("little_time_left");
  });
  it("début dans la marge de 2 jours : reste publiée", () => {
    expect(publishedSitExpiryReason("2026-09-25", "2026-09-30", today)).toBeNull();
  });
  it("fin passée : expire toujours", () => {
    expect(publishedSitExpiryReason("2026-09-25", "2026-09-26", today)).toBe("end_passed");
  });
  it("garde future : reste publiée", () => {
    expect(publishedSitExpiryReason("2026-10-10", "2026-10-12", today)).toBeNull();
  });
  it("clause SQL miroir", () => {
    expect(expiryCandidatesOrClause(today)).toBe(
      "end_date.lt.2026-09-27,and(start_date.lt.2026-09-25,end_date.lte.2026-10-04),and(start_date.lt.2026-09-25,end_date.is.null)",
    );
  });
  it("notification juste dans les deux cas, sans tiret long", () => {
    const a = sitExpiredNotificationBody("Garde", "end_passed");
    const b = sitExpiredNotificationBody("Garde", "little_time_left");
    expect(a).toContain("sont passées");
    expect(b).toContain("moins d'une semaine");
    expect(a + b).not.toMatch(/[\u2013\u2014]/);
  });
  it("le cron applique la règle partagée, plus l'ancien seuil seul", () => {
    const src = read("supabase/functions/auto-transition-sits/index.ts");
    expect(src).toContain(".or(expiryCandidatesOrClause(today))");
    expect(src).toContain("publishedSitExpiryReason(sit.start_date, sit.end_date, today)");
    expect(src).not.toContain(".lt(\"start_date\", twoDaysBefore)");
  });
});

describe("C. relance de brouillon : anti-doublon par annonce", () => {
  const src = read("supabase/functions/send-sit-draft-reminder/index.ts");
  it("dédoublonne par sit_id, plus par destinataire seul", () => {
    expect(src).toContain("metadata->>sit_id.eq.${draft.id}");
    expect(src).toContain("logMetadata: { sit_id: draft.id");
  });
  it("garde un plafond d'une relance par personne et par jour", () => {
    expect(src).toMatch(/\.eq\("recipient_email", profile\.email\)\s*\.gte\("created_at", startOfUtcDay\)/);
    expect(src).toContain("sentToday.has(emailKey)");
  });
});

describe("D. /sits/:param côté gardien : uuid résolu avant toute requête", () => {
  it("SitDetail : requêtes par sit_id sur l'uuid résolu, jamais sur le paramètre", () => {
    const src = read("src/pages/SitDetail.tsx");
    expect(src).toContain('supabase.rpc("get_public_sit", { p_param: id })');
    expect(src).toContain("const sitId = (sitData as any).id as string;");
    expect(src).not.toMatch(/sit_id["']?,\s*id\b|p_sit_id:\s*id\b/);
  });
  it("PublicSitDetail : l'id local est l'uuid de la ligne résolue", () => {
    const src = read("src/pages/PublicSitDetail.tsx");
    expect(src).toContain("const id = sitData.id;");
    expect(src).not.toMatch(/sit_id["']?,\s*(param|rawParam)\b/);
  });
});
