/**
 * Lot X3c : mécanique du code (audit E du 13/10/2026).
 * E-04 : « Proposer mon aide » des articles mène aux savoir-faire du profil.
 * E-05 : les avis de la section « Gardien d'urgence » viennent de reviews.
 * E-06 : chaque bouton « Relancer » des signaux vise une fonction présente.
 * E-07 : notify-mission-event lit first_name seul.
 */
import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { rewriteMemberHref } from "@/components/articles/ArticleRenderer";
import { SIGNAL_RELAUNCH_FN } from "@/components/admin/signals/signalGrouping";

const root = join(__dirname, "..", "..", "..");
const read = (p: string) => readFileSync(join(root, p), "utf8");

describe("E-04 · Proposer mon aide depuis un article", () => {
  const SRC = read("src/components/articles/ArticleRenderer.tsx");

  it("n'emploie plus le paramètre type=offre, que personne ne lit", () => {
    expect(SRC).not.toContain("type=offre");
    expect(read("src/components/missions/ExchangeHowItWorks.tsx")).not.toContain("type=offre");
    expect(read("src/components/missions/ExchangePactBanner.tsx")).not.toContain("type=offre");
  });

  it("chaque « Proposer mon aide » vise /profile?section=savoir-faire (lot E1)", () => {
    const targets = [...SRC.matchAll(/"?label"?:\s*"Proposer mon aide",\s*"?href"?:\s*"([^"]+)"/g)].map((m) => m[1]);
    // Le nombre de blocs évolue avec les refontes ; leur destination reste vérifiée.
    expect(targets.length).toBeGreaterThan(0);
    expect(new Set(targets)).toEqual(new Set(["/profile?section=savoir-faire"]));
  });

  it("un visiteur passe par l'inscription, qui le renvoie vers ses savoir-faire", () => {
    expect(rewriteMemberHref("/profile?section=savoir-faire")).toBe(
      "/inscription?redirect=%2Fprofile%3Fsection%3Dsavoir-faire",
    );
  });

  it("le texte de fin parle de la demande, l'aide se dit sur le profil", () => {
    expect(SRC).not.toContain("votre demande ou votre offre");
    expect(SRC).toContain("Pour aider, dites sur votre profil ce que vous savez faire.");
  });
});

describe("E-05 · avis reçus dans la section Gardien d'urgence", () => {
  const SRC = read("src/pages/Settings.tsx");
  it("lit reviews (reviewee_id, publiés) au lieu de sitter_reviews", () => {
    expect(SRC).not.toContain("sitter_reviews");
    expect(SRC).toMatch(/\.from\("reviews"\)[\s\S]{0,120}\.eq\("reviewee_id", user\.id\)[\s\S]{0,40}\.eq\("published", true\)/);
  });
});

describe("E-06 · relances admin des signaux", () => {
  it("le signal dormant_top_sitter n'a plus de bouton Relancer", () => {
    expect(SIGNAL_RELAUNCH_FN.dormant_top_sitter).toBeUndefined();
  });

  it("chaque fonction de relance existe dans supabase/functions", () => {
    for (const fn of Object.values(SIGNAL_RELAUNCH_FN)) {
      expect(existsSync(join(root, "supabase/functions", fn, "index.ts")), fn).toBe(true);
    }
  });
});

describe("E-07 · prénom de l'acteur dans notify-mission-event", () => {
  const SRC = read("supabase/functions/notify-mission-event/index.ts");
  it("ne lit plus display_name, colonne absente de profiles", () => {
    expect(SRC).not.toContain("display_name");
    expect(SRC).toContain(".select('first_name')");
  });
});
