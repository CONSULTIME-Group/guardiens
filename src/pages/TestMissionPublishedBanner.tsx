/**
 * Page de test isolée pour le bandeau de publication d'une petite mission.
 * Accessible uniquement via /test/mission-published-banner (noindex).
 *
 * Permet à Playwright de tester le flux "Partager le lien" dans un vrai
 * navigateur sans dépendre d'une session Supabase :
 *   - le bandeau est monté en dur (isAuthor + published = true)
 *   - currentUrlOverride force l'URL de référence pour le partage
 *   - les toasts sont relayés via window.__lovableToasts (data attr)
 */
import { Helmet } from "react-helmet-async";
import { useState } from "react";
import MissionPublishedBanner from "@/components/missions/MissionPublishedBanner";

const FORCED_URL = "https://example.test/petites-missions/mission-test-1234?published=1";

export default function TestMissionPublishedBanner() {
  const [toasts, setToasts] = useState<Array<{ title: string; description: string; variant?: string }>>([]);
  const [closed, setClosed] = useState(false);

  return (
    <div className="p-6 md:p-10 max-w-3xl mx-auto">
      <Helmet>
        <meta name="robots" content="noindex, nofollow" />
        <title>Test — Mission Published Banner</title>
      </Helmet>

      <h1 className="font-heading text-xl mb-4">Test bandeau publication</h1>

      {!closed && (
        <MissionPublishedBanner
          missionTitle="Promener mon chien"
          isAuthor
          published
          onClose={() => setClosed(true)}
          onToast={(t) => setToasts((prev) => [...prev, t])}
          currentUrlOverride={FORCED_URL}
        />
      )}

      {/* Sondes lues par Playwright */}
      <div data-testid="probe-toasts" data-toast-count={toasts.length}>
        {toasts.map((t, i) => (
          <div key={i} data-testid="probe-toast" data-variant={t.variant ?? "default"}>
            <span data-testid="probe-toast-title">{t.title}</span>
            <span data-testid="probe-toast-desc">{t.description}</span>
          </div>
        ))}
      </div>
      <div data-testid="probe-forced-url">{FORCED_URL}</div>
    </div>
  );
}
