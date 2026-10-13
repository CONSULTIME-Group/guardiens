/**
 * Lot X3c, D-10 : la recherche admin d'un compte par adresse trouve tout
 * compte (ilike exact, toutes les pages de auth.users).
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  AUTH_PAGE_SIZE,
  escapeIlike,
  findAccountByEmail,
} from "../../../supabase/functions/_shared/admin-account-lookup.ts";

const root = join(__dirname, "..", "..", "..");

type Users = Array<{ id: string; email: string | null }>;

function fakeClient(opts: { profiles?: unknown[]; profilesError?: unknown; pages?: Users[]; authError?: unknown }) {
  const ilikes: unknown[] = [];
  const pagesAsked: number[] = [];
  return {
    ilikes,
    pagesAsked,
    from() {
      const b: any = {
        select: () => b,
        ilike: (_c: string, v: unknown) => { ilikes.push(v); return b; },
        limit: () => Promise.resolve({ data: opts.profiles ?? [], error: opts.profilesError ?? null }),
      };
      return b;
    },
    auth: {
      admin: {
        listUsers: ({ page }: { page: number }) => {
          pagesAsked.push(page);
          if (opts.authError) return Promise.resolve({ data: null, error: opts.authError });
          return Promise.resolve({ data: { users: opts.pages?.[page - 1] ?? [] }, error: null });
        },
      },
    },
  };
}

const fullPage = (prefix: string): Users =>
  Array.from({ length: AUTH_PAGE_SIZE }, (_, i) => ({ id: `${prefix}${i}`, email: `${prefix}${i}@ex.fr` }));

describe("findAccountByEmail", () => {
  it("échappe les jokers de ilike", () => {
    expect(escapeIlike("a_b%c\\d")).toBe("a\\_b\\%c\\\\d");
  });

  it("garde la ligne exacte parmi plusieurs profils proches", async () => {
    const client = fakeClient({
      profiles: [
        { id: "x", email: "jeanXpaul@ex.fr", first_name: "X", last_name: null },
        { id: "y", email: "Jean_Paul@Ex.fr", first_name: "Y", last_name: null },
      ],
    });
    const r = await findAccountByEmail(client, " JEAN_PAUL@ex.fr ");
    expect(client.ilikes[0]).toBe("jean\\_paul@ex.fr");
    expect(r.userId).toBe("y");
    expect(r.source).toBe("profiles");
    expect(client.pagesAsked).toEqual([]);
  });

  it("parcourt toutes les pages de auth.users, au delà des 200 premiers comptes", async () => {
    const client = fakeClient({
      pages: [fullPage("a"), [{ id: "cible", email: "Cible@Ex.fr" }]],
    });
    const r = await findAccountByEmail(client, "cible@ex.fr");
    expect(client.pagesAsked).toEqual([1, 2]);
    expect(r.userId).toBe("cible");
    expect(r.source).toBe("auth");
  });

  it("s'arrête à la dernière page et répond « aucun compte » sans erreur", async () => {
    const client = fakeClient({ pages: [fullPage("a"), [{ id: "b", email: "b@ex.fr" }]] });
    const r = await findAccountByEmail(client, "absent@ex.fr");
    expect(client.pagesAsked).toEqual([1, 2]);
    expect(r.userId).toBeNull();
    expect(r.error).toBeNull();
  });

  it("une lecture en échec est rendue comme erreur, jamais comme « aucun compte »", async () => {
    const r1 = await findAccountByEmail(fakeClient({ profilesError: { message: "panne" } }), "a@ex.fr");
    expect(r1.error).toBe("panne");
    const r2 = await findAccountByEmail(fakeClient({ authError: { message: "auth" } }), "a@ex.fr");
    expect(r2.error).toBe("auth");
  });
});

describe("admin-delete-account", () => {
  const src = readFileSync(join(root, "supabase/functions/admin-delete-account/index.ts"), "utf8");
  it("passe par findAccountByEmail et s'arrête sur une lecture en échec", () => {
    expect(src).toContain('from "../_shared/admin-account-lookup.ts"');
    expect(src).toContain("findAccountByEmail(adminClient, rawEmail)");
    expect(src).toMatch(/if \(found\.error\)[\s\S]{0,200}503\)/);
    expect(src).not.toContain("perPage: 200");
    expect(src).not.toContain('.ilike("email", rawEmail)');
  });
});
