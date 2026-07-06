/**
 * <AlmaFirstMeeting /> — moment d'accueil unique où Alma se présente sur
 * le dashboard. S'affiche UNE seule fois par utilisateur (flag serveur
 * `profiles.alma_first_meeting_seen`), puis plus jamais.
 *
 * Priorité : quand ce moment est actif, on désactive les whispers proactifs
 * (usage_nudge, cultural_fact) sur le dashboard, via le prop `enabled` des
 * hooks côté OwnerDashboard / SitterDashboard.
 *
 * Voix persona : phrases courtes, "je", vouvoiement, aucun mot proscrit,
 * pas d'emoji, pas de tiret cadratin. CTA principal actionnable obligatoire.
 */
import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { AlmaBubble } from "./AlmaBubble";
import { trackEvent } from "@/lib/analytics";
import { resolveAlmaCtaHref, type AlmaCtaAction } from "@/lib/alma/cta-actions";

type Role = "owner" | "sitter";

interface Copy {
  body: string;
  primaryLabel: string;
  primaryAction: Extract<AlmaCtaAction, "draft_sit" | "complete_profile">;
}

const COPY: Record<Role, Copy> = {
  owner: {
    body:
      "Bonjour, je suis Alma. Un petit bichon frisé tout blanc, arrivée de Córdoba en Argentine. Je vous accompagne ici : je vous guide et je prépare vos annonces. Pour commencer, décrivez une absence en une phrase. Je m'occupe du brouillon, vous relisez.",
    primaryLabel: "Décrire mon absence",
    primaryAction: "draft_sit",
  },
  sitter: {
    body:
      "Bonjour, je suis Alma. Un petit bichon frisé tout blanc, arrivée de Córdoba en Argentine. Je vous accompagne ici : je vous signale les gardes et je vous aide à bien vous présenter. Pour commencer, complétez votre profil. C'est ce qui fait le plus remonter vos candidatures.",
    primaryLabel: "Compléter mon profil",
    primaryAction: "complete_profile",
  },
};

interface Props {
  role: Role;
  onDone: () => void;
}

export function AlmaFirstMeeting({ role, onDone }: Props) {
  const navigate = useNavigate();
  const seenFiredRef = useRef(false);
  const copy = COPY[role];

  useEffect(() => {
    if (seenFiredRef.current) return;
    seenFiredRef.current = true;
    try {
      void trackEvent("alma_dashboard_first_meeting_seen", {
        metadata: { role },
      });
    } catch {
      /* silent */
    }
  }, [role]);

  const handlePrimary = () => {
    try {
      void trackEvent("alma_first_meeting_cta_clicked", {
        metadata: { role, cta_action: copy.primaryAction },
      });
    } catch {
      /* silent */
    }
    onDone();
    const href = resolveAlmaCtaHref(copy.primaryAction);
    if (href) navigate(href);
  };

  const handleLater = () => {
    onDone();
  };

  return (
    <div className="mb-4">
      <AlmaBubble
        audience={role}
        variant="dashboard"
        title="Bonjour, je suis Alma."
        onDismiss={handleLater}
        actions={
          <>
            <Button size="sm" onClick={handlePrimary}>
              {copy.primaryLabel}
            </Button>
            <Button size="sm" variant="ghost" onClick={handleLater}>
              Plus tard
            </Button>
          </>
        }
      >
        <p>{copy.body}</p>
      </AlmaBubble>
    </div>
  );
}

export default AlmaFirstMeeting;
