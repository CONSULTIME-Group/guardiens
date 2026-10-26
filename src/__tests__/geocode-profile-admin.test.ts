import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import ts from "typescript";
import { geocodeOfficialFr } from "../../supabase/functions/_shared/geocode-official-fr";
import * as profileRules from "../../supabase/functions/_shared/profile-geocode-rules";

// Lot G1 : toutes les importations sont retirées et injectées ci-dessous
// (règles et source officielle réelles, journal des tâches simulé).
const source = readFileSync("supabase/functions/geocode-profile/index.ts", "utf8")
  .replace(/import\s[\s\S]*?\sfrom\s+"[^"]+";/g, "");
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;

function harness({ admin = false, user = true, roleError = null, city = "", country = "FR", postal = "", secret = "trigger-secret", fetchResponse = undefined as undefined | ((url: string) => Promise<any>) } = {}) {
  let handler: (req: Request) => Promise<Response>;
  const profileRead = vi.fn().mockResolvedValue({ data: { city, postal_code: postal, country }, error: null });
  const update = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
  const rpc = vi.fn().mockResolvedValue({ data: admin, error: roleError });
  const client = {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: user ? { id: "caller" } : null }, error: null }) },
    rpc,
    from: vi.fn().mockReturnValue({
      select: () => ({ eq: () => ({ maybeSingle: profileRead }) }), update,
    }),
  };
  const fetch = vi.fn(fetchResponse ?? (async () => ({ ok: true, json: async () => ({ features: [{ geometry: { coordinates: [2, 48] } }] }) })));
  const injected = {
    geocodeOfficialFr: (q: string, isPostal: boolean) => geocodeOfficialFr(q, isPostal, fetch as unknown as typeof globalThis.fetch),
    ...profileRules,
    startCronRun: async () => ({ id: null, finish: async () => {}, fail: async () => {} }),
  };
  new Function("Deno", "createClient", "fetch", "AbortSignal", ...Object.keys(injected), compiled)({
    env: { get: (key: string) => key === "GEOCODE_PROFILE_SECRET" ? secret : "test" },
    serve: (fn: typeof handler) => { handler = fn; },
  }, () => client, fetch, { timeout: () => new AbortController().signal }, ...Object.values(injected));
  const run = (headers = {}) => handler(new Request("https://test.local", {
    method: "POST", headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({ user_id: "target" }),
  }));
  return { run, profileRead, update, rpc, fetch };
}

describe("manual profile geocoding authorization", () => {
  it("rejects anonymous calls before reading profiles", async () => {
    const h = harness();
    expect((await h.run()).status).toBe(401);
    expect(h.profileRead).not.toHaveBeenCalled();
  });
  it("rejects non-admin members before reading profiles", async () => {
    const h = harness();
    expect((await h.run({ Authorization: "Bearer member" })).status).toBe(403);
    expect(h.profileRead).not.toHaveBeenCalled();
  });
  it("fails closed when the role lookup fails", async () => {
    const h = harness({ admin: true, roleError: { message: "unavailable" } });
    expect((await h.run({ Authorization: "Bearer admin" })).status).toBe(403);
    expect(h.update).not.toHaveBeenCalled();
  });
  it("rejects an invalid JWT", async () => {
    const h = harness({ user: false });
    expect((await h.run({ Authorization: "Bearer invalid" })).status).toBe(401);
    expect(h.profileRead).not.toHaveBeenCalled();
  });
  it("keeps the secret-authenticated automatic trigger working", async () => {
    const h = harness({ city: "Paris" });
    expect(await (await h.run({ "x-geocode-secret": "trigger-secret" })).json()).toMatchObject({ ok: true, lat: 48, lng: 2 });
    expect(h.rpc).not.toHaveBeenCalled();
    expect(h.update).toHaveBeenCalledWith({ latitude: 48, longitude: 2 });
  });
  it("allows an authenticated admin to recalculate coordinates", async () => {
    const h = harness({ admin: true, city: "Paris" });
    expect(await (await h.run({ Authorization: "Bearer admin" })).json()).toMatchObject({ ok: true });
    expect(h.rpc).toHaveBeenCalledWith("has_role", { _user_id: "caller", _role: "admin" });
    expect(h.update).toHaveBeenCalledWith({ latitude: 48, longitude: 2 });
  });
  it("lot G1 : sans ville, situe par le code postal français (commune la plus peuplée)", async () => {
    const h = harness({ postal: "69380", fetchResponse: async (url: string) => {
      expect(url).toContain("geo.api.gouv.fr/communes");
      expect(url).toContain("codePostal=69380");
      return { ok: true, json: async () => [
        { nom: "Petite", population: 300, centre: { coordinates: [4.6, 45.9] } },
        { nom: "Grande", population: 9000, centre: { coordinates: [4.7, 45.87] } },
      ] };
    } });
    expect(await (await h.run({ "x-geocode-secret": "trigger-secret" })).json())
      .toMatchObject({ ok: true, lat: 45.87, lng: 4.7, source: "communes_code_postal" });
    expect(h.update).toHaveBeenCalledWith({ latitude: 45.87, longitude: 4.7 });
  });
  it("returns a skipped result without writing when the city is missing", async () => {
    const h = harness({ admin: true });
    expect(await (await h.run({ Authorization: "Bearer admin" })).json()).toEqual({ skipped: "no city" });
    expect(h.update).not.toHaveBeenCalled();
  });
});

const response = (data: unknown) => ({ ok: true, json: async () => data });
const saintLudger = (overrides = {}, coordinates = [-70.69462, 45.74213]) => ({
  properties: { name: "Saint-Ludger", countrycode: "CA", postcode: "G0M 1W0", ...overrides },
  geometry: { coordinates },
});
const canada = { admin: true, city: "Saint Ludger", country: "CA", postal: "G0M1W0" };
const adminHeaders = { Authorization: "Bearer admin" };

describe("international geocoding fallback", () => {
  it("uses a matching Canadian city when Nominatim refuses the backend", async () => {
    const h = harness({ ...canada, fetchResponse: async (url) => url.includes("nominatim")
      ? { ok: false, status: 403 } : response({ features: [saintLudger()] }) });
    expect(await (await h.run(adminHeaders)).json()).toMatchObject({ ok: true, source: "photon" });
    expect(h.update).toHaveBeenCalledWith({ latitude: 45.74213, longitude: -70.69462 });
    expect(new URL(h.fetch.mock.calls[0][0]).searchParams.get("country")).toBe("Canada");
  });
  it("uses the fallback after a network failure", async () => {
    const h = harness({ ...canada, fetchResponse: async (url) => {
      if (url.includes("nominatim")) throw new Error("timeout");
      return response({ features: [saintLudger()] });
    } });
    expect(await (await h.run(adminHeaders)).json()).toMatchObject({ ok: true, source: "photon" });
  });
  it("keeps a successful Nominatim result without calling Photon", async () => {
    const h = harness({ ...canada, fetchResponse: async () => response([{ lat: "45.74213", lon: "-70.69462" }]) });
    expect(await (await h.run(adminHeaders)).json()).toMatchObject({ ok: true, source: "nominatim" });
    expect(h.fetch).toHaveBeenCalledTimes(1);
  });
  it.each([
    ["another country", { countrycode: "FR" }, [-70.69462, 45.74213]],
    ["another city", { name: "Saint-Léger" }, [-70.69462, 45.74213]],
    ["another postcode", { postcode: "OTHER" }, [-70.69462, 45.74213]],
    ["invalid coordinates", {}, [-70.69462, 145]],
  ])("does not write a fallback with %s", async (_reason, overrides, coordinates) => {
    const h = harness({ ...canada, fetchResponse: async (url) => url.includes("nominatim")
      ? response([]) : response({ features: [saintLudger(overrides, coordinates)] }) });
    expect(await (await h.run(adminHeaders)).json()).toMatchObject({ skipped: "no result" });
    expect(h.update).not.toHaveBeenCalled();
  });
  it("does not choose between homonyms without a matching postcode", async () => {
    const h = harness({ ...canada, fetchResponse: async (url) => url.includes("nominatim") ? response([])
      : response({ features: [saintLudger({ postcode: "OTHER" }), saintLudger({ postcode: "ELSEWHERE" })] }) });
    expect(await (await h.run(adminHeaders)).json()).toMatchObject({ skipped: "no result" });
    expect(h.update).not.toHaveBeenCalled();
  });
  it("uses the matching Canadian postcode to distinguish homonyms", async () => {
    const h = harness({ ...canada, fetchResponse: async (url) => url.includes("nominatim") ? response([])
      : response({ features: [saintLudger({ postcode: "OTHER" }, [-71, 46]), saintLudger()] }) });
    expect(await (await h.run(adminHeaders)).json()).toMatchObject({ ok: true, lat: 45.74213, lng: -70.69462 });
  });
  it("does not write when both providers are unavailable", async () => {
    const h = harness({ ...canada, fetchResponse: async () => ({ ok: false, status: 503 }) });
    expect(await (await h.run(adminHeaders)).json()).toMatchObject({ skipped: "no result" });
    expect(h.update).not.toHaveBeenCalled();
  });
});
