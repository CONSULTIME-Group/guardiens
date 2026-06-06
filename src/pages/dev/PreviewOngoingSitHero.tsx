import { Helmet } from "react-helmet-async";
import OngoingSitHero from "@/components/dashboard/owner/OngoingSitHero";
import type { SitRow, SitterInfo } from "@/components/dashboard/owner/types";

/**
 * Route de preview isolée pour OngoingSitHero.
 * Permet de capturer le rendu mobile/tablette sans authentification ni données réelles.
 * Date "courante" présumée ~ 2026-04-11 (J-3 avant la fin du sit).
 *
 * URL : /dev/preview/ongoing-sit-hero
 */
const sitterInfo: SitterInfo = {
  id: "sitter-1",
  first_name: "claire",
  avatar_url: null,
  identity_verified: true,
  completed_sits_count: 12,
  avgNote: 4.8,
};

const ongoingSit: SitRow = {
  id: "sit-1",
  title: "Garde de Luna",
  status: "in_progress",
  start_date: "2026-04-08",
  end_date: "2026-04-14",
  created_at: "2026-04-01",
  property_id: "prop-1",
  user_id: "owner-1",
  cancelled_by: null,
  applications: [{ id: "app-1", status: "accepted", sitter_id: "sitter-1" }],
};

export default function PreviewOngoingSitHero() {
  return (
    <div className="min-h-screen bg-background p-4">
      <Helmet><meta name="robots" content="noindex,nofollow" /></Helmet>
      <div className="max-w-5xl mx-auto space-y-4">
        <p className="text-xs text-muted-foreground">
          Preview isolée, OngoingSitHero (J-3, sit en cours)
        </p>
        <OngoingSitHero sit={ongoingSit} sitterProfiles={{ "sitter-1": sitterInfo }} />
      </div>
    </div>
  );
}
