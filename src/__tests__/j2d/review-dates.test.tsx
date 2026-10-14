/**
 * Lot J2d (CGU 9.7) : chaque avis de garde indique sa date et la période de
 * la garde, du plus récent au plus ancien ; les dates viennent d'une lecture
 * déjà faite ou d'une seule lecture groupée par liste.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import {
  attachSitPeriods,
  reviewDateParts,
  reviewDatesLine,
  reviewDepositLabel,
  reviewSitPeriodLabel,
  sortReviewsNewestFirst,
} from "@/lib/reviewDates";
import { reviewDateLabel } from "@/lib/sitterProfileFacts";

const rpc = vi.fn();
const from = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: (...args: unknown[]) => rpc(...args),
    from: (...args: unknown[]) => from(...args),
  },
}));
vi.mock("@/lib/hydrateReviewers", () => ({
  hydrateReviewers: async (rows: any[]) => rows.map((r) => ({ ...r, reviewer: { first_name: "Léa" }, reviewee: { first_name: "Marc" } })),
}));
vi.mock("@/components/reports/ReportButton", () => ({ default: () => null }));
const authValue = { user: { id: "me" } };
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => authValue }));
vi.mock("@/components/seo/Head", () => ({ default: () => null }));
vi.mock("@/components/reviews/DisputeReviewDialog", () => ({ default: () => null }));

import ReviewsDisplay from "@/components/reviews/ReviewsDisplay";
import MesAvis from "@/pages/MesAvis";

const read = (p: string) => readFileSync(p, "utf8");

describe("libellés de date d'un avis", () => {
  it("période de la garde, même mois, mois différents, années différentes, un seul jour", () => {
    expect(reviewSitPeriodLabel("2026-08-03", "2026-08-10")).toBe("Garde du 3 au 10 août 2026");
    expect(reviewSitPeriodLabel("2026-07-28", "2026-08-04")).toBe("Garde du 28 juillet au 4 août 2026");
    expect(reviewSitPeriodLabel("2025-12-28", "2026-01-04")).toBe("Garde du 28 décembre 2025 au 4 janvier 2026");
    expect(reviewSitPeriodLabel("2026-08-03", "2026-08-03")).toBe("Garde du 3 août 2026");
    expect(reviewSitPeriodLabel(null, null)).toBeNull();
  });

  it("date de dépôt tirée de created_at", () => {
    expect(reviewDepositLabel("2026-08-12T09:30:00Z")).toBe("Avis du 12 août 2026");
  });

  it("les deux mentions côte à côte, la date seule pour un avis sans garde", () => {
    const garde = { created_at: "2026-08-12T09:30:00Z", sit_start_date: "2026-08-03", sit_end_date: "2026-08-10" };
    expect(reviewDatesLine(garde)).toBe("Garde du 3 au 10 août 2026 · Avis du 12 août 2026");
    expect(reviewDateParts({ created_at: "2026-08-12T09:30:00Z" })).toEqual({ period: null, deposit: "Avis du 12 août 2026" });
    expect(reviewDateLabel("2026-08-03", "2026-08-10", "2026-08-12T09:30:00Z")).toBe(
      "Garde du 3 au 10 août 2026 · Avis du 12 août 2026",
    );
    expect(reviewDatesLine(garde)).not.toMatch(/[–—]/);
  });

  it("du plus récent au plus ancien, quelle que soit la note", () => {
    const rows = [
      { id: "a", created_at: "2026-06-01T10:00:00Z", overall_rating: 5 },
      { id: "b", created_at: "2026-09-01T10:00:00Z", overall_rating: 1 },
      { id: "c", created_at: "2026-07-01T10:00:00Z", overall_rating: 3 },
    ];
    expect(sortReviewsNewestFirst(rows).map((r) => r.id)).toEqual(["b", "c", "a"]);
    expect(rows[0].id).toBe("a");
  });

  it("attachSitPeriods pose les dates lues en une fois", () => {
    const out = attachSitPeriods([{ id: "r1" }, { id: "r2" }], [
      { review_id: "r1", sit_start_date: "2026-08-03", sit_end_date: "2026-08-10" },
    ]);
    expect(out[0]).toMatchObject({ sit_start_date: "2026-08-03", sit_end_date: "2026-08-10" });
    expect(out[1]).toMatchObject({ sit_start_date: null, sit_end_date: null });
  });
});

describe("ReviewsDisplay (onglet Avis d'une annonce)", () => {
  beforeEach(() => {
    rpc.mockReset();
    from.mockReset();
  });

  it("une seule lecture, la fonction publique, avis datés et triés", async () => {
    rpc.mockResolvedValue({
      data: [
        { id: "old", reviewer_id: "x", overall_rating: 5, comment: "Ancien", created_at: "2026-05-20T10:00:00Z", sit_start_date: "2026-05-01", sit_end_date: "2026-05-08" },
        { id: "new", reviewer_id: "y", overall_rating: 2, comment: "Récent", created_at: "2026-08-12T10:00:00Z", sit_start_date: "2026-08-03", sit_end_date: "2026-08-10" },
      ],
      error: null,
    });
    const { container } = render(<ReviewsDisplay userId="owner-1" />);
    await screen.findByText("Récent");
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith("public_profile_reviews", { p_user_id: "owner-1" });
    expect(from).not.toHaveBeenCalled();
    const periods = Array.from(container.querySelectorAll("[data-review-period]")).map((n) => n.textContent);
    const deposits = Array.from(container.querySelectorAll("[data-review-deposit]")).map((n) => n.textContent);
    expect(periods).toEqual(["Garde du 3 au 10 août 2026 · ", "Garde du 1er au 8 mai 2026 · "]);
    expect(deposits).toEqual(["Avis du 12 août 2026", "Avis du 20 mai 2026"]);
  });
});

describe("/mes-avis : une seule lecture groupée des périodes", () => {
  beforeEach(() => {
    rpc.mockReset();
    from.mockReset();
  });

  it("review_sit_periods appelée une fois pour les deux listes, jamais sits", async () => {
    const received = [
      { id: "r1", sit_id: "s1", reviewer_id: "a", reviewee_id: "me", overall_rating: 4, comment: "Merci", created_at: "2026-08-12T10:00:00Z", published: true },
      { id: "r2", sit_id: null, reviewer_id: "b", reviewee_id: "me", overall_rating: 5, comment: "Entraide", created_at: "2026-09-02T10:00:00Z", published: true },
    ];
    const given = [
      { id: "g1", sit_id: "s2", reviewer_id: "me", reviewee_id: "c", overall_rating: 5, comment: "Super", created_at: "2026-07-15T10:00:00Z", published: true },
    ];
    from.mockImplementation((table: string) => {
      const filters: Record<string, unknown> = {};
      const builder: any = {
        select: () => builder,
        order: () => builder,
        eq: (k: string, v: unknown) => {
          filters[k] = v;
          return builder;
        },
        then: (resolve: (v: unknown) => unknown) => {
          if (table === "review_disputes") return Promise.resolve({ data: [], error: null }).then(resolve);
          if (table === "reviews" && filters.reviewee_id) return Promise.resolve({ data: received, error: null }).then(resolve);
          if (table === "reviews" && filters.reviewer_id) return Promise.resolve({ data: given, error: null }).then(resolve);
          return Promise.resolve({ data: null, error: new Error(`table inattendue ${table}`) }).then(resolve);
        },
      };
      return builder;
    });
    rpc.mockResolvedValue({
      data: [
        { review_id: "r1", sit_id: "s1", sit_start_date: "2026-08-03", sit_end_date: "2026-08-10" },
        { review_id: "g1", sit_id: "s2", sit_start_date: "2026-07-01", sit_end_date: "2026-07-09" },
      ],
      error: null,
    });

    render(
      <MemoryRouter>
        <MesAvis />
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByText("Merci")).toBeTruthy());
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith("review_sit_periods", { p_review_ids: ["r1", "g1"] });
    expect(from.mock.calls.map((c) => c[0])).not.toContain("sits");
    expect(screen.getByText("Garde du 3 au 10 août 2026 ·")).toBeTruthy();
    expect(screen.getByText("Avis du 12 août 2026")).toBeTruthy();
    // Ordre : l'avis d'entraide du 2 septembre précède celui du 12 août.
    const texts = Array.from(document.querySelectorAll("[data-review-deposit]")).map((n) => n.textContent);
    expect(texts).toEqual(["Avis du 2 septembre 2026", "Avis du 12 août 2026"]);
  });
});

describe("sources des listes d'avis", () => {
  it("les listes publiques lisent public_profile_reviews, jamais reviews ni sits", () => {
    for (const p of [
      "src/components/reviews/ReviewsDisplay.tsx",
      "src/pages/PublicSitDetail.tsx",
      "src/pages/PublicSitterProfile.tsx",
    ]) {
      const src = read(p);
      expect(src, p).toMatch(/rpc\("public_profile_reviews"/);
      expect(src, p).not.toMatch(/from\("reviews"\)/);
    }
    const sitDetail = read("src/pages/SitDetail.tsx");
    expect(sitDetail).toMatch(/rpc\("public_profile_reviews", \{ p_user_id: sitData\.user_id \}\)/);
    expect(sitDetail).not.toMatch(/from\("reviews"\)\s*\.select\("\*"\)/);
  });

  it("chaque liste affiche la période et la date", () => {
    for (const p of [
      "src/components/reviews/ReviewsDisplay.tsx",
      "src/components/sits/PublicSitView.tsx",
      "src/pages/PublicSitterProfile.tsx",
      "src/pages/MesAvis.tsx",
    ]) {
      expect(read(p), p).toMatch(/<ReviewDatesText review=\{/);
    }
    expect(read("src/components/profile/sitter/SitterF1Sections.tsx")).toMatch(
      /reviewDateLabel\(review\.sit_start_date, review\.sit_end_date, review\.created_at\)/,
    );
  });

  it("review_sit_periods : SQL préparé, droits Y2, avis d'annulation hors du public", () => {
    const sql = read("supabase/prepared-migrations/20261014151000_j2d_periodes_avis.sql");
    expect(sql).toMatch(/CREATE OR REPLACE FUNCTION public\.review_sit_periods\(p_review_ids uuid\[\]\)/);
    expect(sql).toMatch(/SECURITY DEFINER/);
    expect(sql).toMatch(/auth\.uid\(\) IS NOT NULL/);
    expect(sql).toMatch(/review_type IS DISTINCT FROM 'annulation'/);
    expect(sql).toMatch(/REVOKE EXECUTE ON FUNCTION public\.review_sit_periods\(uuid\[\]\) FROM PUBLIC, anon, authenticated;/);
    expect(sql).toMatch(/GRANT EXECUTE ON FUNCTION public\.review_sit_periods\(uuid\[\]\) TO authenticated, service_role;/);
  });
});
