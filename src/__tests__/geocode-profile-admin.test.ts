import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import ts from "typescript";

const source = readFileSync("supabase/functions/geocode-profile/index.ts", "utf8")
  .replace(/import \{ createClient \} from [^;]+;/, "");
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;

function harness({ admin = false, user = true, roleError = null, city = "", secret = "trigger-secret" } = {}) {
  let handler: (req: Request) => Promise<Response>;
  const profileRead = vi.fn().mockResolvedValue({ data: { city, postal_code: "", country: "FR" }, error: null });
  const update = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
  const rpc = vi.fn().mockResolvedValue({ data: admin, error: roleError });
  const client = {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: user ? { id: "caller" } : null }, error: null }) },
    rpc,
    from: vi.fn().mockReturnValue({
      select: () => ({ eq: () => ({ maybeSingle: profileRead }) }), update,
    }),
  };
  const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ features: [{ geometry: { coordinates: [2, 48] } }] }) });
  new Function("Deno", "createClient", "fetch", compiled)({
    env: { get: (key: string) => key === "GEOCODE_PROFILE_SECRET" ? secret : "test" },
    serve: (fn: typeof handler) => { handler = fn; },
  }, () => client, fetch);
  const run = (headers = {}) => handler(new Request("https://test.local", {
    method: "POST", headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({ user_id: "target" }),
  }));
  return { run, profileRead, update, rpc };
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
  it("returns a skipped result without writing when the city is missing", async () => {
    const h = harness({ admin: true });
    expect(await (await h.run({ Authorization: "Bearer admin" })).json()).toEqual({ skipped: "no city" });
    expect(h.update).not.toHaveBeenCalled();
  });
});
