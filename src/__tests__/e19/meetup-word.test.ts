/**
 * Lot E19 : le mot laissé après un coup de main passe par moderate-content en
 * type « sit » avant enregistrement (_shared/meetup-word.ts, lu par
 * mission-quick-action). Un numéro, un email ou une adresse sont refusés sans
 * appel réseau.
 */
import { describe, expect, it, vi } from "vitest";
import {
  moderateMeetupWord,
  verdictFromModeration,
  wordModerationParam,
} from "../../../supabase/functions/_shared/meetup-word.ts";

const opts = (fetchImpl: typeof fetch) => ({
  supabaseUrl: "https://projet.supabase.co",
  serviceKey: "cle-service",
  actingUserId: "00000000-0000-0000-0000-0000000000b1",
  fetchImpl,
});

const reply = (body: unknown, status = 200) =>
  vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;

describe("refus sans appel réseau", () => {
  it.each([
    ["un numéro", "Appelez-moi au 06 12 34 56 78"],
    ["un email", "Écrivez à odile@exemple.fr"],
    ["une adresse", "Passez au 12 rue des Lilas"],
  ])("%s est refusé", async (_label, word) => {
    const fetchImpl = vi.fn() as unknown as typeof fetch;
    const verdict = await moderateMeetupWord(word, opts(fetchImpl));
    expect(verdict).toEqual({ verdict: "refused", rule: "contact_details" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe("moderate-content en type « sit »", () => {
  it("envoie le mot comme une page publique, adresse postale comprise, avec la clé de service", async () => {
    const fetchImpl = reply({ status: "ok", reasons: [] });
    const verdict = await moderateMeetupWord("Un après-midi très agréable, merci.", opts(fetchImpl));
    expect(verdict).toEqual({ verdict: "ok", rule: null });
    const [url, init] = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe("https://projet.supabase.co/functions/v1/moderate-content");
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({
      content_type: "sit",
      text: "Un après-midi très agréable, merci.",
      acting_user_id: "00000000-0000-0000-0000-0000000000b1",
      check_postal_address: true,
    });
    expect((init as RequestInit).headers).toMatchObject({ Authorization: "Bearer cle-service" });
  });

  it("refuse un mot retenu, règle comprise", async () => {
    const verdict = await moderateMeetupWord("Texte retenu par la modération", opts(reply({ status: "block", rule: "hate" })));
    expect(verdict).toEqual({ verdict: "refused", rule: "hate" });
  });

  it("garde un avertissement privé", async () => {
    const verdict = await moderateMeetupWord("Mon voisin préféré, merci", opts(reply({ status: "warning", reasons: ["voisin"] })));
    expect(verdict.verdict).toBe("warning");
  });

  it("retombe sur « unchecked » quand moderate-content est injoignable", async () => {
    const failing = vi.fn().mockRejectedValue(new Error("réseau")) as unknown as typeof fetch;
    expect((await moderateMeetupWord("Merci beaucoup pour tout", opts(failing))).verdict).toBe("unchecked");
    expect((await moderateMeetupWord("Merci beaucoup pour tout", opts(reply({ error: "x" }, 500)))).verdict).toBe("unchecked");
  });
});

describe("valeurs transmises à la base", () => {
  it("un mot refusé part sans verdict, les autres avec le leur", () => {
    expect(wordModerationParam("refused")).toBeNull();
    expect(wordModerationParam("ok")).toBe("ok");
    expect(wordModerationParam("unchecked")).toBe("unchecked");
    expect(verdictFromModeration(null)).toEqual({ verdict: "unchecked", rule: null });
  });
});
