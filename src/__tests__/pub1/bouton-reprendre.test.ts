// Lot PUB1 : « Mes annonces » propose de reprendre le brouillon jamais publié.
import { describe, expect, it } from "vitest";
import { ownerCreateCta } from "@/lib/ownerCreateCta";

describe("bouton collant de Mes annonces", () => {
  it("reprend le brouillon le plus récent jamais publié", () => {
    const cta = ownerCreateCta([
      { id: "a", status: "draft", updated_at: "2026-10-20T10:00:00Z" },
      { id: "b", status: "draft", updated_at: "2026-10-26T15:16:04Z" },
      { id: "c", status: "published", published_at: "2026-09-01T00:00:00Z" },
    ]);
    expect(cta).toEqual({ label: "Reprendre mon brouillon", to: "/sits/create?resume=b", resumeId: "b" });
  });

  it("un brouillon dépublié n'est pas proposé à la reprise", () => {
    const cta = ownerCreateCta([{ id: "d", status: "draft", unpublished_at: "2026-10-01T00:00:00Z" }]);
    expect(cta.to).toBe("/sits/create");
  });

  it("sans brouillon, propose une nouvelle annonce", () => {
    expect(ownerCreateCta([{ id: "c", status: "published", published_at: "2026-09-01" }])).toEqual({
      label: "Publier une annonce", to: "/sits/create", resumeId: null,
    });
  });
});
