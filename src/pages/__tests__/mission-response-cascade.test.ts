import { describe, it, expect } from "vitest";

/**
 * Vérifie la logique métier de la cascade decline lors d'un accept :
 * - mode "keep" : les autres réponses pending restent inchangées
 * - mode "decline_others" : toutes les autres pending passent à declined
 * - les réponses non-pending (accepted / declined / withdrawn) ne sont jamais touchées
 */

type Resp = { id: string; status: "pending" | "accepted" | "declined" | "withdrawn"; responder_id: string };

function computeCascade(
  responses: Resp[],
  acceptedId: string,
  mode: "keep" | "decline_others",
): Resp[] {
  return responses.map((r) => {
    if (r.id === acceptedId) return { ...r, status: "accepted" };
    if (mode === "decline_others" && r.status === "pending") return { ...r, status: "declined" };
    return r;
  });
}

describe("mission accept cascade", () => {
  const base: Resp[] = [
    { id: "r1", status: "pending", responder_id: "u1" },
    { id: "r2", status: "pending", responder_id: "u2" },
    { id: "r3", status: "pending", responder_id: "u3" },
    { id: "r4", status: "withdrawn", responder_id: "u4" },
  ];

  it("mode keep : ne touche pas les autres pending", () => {
    const out = computeCascade(base, "r1", "keep");
    expect(out.find((r) => r.id === "r1")?.status).toBe("accepted");
    expect(out.find((r) => r.id === "r2")?.status).toBe("pending");
    expect(out.find((r) => r.id === "r3")?.status).toBe("pending");
    expect(out.find((r) => r.id === "r4")?.status).toBe("withdrawn");
  });

  it("mode decline_others : passe toutes les autres pending à declined", () => {
    const out = computeCascade(base, "r1", "decline_others");
    expect(out.find((r) => r.id === "r1")?.status).toBe("accepted");
    expect(out.find((r) => r.id === "r2")?.status).toBe("declined");
    expect(out.find((r) => r.id === "r3")?.status).toBe("declined");
    // withdrawn n'est pas re-écrit
    expect(out.find((r) => r.id === "r4")?.status).toBe("withdrawn");
  });

  it("ne cascade jamais sur les réponses déjà accepted / declined", () => {
    const arr: Resp[] = [
      { id: "r1", status: "pending", responder_id: "u1" },
      { id: "r2", status: "accepted", responder_id: "u2" },
      { id: "r3", status: "declined", responder_id: "u3" },
    ];
    const out = computeCascade(arr, "r1", "decline_others");
    expect(out.find((r) => r.id === "r2")?.status).toBe("accepted");
    expect(out.find((r) => r.id === "r3")?.status).toBe("declined");
  });
});
