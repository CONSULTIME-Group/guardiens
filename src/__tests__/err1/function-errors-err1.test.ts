/**
 * Lot ERR1 : codes d'erreur des fonctions lus dans le corps de la réponse,
 * modération bornée côté site et côté serveur, analyse photo sans promesse
 * rejetée sans suite.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const invoke = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { functions: { invoke: (...a: unknown[]) => invoke(...a) } },
}));

import { readFunctionErrorBody } from "@/lib/functionErrorBody";
import { moderateContent } from "@/lib/moderation";

const src = (p: string) => readFileSync(resolve(__dirname, "../../..", p), "utf8");

describe("readFunctionErrorBody", () => {
  it("lit code et statut dans la Response portée par l'erreur", async () => {
    const response = new Response(JSON.stringify({ code: "DAILY_QUOTA_REACHED", error: "Quota" }), { status: 429 });
    const body = await readFunctionErrorBody({ context: response });
    expect(body).toEqual({ status: 429, code: "DAILY_QUOTA_REACHED", error: "Quota" });
    // Lecture sur un clone : le corps d'origine reste lisible.
    expect(response.bodyUsed).toBe(false);
  });

  it("reste silencieux sans corps exploitable", async () => {
    expect(await readFunctionErrorBody(null)).toEqual({});
    expect(await readFunctionErrorBody({ context: new Response("pas du json", { status: 500 }) })).toEqual({ status: 500 });
  });
});

describe("moderateContent", () => {
  beforeEach(() => {
    invoke.mockReset();
  });

  it("laisse passer le texte quand la vérification dépasse le délai", async () => {
    invoke.mockReturnValue(new Promise(() => undefined));
    const verdict = await moderateContent("sit", "Un texte d'annonce suffisamment long pour l'IA.", 20);
    expect(verdict).toEqual({ status: "ok", reasons: [] });
  });

  it("rend le verdict quand la réponse arrive à temps", async () => {
    invoke.mockResolvedValue({ data: { status: "block", reasons: ["Numéro"], rule: "contact_details" }, error: null });
    const verdict = await moderateContent("sit", "texte", 1000);
    expect(verdict.status).toBe("block");
    expect(verdict.rule).toBe("contact_details");
  });
});

describe("sources serveur et écrans", () => {
  it("moderate-content borne l'appel IA et retombe sur les heuristiques", () => {
    const fn = src("supabase/functions/moderate-content/index.ts");
    expect(fn).toMatch(/signal: AbortSignal\.timeout\(MODERATION_AI_TIMEOUT_MS\)/);
    expect(fn).toMatch(/r\.code === "AI_TIMEOUT"/);
  });

  it("l'analyse des photos lit le code dans le corps et attrape toute erreur", () => {
    const ui = src("src/components/sits/owner/SitPhotoManager.tsx");
    expect(ui).toContain("readFunctionErrorBody(error)");
    expect(ui).toMatch(/\} catch \(e\) \{\s*\/\/ Lot ERR1/);
    expect(ui).not.toMatch(/\(error as any\)\.context;\s*const code = ctx\?\.code/);
    const lib = src("src/lib/pickSmartCover.ts");
    expect(lib).toContain("readFunctionErrorBody(error)");
  });
});
