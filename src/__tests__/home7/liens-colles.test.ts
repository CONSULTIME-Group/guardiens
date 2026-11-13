import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { stripGluedText } from "@/lib/sitSlugClean";

describe("HOME7 : texte collé à l'adresse d'une annonce", () => {
  it("retire le mot collé après l'identifiant court", () => {
    expect(stripGluedText("une-garde-de-2-chiens-et-1-chat-saint-vulbas-f5e13dPartagez"))
      .toBe("une-garde-de-2-chiens-et-1-chat-saint-vulbas-f5e13d");
    expect(stripGluedText("garde-vabres-l-abbaye-78bf59Élodie-vous-attend"))
      .toBe("garde-vabres-l-abbaye-78bf59");
  });

  it("laisse intactes une adresse propre et un identifiant long", () => {
    expect(stripGluedText("une-garde-saint-vulbas-f5e13d")).toBe("une-garde-saint-vulbas-f5e13d");
    expect(stripGluedText("3f2b8c1e-4a5d-4e6f-8a9b-0c1d2e3f4a5b")).toBe("3f2b8c1e-4a5d-4e6f-8a9b-0c1d2e3f4a5b");
    expect(stripGluedText("garde-a-lyon")).toBe("garde-a-lyon");
  });

  it("la fiche publique redirige avant toute lecture", () => {
    const src = readFileSync("src/pages/PublicSitDetail.tsx", "utf8");
    const i = src.indexOf("stripGluedText(param)");
    expect(i).toBeGreaterThan(0);
    expect(i).toBeLessThan(src.indexOf('supabase.rpc("get_public_sit"'));
  });
});
