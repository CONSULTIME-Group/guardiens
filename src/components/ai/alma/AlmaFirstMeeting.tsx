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
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { AlmaAnimated } from "./AlmaAnimated";
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
    <div className="mb-4 relative rounded-2xl border border-primary/20 bg-card text-card-foreground p-5 md:p-6">
      <button
        type="button"
        onClick={handleLater}
        className="absolute right-1 top-1 flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition"
        aria-label="Masquer Alma"
      >
        <span className="text-lg leading-none" aria-hidden="true">×</span>
      </button>
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-5 pr-10">
        <div className="shrink-0 inline-flex items-center justify-center rounded-full ring-2 ring-primary/30 bg-background">
          <AlmaAnimated size={88} />
        </div>
        <div className="flex-1 min-w-0 space-y-3 text-center sm:text-left">
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-primary/80">
              Alma
            </span>
            <p className="text-base font-semibold text-foreground leading-snug mt-0.5">
              Bonjour, je suis Alma.
            </p>
          </div>
          <p className="text-sm text-foreground/90 leading-relaxed">{copy.body}</p>
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
            <Button size="sm" onClick={handlePrimary}>
              {copy.primaryLabel}
            </Button>
            <Button size="sm" variant="ghost" onClick={handleLater}>
              Plus tard
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AlmaFirstMeeting;
