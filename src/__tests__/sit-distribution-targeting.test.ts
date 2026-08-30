import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "fs";
import {
  completionMessageFor,
  remainingCompletionSteps,
} from "../../supabase/functions/_shared/completion-steps/index.ts";

const MIGRATIONS_DIR = "supabase/migrations";

const latestTriggerMigration = (): string => {
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  const matching = files.filter((f) =>
    readFileSync(`${MIGRATIONS_DIR}/${f}`, "utf8").includes(
      "FUNCTION public.notify_sitters_on_new_sit",
    ),
  );
  return readFileSync(`${MIGRATIONS_DIR}/${matching[matching.length - 1]}`, "utf8");
};

describe("diffusion des annonces, ciblage par proximité", () => {
  const sql = latestTriggerMigration();

  it("écrit la distance calculée dans la file", () => {
    expect(sql).toContain("INSERT INTO public.sitter_digest_queue (sitter_id, sit_id, distance_km)");
    expect(sql).toContain("VALUES (sitter.user_id, NEW.id, sitter.distance_km)");
  });

  it("plafonne le classement à 100 destinataires", () => {
    expect(sql).toContain("c_rank_cap constant integer := 100");
    expect(sql).toContain("r.alert_priority OR r.rn <= c_rank_cap");
  });

  it("ne donne la priorité hors plafond qu'aux alertes configurées à la main", () => {
    expect(sql).toContain("ap.source IS NULL");
    expect(sql).toMatch(/zone_type = 'france'/);
    expect(sql).toMatch(/zone_type = 'departement'/);
    expect(sql).toMatch(/zone_type = 'region'/);
    expect(sql).toMatch(/zone_type = 'rayon'/);
  });

  it("classe sur la proximité seule, jamais sur l'activité", () => {
    expect(sql).toContain("ORDER BY e.proximity_score DESC");
    expect(sql).not.toMatch(/ORDER BY[^;]*last_seen_at/);
  });

  it("sort les gardiens sans coordonnées de la diffusion", () => {
    expect(sql).toContain("AND pr.latitude IS NOT NULL");
    expect(sql).not.toContain("OR pr.latitude IS NULL");
  });

  it("conserve le signal d'annonce sans portée", () => {
    expect(sql).toContain("sit_published_zero_reach");
  });

  it("n'utilise aucun tiret cadratin ni demi cadratin", () => {
    expect(sql).not.toMatch(/[\u2014\u2013]/);
  });
});

describe("message de complétion, une étape ou plusieurs", () => {
  const base = {
    first_name: "Faïza",
    postal_code: "69003",
    country: "FR",
    bio: "x".repeat(60),
    competences: ["chien"],
    lifestyle: ["calme"],
    interests: ["a", "b", "c"],
    languages: ["fr"],
    life_pace: "calme",
    animal_types: ["chien"],
    gallery_count: 3,
  };

  it("promet le déblocage quand la photo est la seule étape restante", () => {
    const steps = remainingCompletionSteps({ ...base, avatar_url: null });
    expect(steps).toHaveLength(1);
    expect(steps[0].key).toBe("avatar");
    const message = completionMessageFor(40, steps);
    expect(message?.sentence).toBe(
      "Il vous reste une étape pour pouvoir candidater : une photo de vous.",
    );
  });

  it("ne promet jamais le déblocage quand plusieurs étapes restent", () => {
    const steps = remainingCompletionSteps({
      first_name: "Faïza",
      postal_code: "69003",
      country: "FR",
      gallery_count: 0,
    });
    expect(steps.length).toBeGreaterThan(1);
    const message = completionMessageFor(21, steps);
    expect(message?.stepCount).toBe(steps.length);
    expect(message?.sentence).toContain("Votre profil est rempli à 21 %.");
    expect(message?.sentence).toContain("étapes pour pouvoir candidater");
    expect(message?.sentence).not.toMatch(/Il vous reste une étape/);
    expect(message?.sentence).not.toMatch(/débloqu/i);
    expect(message?.sentence).not.toMatch(/[\u2014\u2013]/);
  });

  it("ne propose aucune étape au dessus du seuil", () => {
    expect(remainingCompletionSteps({ ...base, avatar_url: "https://x/y.jpg" })).toEqual([]);
    expect(completionMessageFor(80, [])).toBeNull();
  });
});
