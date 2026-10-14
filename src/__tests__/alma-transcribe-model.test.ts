import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Garde-fou : la dictée d'Alma passe par des modèles de transcription OpenAI
 * servis par le gateway Lovable. Tout identifiant google/ doit rester absent
 * de cette fonction. Depuis le 14/10/2026 : principal openai/gpt-transcribe,
 * repli openai/gpt-4o-transcribe jusqu'à sa retraite du 26/02/2027.
 */
const source = readFileSync(
  resolve(process.cwd(), "supabase/functions/alma-transcribe/index.ts"),
  "utf8",
);

describe("alma-transcribe, modèles de transcription", () => {
  it("ne référence aucun identifiant google/", () => {
    expect(source).not.toMatch(/google\//);
  });

  it("utilise les identifiants OpenAI attendus", () => {
    expect(source).toContain('const PRIMARY_MODEL = "openai/gpt-transcribe"');
    expect(source).toContain('const FALLBACK_MODEL = "openai/gpt-4o-transcribe"');
  });
});
