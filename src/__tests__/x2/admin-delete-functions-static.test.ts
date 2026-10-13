/**
 * Lot X2 : lecture statique des fonctions d'effacement admin.
 * D-02 : admin-delete-user passe par le circuit partagé, jamais par deleteUser.
 * D-03 : admin-delete-account sait enregistrer une demande (record) et la garde en 409.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(__dirname, "..", "..", "..");
const read = (p: string) => readFileSync(join(root, p), "utf8");

const DELETE_USER = read("supabase/functions/admin-delete-user/index.ts");
const DELETE_ACCOUNT = read("supabase/functions/admin-delete-account/index.ts");
const SHARED = read("supabase/functions/_shared/admin-erasure.ts");
const PURGE = read("supabase/functions/purge-deleted-accounts/index.ts");

describe("D-02 · admin-delete-user délègue au circuit partagé", () => {
  it("n'appelle plus auth.admin.deleteUser", () => {
    expect(DELETE_USER).not.toMatch(/deleteUser\s*\(/);
    expect(SHARED).not.toMatch(/deleteUser\s*\(/);
  });

  it("passe par executeAdminErasure (anonymizeAccount, trace, journal)", () => {
    expect(DELETE_USER).toContain('from "../_shared/admin-erasure.ts"');
    expect(DELETE_USER).toMatch(/executeAdminErasure\(/);
    expect(DELETE_USER).toContain('origin: "admin_users"');
    expect(SHARED).toMatch(/deps\.anonymize\(/);
    expect(SHARED).toContain("anonymize: anonymizeAccount");
    expect(SHARED).toContain('from "./account-erasure.ts"');
    expect(SHARED).toContain('"gdpr_account_erasure"');
    expect(SHARED).toContain('source: "admin"');
  });

  it("garde les contrôles d'administrateur et l'interdiction de s'effacer soi-même", () => {
    expect(DELETE_USER).toMatch(/rpc\("has_role",\s*\{[\s\S]*?_role: "admin"/);
    expect(DELETE_USER).toContain('json({ error: "Accès refusé" }, 403)');
    expect(DELETE_USER).toContain("userId === caller.id");
    // Le contrôle admin précède toute écriture.
    expect(DELETE_USER.indexOf('"has_role"')).toBeLessThan(DELETE_USER.indexOf("executeAdminErasure("));
  });

  it("répond 409 sur engagement actif", () => {
    const blocked = DELETE_USER.slice(DELETE_USER.indexOf('result.kind === "blocked"'));
    expect(blocked.slice(0, 600)).toContain("409");
  });

  it("le même circuit sert admin-delete-account", () => {
    expect(DELETE_ACCOUNT).toMatch(/executeAdminErasure\(/);
    expect(DELETE_ACCOUNT).toContain('origin: "admin_gdpr_request"');
    expect(DELETE_ACCOUNT).not.toMatch(/deleteUser\s*\(/);
  });
});

describe("D-03 · une demande reçue par email est enregistrée", () => {
  it("action record : demande pending, source admin, sans effacement", () => {
    expect(DELETE_ACCOUNT).toContain('["lookup", "record", "execute"]');
    const record = DELETE_ACCOUNT.slice(
      DELETE_ACCOUNT.indexOf('if (action === "record")'),
      DELETE_ACCOUNT.indexOf("// --- execute"),
    );
    expect(record).toMatch(/recordDeletionRequest\(/);
    expect(record).not.toMatch(/executeAdminErasure|anonymize/);
    expect(SHARED).toMatch(/status: "pending"/);
    expect(SHARED).toMatch(/ADMIN_REQUEST_DELAY_DAYS = 30/);
  });

  it("un 409 à l'exécution enregistre la demande en attente", () => {
    const blocked = DELETE_ACCOUNT.slice(
      DELETE_ACCOUNT.indexOf('result.kind === "blocked"'),
      DELETE_ACCOUNT.indexOf('result.kind === "no_account"'),
    );
    expect(blocked).toMatch(/recordDeletionRequest\(/);
    expect(blocked).toContain("409");
    expect(blocked).toContain("recorded:");
  });

  it("execute transmet le requestId au circuit partagé", () => {
    expect(DELETE_ACCOUNT).toMatch(/requestId = typeof body\?\.requestId === "string"/);
    const exec = DELETE_ACCOUNT.slice(DELETE_ACCOUNT.indexOf("executeAdminErasure(adminClient"));
    expect(exec.slice(0, 400)).toContain("requestId,");
  });

  it("lookup renvoie la demande déjà en attente", () => {
    expect(DELETE_ACCOUNT).toContain("pendingRequest:");
    expect(DELETE_ACCOUNT).toMatch(/findRequest\(adminClient, userId, rawEmail\)/);
  });

  it("la purge planifiée laisse aux admins les demandes saisies par l'équipe", () => {
    expect(PURGE).toContain('.neq("source", "admin")');
    expect(PURGE).toContain('.not("user_id", "is", null)');
  });
});

describe("écrans et décisions", () => {
  it("la fiche membre appelle admin-delete-user et lit le corps d'erreur", () => {
    const src = read("src/pages/admin/AdminUsers.tsx");
    expect(src).toContain('supabase.functions.invoke("admin-delete-user"');
    expect(src).not.toContain('toast.success("Compte supprimé définitivement")');
    expect(src).toMatch(/ctx\.json\(\)/);
  });

  it("libellé du journal pour l'enregistrement", async () => {
    const { auditActionLabel } = await import("@/lib/admin/labels");
    expect(auditActionLabel("gdpr_request_recorded")).toBe("Demande d'effacement enregistrée (RGPD)");
  });

  it("AGENTS.md porte la décision X2 avant le bloc Lovable", () => {
    const agents = read("AGENTS.md");
    const x2 = agents.indexOf("Suppression tracée (lot X2)");
    expect(x2).toBeGreaterThan(-1);
    const lovable = agents.indexOf("<!-- LOVABLE:BEGIN -->");
    if (lovable > -1) expect(x2).toBeLessThan(lovable);
  });

  it("aucun tiret cadratin ni demi-cadratin dans les fichiers touchés", () => {
    const files = [
      "supabase/functions/admin-delete-user/index.ts",
      "supabase/functions/admin-delete-account/index.ts",
      "supabase/functions/_shared/admin-erasure.ts",
      "src/pages/admin/AdminDeletionRequests.tsx",
      "src/pages/admin/_components/users/DeleteUserDialog.tsx",
    ];
    for (const f of files) expect(read(f)).not.toMatch(/[\u2013\u2014]/);
  });
});
