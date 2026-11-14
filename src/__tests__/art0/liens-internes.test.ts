import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  articleLinkProblem,
  cleanArticleLinks,
  readArticleLinks,
  toSitePath,
} from "@/lib/admin/articleLinks";

describe("lot ART0, liens internes de l'éditeur d'articles", () => {
  it("lit le format en base et l'ancien format", () => {
    expect(readArticleLinks([{ text: "Guide", url: "/actualites/a" }, { anchor: "Ancien", slug: "b" }])).toEqual([
      { text: "Guide", url: "/actualites/a" },
      { text: "Ancien", url: "/actualites/b" },
    ]);
    expect(readArticleLinks(null)).toEqual([]);
  });

  it("ramène une adresse du site à son chemin et refuse l'extérieur", () => {
    expect(toSitePath("https://guardiens.fr/actualites/x")).toBe("/actualites/x");
    expect(toSitePath("https://www.guardiens.fr/sorties")).toBe("/sorties");
    expect(toSitePath("/annonces")).toBe("/annonces");
    expect(toSitePath("https://exemple.com/x")).toBeNull();
    expect(toSitePath("//exemple.com")).toBeNull();
    expect(toSitePath("actualites/x")).toBeNull();
  });

  it("signale une ligne incomplète, laisse passer une ligne vide", () => {
    expect(articleLinkProblem({ text: "", url: "" })).toBeNull();
    expect(articleLinkProblem({ text: "Guide", url: "" })).toMatch(/adresse/);
    expect(articleLinkProblem({ text: "", url: "/a" })).toMatch(/texte/);
    expect(articleLinkProblem({ text: "Guide", url: "https://ailleurs.fr" })).toMatch(/guardiens\.fr/);
  });

  it("enregistre des lignes propres, sans doublon", () => {
    expect(
      cleanArticleLinks([
        { text: " Guide ", url: "https://guardiens.fr/actualites/a" },
        { text: "Doublon", url: "/actualites/a" },
        { text: "", url: "" },
        { text: "Sorties", url: "/sorties" },
      ]),
    ).toEqual([
      { text: "Guide", url: "/actualites/a" },
      { text: "Sorties", url: "/sorties" },
    ]);
  });

  it("l'éditeur charge et enregistre la description de la photo et les liens", () => {
    const src = readFileSync(resolve(__dirname, "../../pages/ArticleEditor.tsx"), "utf8");
    expect(src).toContain("hero_image_alt: form.hero_image_alt.trim() || null");
    expect(src).toContain("internal_links: cleanArticleLinks(form.internal_links)");
    expect(src).toContain("readArticleLinks((data as any).internal_links)");
  });

  it("la migration 0156 lit la clé de service dans le coffre", () => {
    const sql = readFileSync(resolve(__dirname, "../../../drizzle/migrations/0156_art0_indexnow_cle_service.sql"), "utf8");
    expect(sql).toContain("vault.decrypted_secrets");
    expect(sql).toContain("supabase_service_role_key");
    expect(sql).not.toMatch(/eyJhbGci/);
    expect(sql).toMatch(/REVOKE ALL ON FUNCTION public\.trigger_indexnow_push\(text, text\) FROM PUBLIC, anon, authenticated/);
  });
});
