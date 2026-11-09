import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { AUDIT_ACTION_LABELS, AUDIT_ENTITY_LABELS } from "@/lib/admin/labels";

/** Lot ADM18 (lot 6 de l'arène) : écritures confirmées et journalisées, P0 des outils. */

const inserts: Array<{ table: string; row: any }> = [];
let insertError: unknown = null;
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getUser: () => Promise.resolve({ data: { user: { id: "admin-1" } } }) },
    from: (table: string) => ({ insert: (row: any) => { inserts.push({ table, row }); return Promise.resolve({ error: insertError }); } }),
    rpc: (name: string, args: any) => { inserts.push({ table: `rpc:${name}`, row: args }); return Promise.resolve({ error: null }); },
  },
}));

const src = (f: string) => readFileSync(f, "utf8");
beforeEach(() => { inserts.length = 0; insertError = null; });

describe("ADM18, journal commun", () => {
  it("une ligne par écriture, résultat contrôlé", async () => {
    const { logAdminAction } = await import("@/lib/admin/adminJournal");
    expect(await logAdminAction({ action: "association_consent_granted", targetType: "association", targetId: "a-1" })).toEqual({ ok: true });
    expect(inserts[0]).toMatchObject({ table: "admin_action_logs", row: { admin_id: "admin-1", action: "association_consent_granted", target_type: "association", target_id: "a-1" } });
    insertError = { message: "refusé" };
    expect(await logAdminAction({ action: "x", targetType: "y", targetId: "z" })).toEqual({ ok: false });
  });

  it("échec d'un message admin tracé dans l'historique des envois", async () => {
    const { logAdminMessageFailure } = await import("@/lib/admin/adminMessageFailure");
    await logAdminMessageFailure("u-1", "Bonjour", "boom");
    expect(inserts[0]).toEqual({ table: "rpc:admin_log_message_failure", row: { p_target_user_id: "u-1", p_content: "Bonjour", p_error_message: "boom" } });
    expect(src("src/pages/admin/AdminSmallMissions.tsx")).toContain("logAdminMessageFailure(mission.user_id, content, error.message)");
    expect(src("src/pages/admin/_components/associations/VolunteersTab.tsx")).toContain("logAdminMessageFailure(contact.user_id, content, error.message)");
  });

  it("libellés français pour les actions du journal et du lot", () => {
    for (const k of ["view_conversation_thread", "release_projet", "association_consent_granted", "contact_message_closed", "experience_verified", "resend_signup_confirmation"]) {
      expect(AUDIT_ACTION_LABELS[k], k).toBeTruthy();
    }
    expect(AUDIT_ENTITY_LABELS.association).toBe("Association");
    expect(src("src/pages/admin/AdminAudit.tsx")).toContain("...Object.keys(AUDIT_ACTION_LABELS)");
  });
});

describe("ADM18, écritures confirmées", () => {
  it("Associations : statut et accord photos après confirmation, journalisés ; lecture en échec dite", () => {
    const a = src("src/pages/admin/AdminAssociations.tsx");
    for (const action of ["association_publish", "association_unpublish", "association_archive", "association_consent_requested", "association_consent_granted", "association_consent_refused"]) {
      expect(a, action).toContain(`action: "${action}"`);
    }
    expect(a).toContain("Enregistrer l'accord");
    expect(a).not.toMatch(/onClick=\{\(\) =>\s*persist\(/);
    expect(a).toContain("loadError ?");
    expect(src("src/pages/admin/_components/associations/VolunteersTab.tsx")).toContain("Les déclarations n'ont pas pu être lues.");
  });

  it("Projets : « Valider et diffuser » après confirmation", () => {
    const s = src("src/pages/admin/AdminSmallMissions.tsx");
    expect(s).toContain("maintenant ?`}");
    expect(s).not.toMatch(/onClick=\{\(\) => releaseProjet\(/);
  });

  it("Messages de contact : lire n'écrit plus, « Clore » confirmé et journalisé", () => {
    const c = src("src/pages/admin/AdminContactMessages.tsx");
    const view = c.slice(c.indexOf("const handleView"), c.indexOf("const handleSaveNote"));
    expect(view).not.toContain("updateStatus");
    expect(c).toContain("Clore le message");
    expect(c).toContain("contact_message_${status}");
    expect(c).toContain("Je m'en occupe");
  });

  it("Expériences : validation confirmée, notification et journal contrôlés", () => {
    const e = src("src/pages/admin/AdminExperienceVerification.tsx");
    expect(e).toContain('action: "experience_verified"');
    expect(e).toContain("notification du membre à refaire");
    expect(e).toContain('title="Valider cette expérience ?"');
  });
});

describe("ADM18, P0 des outils", () => {
  it("rapport de délivrabilité : lecture par pages au-delà de 1 000 lignes", () => {
    const d = src("supabase/functions/email-delivery-daily/index.ts");
    expect(d).not.toContain(".limit(100000)");
    expect(d).toContain(".range(from, from + PAGE - 1)");
    expect(d).toContain(".order('id', { ascending: true })");
  });

  it("Paramètres : Google-Extended décrit tel que robots.txt le sert", () => {
    const s = src("src/pages/admin/AdminSettings.tsx");
    expect(s).not.toContain("Disallow");
    expect(s).toContain("Autorisé");
    const robots = src("public/robots.txt");
    const block = robots.slice(robots.indexOf("User-agent: Google-Extended"));
    expect(block.slice(0, block.indexOf("Disallow"))).toContain("Allow: /");
  });
});
