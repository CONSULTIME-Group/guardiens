/**
 * Verrou du lot SC4 (10/11/2026, arène claude/arene/2026-11-10-score-completion) :
 * relances vers la question des trajets, question « voiture nécessaire » au
 * propriétaire, cloche ciblée.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { missingOpportunityHref, pickMissingOpportunities } from "../../../supabase/functions/_shared/missing-opportunities/index.ts";

const TPL = readFileSync("supabase/functions/_shared/transactional-email-templates/nearby-sit-alert.tsx", "utf8");
import { shouldAskOwnerCar } from "@/components/sits/OwnerCarQuestion";

describe("lot SC4 : les relances mènent à la question", () => {
  it("véhicule et présence ouvrent le bloc « Pendant la garde », champ en avant", () => {
    expect(missingOpportunityHref("vehicle")).toBe("/profile?section=profil&focus=trips");
    expect(missingOpportunityHref("work")).toBe("/profile?section=profil&focus=presence");
    expect(missingOpportunityHref("species")).toBe("/profile?section=experience");
  });

  it("à compteur égal, les critères qui pèsent double passent avant le rayon", () => {
    const picked = pickMissingOpportunities({
      total_sits: 10,
      items: [
        { key: "radius", concerned: 5, answered: false },
        { key: "work", concerned: 5, answered: false },
        { key: "vehicle", concerned: 5, answered: false },
      ],
    });
    expect(picked.map((p) => p.key)).toEqual(["vehicle", "work"]);
  });

  it("le profil sait ouvrir trips et presence", () => {
    const page = readFileSync("src/pages/SitterProfile.tsx", "utf8");
    expect(page).toContain('focus === "trips" || focus === "presence"');
    const step = readFileSync("src/components/profile/StepSitterProfile.tsx", "utf8");
    expect(step).toContain('data-field="presence"');
    expect(readFileSync("src/components/profile/TripsQuestion.tsx", "utf8")).toContain('data-field="trips"');
  });
});

describe("lot SC4 : alerte de publication", () => {
  it("la question des trajets vient seulement à qui peut candidater, avec un lien qui ouvre le profil", () => {
    expect(TPL).toContain("tripsQuestionHref?: string");
    expect(TPL).toContain("{canApply !== false && tripsQuestionHref ? (");
    expect(TPL).toContain("Cette maison demande une voiture sur place.");
    expect(TPL).toContain("<Link href={buildProfileUrl(tripsQuestionHref)}");
  });

  it("la fonction lit car_required et n'écrit rien par un lien", () => {
    const fn = readFileSync("supabase/functions/notify-sitters-on-publish/index.ts", "utf8");
    expect(fn).toContain('.select("cover_photo_url, photos, car_required")');
    expect(fn).toContain("tripsQuestionHref: tripsAskIds.has(t.user_id) ? TRIPS_QUESTION_HREF : undefined");
    expect(fn).toContain('const TRIPS_QUESTION_HREF = "/profile?section=profil&focus=trips";');
  });
});

describe("lot SC4 : voiture nécessaire, côté propriétaire", () => {
  it("demandée une fois, après publication, tant que rien n'est répondu", () => {
    expect(shouldAskOwnerCar({ car_required: false, car_required_answered_at: null }, "published")).toBe(true);
    expect(shouldAskOwnerCar({ car_required: false, car_required_answered_at: "2026-11-10T10:00:00Z" }, "published")).toBe(false);
    expect(shouldAskOwnerCar({ car_required: true, car_required_answered_at: null }, "published")).toBe(false);
    expect(shouldAskOwnerCar({ car_required: false, car_required_answered_at: null }, "draft")).toBe(false);
  });

  it("tant que la migration 0132 manque, la question ne vient jamais", () => {
    expect(shouldAskOwnerCar({ car_required: false }, "published")).toBe(false);
  });

  it("le formulaire Logement pose deux réponses datées, sans interrupteur", () => {
    const housing = readFileSync("src/components/owner-profile/OwnerStepHousing.tsx", "utf8");
    expect(housing).toContain("CAR_OPTIONS");
    expect(housing).not.toMatch(/checked=\{data\.car_required\}/);
    const hook = readFileSync("src/hooks/useOwnerProfile.ts", "utf8");
    expect(hook).toContain('if ("car_required_answered_at" in stepData)');
  });

  it("la migration ajoute la colonne, nulle, sans toucher aux données", () => {
    const sql = readFileSync("drizzle/migrations/0132_sc4_voiture_repondue.sql", "utf8");
    expect(sql).toContain("ADD COLUMN IF NOT EXISTS car_required_answered_at timestamptz");
    expect(sql).not.toMatch(/\bUPDATE\b|\bDELETE\b/);
  });
});

describe("lot SC4 : cloche ciblée", () => {
  it("une fois, gardiens actifs sans réponse, lien vers la question", () => {
    const sql = readFileSync("scripts/sc4-cloche-trajets.sql", "utf8");
    expect(sql).toContain("s.has_vehicle IS NULL");
    expect(sql).toContain("last_seen_at > now() - interval '90 days'");
    expect(sql).toContain("NOT EXISTS");
    expect(sql).toContain("'Jérémie et Elisa'");
    expect(sql).not.toMatch(/[–—]/);
  });
});
