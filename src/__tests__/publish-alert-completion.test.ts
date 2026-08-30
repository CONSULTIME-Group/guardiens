import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";

/**
 * Effet de bord du dedoublonnage du 30/08/2026 : l'annonce servie en immediat
 * ne repart plus dans le digest, donc l'alerte immediate doit desormais
 * porter l'incitation a completer le profil.
 */

const SRC = readFileSync("supabase/functions/notify-sitters-on-publish/index.ts", "utf8");
const TPL = readFileSync(
  "supabase/functions/_shared/transactional-email-templates/nearby-sit-alert.tsx",
  "utf8",
);

describe("alerte immediate, phrase de completion", () => {
  it("reutilise le module partage, sans dupliquer le bareme", () => {
    expect(SRC).toContain('from "../_shared/completion-steps/index.ts"');
    expect(SRC).toContain("remainingCompletionSteps({");
    expect(SRC).toContain("completionMessageFor(");
  });

  it("lit profile_completion dans le select de profils deja batche", () => {
    const line = SRC.split("\n").find((l) => l.includes('.select("id, first_name, email'));
    expect(line).toBeDefined();
    expect(line).toContain("profile_completion");
    expect(line).toContain("identity_verified");
    expect(line).toContain("avatar_url");
    expect(line).toContain("bio");
    expect(line).toContain("country");
  });

  it("ne declenche le calcul detaille que sous le seuil", () => {
    expect(SRC).toContain(
      "(sitterById.get(t.user_id)?.profile_completion ?? 0) < APPLY_COMPLETION_THRESHOLD",
    );
    expect(SRC).toContain("if (belowIds.length > 0) {");
  });

  it("groupe la lecture galerie sur user_id, sans count par personne", () => {
    const block = SRC.slice(SRC.indexOf('from("sitter_gallery")'));
    expect(block).toContain('.in("user_id", belowIds.slice(i, i + IN_BATCH_SIZE))');
    expect(SRC).not.toContain("count: 'exact', head: true");
    expect(SRC).not.toContain('count: "exact", head: true');
    expect(SRC).toContain("galleryCountByUser.set(g.user_id");
  });

  it("pagine explicitement la lecture sitter_gallery pour echapper au plafond PostgREST", () => {
    const block = SRC.slice(SRC.indexOf('from("sitter_gallery")'));
    expect(block).toContain(".range(from, from + GALLERY_PAGE_SIZE - 1)");
    expect(block).toContain("(grows ?? []).length < GALLERY_PAGE_SIZE");
    expect(SRC).toContain("const GALLERY_PAGE_SIZE = 1000");
  });

  it("evalue les alertes faites main avant les migrees, ordre deterministe", () => {
    const zonesBlock = SRC.slice(SRC.indexOf("const zones ="), SRC.indexOf("for (const sit of"));
    expect(zonesBlock).toContain(".sort(");
    expect(zonesBlock).toContain("a.source == null ? 0 : 1");
    expect(zonesBlock).toContain("localeCompare");
  });

  it("groupe aussi la lecture sitter_profiles", () => {
    expect(SRC).toContain('.from("sitter_profiles")');
    expect(SRC).toContain('.in("user_id", belowIds.slice(i, i + IN_BATCH_SIZE))');
  });

  it("aucune phrase plutot qu'une phrase fausse en cas d'erreur", () => {
    expect(SRC).toContain("[publish-alert] lecture sitter_profiles impossible");
    expect(SRC).toContain("[publish-alert] lecture sitter_gallery impossible");
    expect(SRC).toContain("readOk = false");
    expect(SRC).toContain("if (readOk) {");
  });

  it("passe les memes champs qu'au digest dans templateData", () => {
    expect(SRC).toContain("canApply:");
    expect(SRC).toContain("completionSentence:");
    expect(SRC).toContain("completionSteps:");
    expect(SRC).toContain("completionHref:");
  });
});

describe("gabarit nearby-sit-alert", () => {
  it("n'affiche aucun appel a candidater quand canApply est faux", () => {
    expect(TPL).toContain("canApply === false ? (");
    expect(TPL).toContain("buildProfileUrl(completionHref)");
    expect(TPL).toContain("Compléter mon profil");
    expect(TPL).toContain("Complétez votre profil pour candidater");
    const cta = TPL.slice(TPL.indexOf("canApply === false ? ("), TPL.indexOf("</Section>", TPL.indexOf("canApply === false ? (")));
    expect(cta).toContain("buildProfileUrl");
  });

  it("garde un acces a l'annonce sans en faire l'action principale", () => {
    expect(TPL).toContain("Voir l'annonce complète");
  });

  it("n'introduit ni emoji ni tiret cadratin", () => {
    expect(TPL).not.toMatch(/[\u2014\u2013]/);
  });
});
