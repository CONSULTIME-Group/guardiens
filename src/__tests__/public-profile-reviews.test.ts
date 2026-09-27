import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { splitReviewsByRole, averageRating, sitterReviewsHeading } from "@/lib/publicProfileReviews";

const page = readFileSync("src/pages/PublicSitterProfile.tsx", "utf8");

describe("avis visibles aux visiteurs", () => {
  it("un avis garde affiche le titre et la moyenne", () => {
    const { gardeReviews, missionReviews } = splitReviewsByRole([{ review_role: "garde", overall_rating: 5 }]);
    const count = gardeReviews.length + missionReviews.length;
    const h = sitterReviewsHeading(count, averageRating([...gardeReviews, ...missionReviews]), "Krystina");
    expect(h.title).toBe("Ce que les propriétaires racontent.");
    expect(h.summary).toBe("1 retour · moyenne 5,0★");
  });
  it("sans avis, l'état vide actuel", () => {
    const h = sitterReviewsHeading(0, 0, "Krystina");
    expect(h.title).toBe("Krystina prépare sa première garde.");
    expect(h.summary).toBeNull();
  });
  it("répartit proprio et entraide", () => {
    const r = splitReviewsByRole([{ review_role: "proprio" }, { review_role: "entraide" }, { review_role: "garde" }]);
    expect([r.gardeReviews.length, r.ownerReviews.length, r.missionReviews.length]).toEqual([1, 1, 1]);
  });
  it("la fiche lit les avis par la fonction serveur, sans lire sits pour l'attribution", () => {
    expect(page).toContain('supabase.rpc("public_profile_reviews", { p_user_id: id })');
    expect(page).not.toContain("sitOwnerBySitId");
    expect(page).not.toMatch(/from\("sits"\)\s*\.select\("id, user_id"\)/);
    expect(page).not.toMatch(/from\("reviews"\)/);
  });
});
