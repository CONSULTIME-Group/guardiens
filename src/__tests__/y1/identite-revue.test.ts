/**
 * Lot Y1 (P4-02, décision du fondateur du 13/10/2026) : un refus proposé par
 * l'IA de vérification d'identité passe en revue humaine, sauf document
 * illisible ou sans rapport avec une pièce d'identité (libellé fixe). Les
 * dates sont contrôlées par le code. Au plus un email de refus par 24 h.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  AUTO_REJECT_REASONS,
  asSentence,
  checkDocumentDates,
  decideIdentityOutcome,
  identityRejectionEmailAllowed,
  isDateClaim,
  parseDocumentDate,
} from "../../../supabase/functions/_shared/identity-review.ts";

const NOW = new Date("2026-10-13T10:00:00Z");
const read = (p: string) => readFileSync(p, "utf8");

describe("Y1 P4-02, décision", () => {
  it("le faux motif de dates relevé en production passe en revue humaine, motif recalculé par le code", () => {
    const out = decideIdentityOutcome(
      {
        is_valid: false,
        document_type: "national_id",
        confidence: 0.9,
        rejection_category: "other",
        rejection_reason: "La date d'émission (2025) est postérieure à la date d'expiration (2035).",
        red_flags: ["Incohérence de dates : émission 2025, expiration 2035"],
        issue_date: "2025-03-01",
        expiry_date: "2035-02-28",
      },
      NOW,
    );
    expect(out.status).toBe("needs_review");
    expect(out.aiProposal).toBe("reject");
    expect(out.memberReason).toBeNull();
    expect(out.redFlags).toEqual([]);
    expect(out.dateCheck.status).toBe("ok");
    expect(out.reviewReason).toContain("Refus proposé par l'IA");
    expect(out.reviewReason).toContain("Dates cohérentes : émission 2025-03-01, expiration 2035-02-28");
    expect(out.reviewReason).not.toContain("postérieure");
  });

  it("tout autre refus proposé par l'IA va à l'équipe avec son motif", () => {
    const out = decideIdentityOutcome(
      { is_valid: false, document_type: "passport", confidence: 0.7, rejection_category: "other", rejection_reason: "Le document semble retouché.", red_flags: ["Retouche possible"] },
      NOW,
    );
    expect(out.status).toBe("needs_review");
    expect(out.reviewReason).toContain("Le document semble retouché · Retouche possible");
    expect(out.reviewReason).not.toContain("..");
  });

  it("un refus sans catégorie connue va aussi à l'équipe", () => {
    const out = decideIdentityOutcome({ is_valid: false, document_type: "passport", confidence: 0.4 }, NOW);
    expect(out.status).toBe("needs_review");
    expect(out.reviewReason).toContain("motif à préciser");
  });

  it("document illisible : refus automatique, libellé fixe", () => {
    const out = decideIdentityOutcome(
      { is_valid: false, document_type: "national_id", confidence: 0.8, rejection_category: "unreadable", rejection_reason: "Texte libre du modèle" },
      NOW,
    );
    expect(out.status).toBe("rejected");
    expect(out.rejectCode).toBe("unreadable");
    expect(out.memberReason).toBe(AUTO_REJECT_REASONS.unreadable);
    expect(out.memberReason).not.toContain("Texte libre");
  });

  it("image sans rapport avec une pièce : refus automatique, libellé fixe", () => {
    const byType = decideIdentityOutcome({ is_valid: false, document_type: "not_a_document", confidence: 0.95 }, NOW);
    expect(byType.status).toBe("rejected");
    expect(byType.memberReason).toBe(AUTO_REJECT_REASONS.not_identity_document);
    const byCategory = decideIdentityOutcome(
      { is_valid: false, document_type: "other", confidence: 0.9, rejection_category: "not_identity_document" },
      NOW,
    );
    expect(byCategory.rejectCode).toBe("not_identity_document");
  });

  it("pièce valide, confiance haute et dates cohérentes : validée", () => {
    const out = decideIdentityOutcome(
      { is_valid: true, document_type: "passport", confidence: 0.92, issue_date: "2020-05-10", expiry_date: "2030-05-09" },
      NOW,
    );
    expect(out.status).toBe("verified");
    expect(out.reviewReason).toBeNull();
  });

  it("pièce valide sans dates lues : validée sur la confiance", () => {
    const out = decideIdentityOutcome({ is_valid: true, document_type: "national_id", confidence: 0.9 }, NOW);
    expect(out.status).toBe("verified");
  });

  it("pièce valide mais expirée selon le code : revue humaine", () => {
    const out = decideIdentityOutcome(
      { is_valid: true, document_type: "passport", confidence: 0.95, issue_date: "2014-01-01", expiry_date: "2024-01-01" },
      NOW,
    );
    expect(out.status).toBe("needs_review");
    expect(out.dateCheck.status).toBe("expired");
    expect(out.reviewReason).toContain("date dépassée (contrôle du code)");
  });

  it("émission postérieure à l'expiration selon le code : revue humaine, jamais un refus", () => {
    const out = decideIdentityOutcome(
      { is_valid: true, document_type: "passport", confidence: 0.95, issue_date: "2035-01-01", expiry_date: "2030-01-01" },
      NOW,
    );
    expect(out.status).toBe("needs_review");
    expect(out.dateCheck.status).toBe("issue_after_expiry");
  });

  it("confiance faible : revue humaine avec le pourcentage", () => {
    const out = decideIdentityOutcome({ is_valid: true, document_type: "drivers_license", confidence: 0.6 }, NOW);
    expect(out.status).toBe("needs_review");
    expect(out.aiProposal).toBe("low_confidence");
    expect(out.reviewReason).toContain("Confiance de l'IA à 60 %");
  });

  it("réponse vide du modèle : revue humaine", () => {
    expect(decideIdentityOutcome(null, NOW).status).toBe("needs_review");
  });
});

describe("Y1 P4-02, dates et textes", () => {
  it("lit les formats usuels et refuse une date impossible", () => {
    expect(parseDocumentDate("2025-03-01")?.toISOString().slice(0, 10)).toBe("2025-03-01");
    expect(parseDocumentDate("01/03/2025")?.toISOString().slice(0, 10)).toBe("2025-03-01");
    expect(parseDocumentDate("01.03.2025")?.toISOString().slice(0, 10)).toBe("2025-03-01");
    expect(parseDocumentDate("2025-02-30")).toBeNull();
    expect(parseDocumentDate("2025")).toBeNull();
    expect(parseDocumentDate("")).toBeNull();
    expect(parseDocumentDate(42)).toBeNull();
  });

  it("contrôle des dates", () => {
    expect(checkDocumentDates("", "", NOW).status).toBe("unknown");
    expect(checkDocumentDates("2025-01-01", "2035-01-01", NOW).status).toBe("ok");
    expect(checkDocumentDates("2027-01-01", "2037-01-01", NOW).status).toBe("issue_in_future");
  });

  it("les affirmations du modèle sur les dates sont reconnues", () => {
    expect(isDateClaim("Document expiré")).toBe(true);
    expect(isDateClaim("La date d'émission (2025) est postérieure")).toBe(true);
    expect(isDateClaim("Capture d'écran")).toBe(false);
  });

  it("un seul point en fin de motif", () => {
    expect(asSentence("Photo floue.")).toBe("Photo floue.");
    expect(asSentence("Photo floue")).toBe("Photo floue.");
    expect(asSentence("  ")).toBe("");
    expect(`${asSentence(AUTO_REJECT_REASONS.unreadable)} Vous pouvez`).not.toContain("..");
  });

  it("libellés fixes positifs, sans tiret cadratin ni demi-cadratin", () => {
    for (const label of Object.values(AUTO_REJECT_REASONS)) {
      expect(label).not.toMatch(/[\u2013\u2014]/);
      expect(label).not.toMatch(/\bne\b|\bn'|\bpas\b/);
    }
  });
});

type LogRow = { id: string };
function fakeClient(result: { data: LogRow[] | null; error: { message: string } | null }) {
  const calls: Array<[string, unknown[]]> = [];
  const builder: Record<string, unknown> = {};
  for (const m of ["from", "select", "eq", "in", "gte"]) {
    builder[m] = (...args: unknown[]) => {
      calls.push([m, args]);
      return builder;
    };
  }
  builder.limit = (...args: unknown[]) => {
    calls.push(["limit", args]);
    return Promise.resolve(result);
  };
  return { client: builder, calls };
}

describe("Y1 P4-02, un email de refus par 24 h", () => {
  const now = NOW.getTime();

  it("créneau libre sans envoi récent", async () => {
    const { client, calls } = fakeClient({ data: [], error: null });
    expect(await identityRejectionEmailAllowed(client, "Membre@Exemple.fr", now)).toBe(true);
    expect(calls).toContainEqual(["from", ["email_send_log"]]);
    expect(calls).toContainEqual(["eq", ["recipient_email", "membre@exemple.fr"]]);
    expect(calls).toContainEqual(["eq", ["template_name", "identity-rejected"]]);
    expect(calls).toContainEqual(["in", ["status", ["sent", "pending", "deferred"]]]);
    expect(calls).toContainEqual(["gte", ["created_at", new Date(now - 24 * 3600 * 1000).toISOString()]]);
  });

  it("créneau pris après un envoi dans les 24 h", async () => {
    const { client } = fakeClient({ data: [{ id: "x" }], error: null });
    expect(await identityRejectionEmailAllowed(client, "membre@exemple.fr", now)).toBe(false);
  });

  it("lecture en échec ou adresse absente : aucun email", async () => {
    const { client } = fakeClient({ data: null, error: { message: "boom" } });
    expect(await identityRejectionEmailAllowed(client, "membre@exemple.fr", now)).toBe(false);
    const { client: c2 } = fakeClient({ data: [], error: null });
    expect(await identityRejectionEmailAllowed(c2, "", now)).toBe(false);
  });
});

describe("Y1 P4-02, circuit branché", () => {
  it("verify-identity décide par le module et plafonne l'email", () => {
    const src = read("supabase/functions/verify-identity/index.ts");
    expect(src).toContain('from "../_shared/identity-review.ts"');
    expect(src).toContain("decideIdentityOutcome(verification)");
    expect(src).toContain("identityRejectionEmailAllowed(supabaseAdmin, userEmail)");
    expect(src).not.toContain('if (!verification.is_valid) finalStatus = "rejected"');
    expect(src).not.toContain("verification.rejection_reason ||");
    expect(src).toContain("rejection_category");
    expect(src).toContain("expiry_date");
  });

  it("le refus de l'équipe garde le verrou C3 et le plafond d'email", () => {
    const src = read("supabase/functions/admin-manage-identity-verification/index.ts");
    expect(src).toContain("identity_verification_status.neq.rejected");
    expect(src).toContain("identityRejectionEmailAllowed(adminClient, email)");
    const admin = read("src/pages/admin/AdminVerifications.tsx");
    expect(admin).toContain("rejectingRef.current");
    expect(admin).toContain("Motif proposé par l'IA");
    expect(admin).toContain('"pending", "needs_review"');
  });

  it("le membre en revue lit que sa pièce est en cours de vérification", () => {
    const section = read("src/components/settings/IdentityVerificationSection.tsx");
    expect(section).toContain('label: "Pièce en cours de vérification"');
  });

  it("aucun module Deno importé par le module partagé", () => {
    const src = read("supabase/functions/_shared/identity-review.ts");
    expect(src).not.toMatch(/\bDeno\./);
    expect(src).not.toMatch(/^import /m);
  });
});
