/**
 * Alma Pass 1 — Chantier 6
 * Bulle de relance pour une annonce propriétaire publiée depuis > 3 jours
 * sans aucune candidature. Trois actions rapides (aucun appel IA) :
 *   1. Améliorer la description (ouvre l'édition)
 *   2. Ajouter des photos (idem, ancre photos)
 *   3. Partager l'annonce (copie le lien public)
 *
 * Se masque via localStorage `alma_silent_sit_dismissed_<sitId>`.
 */
import { useEffect, useMemo, useState } from "react";
import { differenceInDays } from "date-fns";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { AlmaBubble } from "./AlmaBubble";
import { trackEvent } from "@/lib/analytics";

interface SilentSit {
  id: string;
  title?: string | null;
  slug?: string | null;
  status: string;
  created_at?: string | null;
  applications?: unknown[] | null;
}

interface AlmaSilentSitBubbleProps {
  sits: SilentSit[];
}

const DISMISS_PREFIX = "alma_silent_sit_dismissed_";

function pickSilentSit(sits: SilentSit[]): SilentSit | null {
  const now = new Date();
  const candidates = sits
    .filter(
      (s) =>
        s.status === "published" &&
        (s.applications || []).length === 0 &&
        s.created_at &&
        differenceInDays(now, new Date(s.created_at)) >= 3,
    )
    .sort((a, b) => {
      const da = a.created_at ? new Date(a.created_at).getTime() : 0;
      const db = b.created_at ? new Date(b.created_at).getTime() : 0;
      return da - db; // plus ancienne d'abord
    });
  return candidates[0] ?? null;
}

export function AlmaSilentSitBubble({ sits }: AlmaSilentSitBubbleProps) {
  const navigate = useNavigate();
  const silentSit = useMemo(() => pickSilentSit(sits), [sits]);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!silentSit) return;
    if (typeof window !== "undefined") {
      const key = DISMISS_PREFIX + silentSit.id;
      if (window.localStorage.getItem(key)) {
        setDismissed(true);
        return;
      }
    }
    const days = silentSit.created_at
      ? differenceInDays(new Date(), new Date(silentSit.created_at))
      : null;
    trackEvent("alma_silent_sit_bubble_seen", {
      metadata: { sit_id: silentSit.id, days_since_publish: days },
    });
  }, [silentSit]);

  if (!silentSit || dismissed) return null;

  const daysSince = silentSit.created_at
    ? differenceInDays(new Date(), new Date(silentSit.created_at))
    : 0;

  const handleAction = (actionId: string, fn: () => void) => {
    trackEvent("alma_silent_sit_action_clicked", {
      metadata: { sit_id: silentSit.id, action_id: actionId },
    });
    fn();
  };

  const publicPath = silentSit.slug
    ? `/annonces/${silentSit.slug}`
    : `/sits/${silentSit.id}`;

  return (
    <AlmaBubble
      audience="owner"
      variant="dashboard"
      title={`Votre annonce est en ligne depuis ${daysSince} jour${daysSince > 1 ? "s" : ""}, aucune candidature pour l'instant.`}
      onDismiss={() => {
        if (typeof window !== "undefined") {
          window.localStorage.setItem(DISMISS_PREFIX + silentSit.id, "1");
        }
        setDismissed(true);
      }}
      actions={
        <>
          <Button
            size="sm"
            variant="default"
            onClick={() =>
              handleAction("edit_description", () =>
                navigate(`/sits/${silentSit.id}/edit`),
              )
            }
          >
            Améliorer la description
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              handleAction("add_photos", () =>
                navigate(`/sits/${silentSit.id}/edit#photos`),
              )
            }
          >
            Ajouter des photos
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              handleAction("share_link", async () => {
                const url =
                  typeof window !== "undefined"
                    ? `${window.location.origin}${publicPath}`
                    : publicPath;
                try {
                  await navigator.clipboard.writeText(url);
                  toast({
                    title: "Lien copié",
                    description: "Partagez-le à vos proches pour élargir la portée.",
                  });
                } catch {
                  toast({
                    title: "Impossible de copier",
                    description: url,
                  });
                }
              })
            }
          >
            Partager l'annonce
          </Button>
        </>
      }
    >
      <p>
        Alma a repéré trois leviers qui font revenir des candidatures : préciser le contexte
        de la garde, ajouter deux ou trois photos claires, ou partager le lien à vos proches.
        Commencez par le levier qui vous demande le moins d'effort.
      </p>
    </AlmaBubble>
  );
}

export default AlmaSilentSitBubble;
