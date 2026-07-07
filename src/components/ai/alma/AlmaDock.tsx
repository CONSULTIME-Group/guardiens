/**
 * <AlmaDock /> — présence persistante d'Alma en bas à droite.
 *
 * Remplace le rendu flottant indépendant des whispers (ancien AlmaWhisperOutlet).
 * Le dock est monté une seule fois dans AppLayout (surfaces authentifiées).
 *
 * - État REPLIÉ : avatar Alma (image PNG réelle) posé dans un contenant arrondi
 *   avec ombre de contact (grounded), petit label « Alma », animation de
 *   respiration continue en motion-safe. Frétillement au survol.
 * - État DÉPLIÉ : panneau au-dessus du dock affichant currentWhisper (message,
 *   action principale, dismiss). Se déplie automatiquement quand un whisper
 *   apparaît, se replie sur dismiss ou au clic sur le chevron.
 * - Bouton silence : bascule profiles.alma_frequency entre "silent" et
 *   "balanced". En silence, le dock reste visible mais ne s'ouvre plus tout seul.
 *
 * Ne change AUCUNE logique du scheduler (canEmit, queue, dismissCurrent).
 * Ne rend jamais AlmaAvatarLottie.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { BellOff, Bell, ChevronDown, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { AlmaAvatarAnimated } from "./AlmaAvatarAnimated";
import { useAlma } from "@/contexts/AlmaContext";
import { useAlmaFrequency } from "@/hooks/useAlmaFrequency";
import { useAlmaEvolution, type AlmaStage } from "@/hooks/useAlmaEvolution";
import { useAuth } from "@/contexts/AuthContext";
import { trackEvent } from "@/lib/analytics";
import { resolveAlmaCtaHref } from "@/lib/alma/cta-actions";
import type { AlmaWhisper as AlmaWhisperT, AlmaDismissReason } from "@/lib/alma/whisper-types";

const STAGE_DOT_CLASS: Record<AlmaStage, string> = {
  nouvelle: "bg-muted-foreground/70",
  eveillee: "bg-sky-500",
  complice: "bg-primary",
  fidele: "bg-amber-500",
};

const STAGE_SHORT_LABEL: Record<AlmaStage, string> = {
  nouvelle: "Nouvelle",
  eveillee: "Éveillée",
  complice: "Complice",
  fidele: "Fidèle",
};

interface Proposition {
  message: string;
  ctaLabel: string;
  ctaTo: string;
}

function buildProposition(
  evolution: ReturnType<typeof useAlmaEvolution>["data"],
  activeRole: "owner" | "sitter",
): Proposition | null {
  if (!evolution) return null;
  const { signals } = evolution;

  if (signals.profileCompletion < 60) {
    return {
      message: "Complétons votre profil pour qu'Alma vous accompagne mieux.",
      ctaLabel: "Compléter mon profil",
      ctaTo: activeRole === "sitter" ? "/sitter-profile" : "/owner-profile",
    };
  }
  if (!signals.identityVerified) {
    return {
      message: "Vérifions votre identité pour rassurer la communauté.",
      ctaLabel: "Vérifier mon identité",
      ctaTo: "/settings#verification",
    };
  }
  if (activeRole === "owner") {
    if (signals.hasDraftSit) {
      return {
        message: "Reprenons votre brouillon d'annonce, il n'attend que vous.",
        ctaLabel: "Reprendre le brouillon",
        ctaTo: "/sits",
      };
    }
    if (signals.publishedSitsCount === 0) {
      return {
        message: "Publions votre première annonce pour trouver une personne de confiance.",
        ctaLabel: "Créer une annonce",
        ctaTo: "/sits/create",
      };
    }
  } else {
    if (signals.applicationsCount === 0) {
      return {
        message: "Trouvons une garde qui vous ressemble près de chez vous.",
        ctaLabel: "Voir les annonces",
        ctaTo: "/annonces",
      };
    }
  }
  return {
    message: "Vous êtes bien lancé. Envie d'un conseil du jour ?",
    ctaLabel: "Explorer les conseils",
    ctaTo: "/conseils",
  };
}



function useIsRadixModalOpen(): boolean {
  const [isOpen, setIsOpen] = useState(false);
  useEffect(() => {
    if (typeof document === "undefined") return;
    const compute = () => {
      const hasOpenDialog =
        document.querySelector('[role="dialog"][data-state="open"]') !== null ||
        document.querySelector('[role="alertdialog"][data-state="open"]') !== null;
      const hasOpenOverlay =
        document.querySelector('[data-radix-dialog-overlay][data-state="open"]') !== null ||
        document.querySelector('[data-radix-alert-dialog-overlay][data-state="open"]') !== null;
      const bodyLocked = document.body.hasAttribute("data-scroll-locked");
      setIsOpen(hasOpenDialog || hasOpenOverlay || bodyLocked);
    };
    compute();
    const mo = new MutationObserver(compute);
    mo.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["data-state", "data-scroll-locked"],
    });
    return () => mo.disconnect();
  }, []);
  return isOpen;
}

function surfaceFromPath(pathname: string): string {
  if (pathname.startsWith("/dashboard")) return "owner_dashboard";
  if (pathname === "/sits" || pathname === "/sits/") return "sits_list";
  if (pathname.startsWith("/sits/")) return "sit_detail";
  if (pathname === "/favoris") return "favorites";
  if (pathname.startsWith("/recherche-gardiens")) return "search_page";
  if (pathname.startsWith("/gardiens/")) return "sitter_profile";
  if (pathname.startsWith("/petites-missions")) return "mutual_aid";
  return "listings";
}

export function AlmaDock() {
  const { currentWhisper, dismissCurrent, requestNextTip } = useAlma();
  const { frequency, setFrequency } = useAlmaFrequency();
  const isModalOpen = useIsRadixModalOpen();
  const location = useLocation();
  const navigate = useNavigate();

  const [expanded, setExpanded] = useState(false);
  const [userCollapsed, setUserCollapsed] = useState(false);

  // Auto-timer d'auto-dismiss pour le whisper courant.
  const timerRef = useRef<number | null>(null);
  const remainingRef = useRef<number>(0);
  const startedAtRef = useRef<number>(0);
  const pausedRef = useRef<boolean>(false);

  const isSilent = frequency === "silent";

  // Ouvre le dock automatiquement à l'arrivée d'un whisper (sauf si l'utilisateur
  // a explicitement replié et qu'aucun nouveau whisper n'est venu depuis).
  useEffect(() => {
    if (currentWhisper) {
      setExpanded(true);
      setUserCollapsed(false);
    } else if (userCollapsed) {
      setExpanded(false);
    }
  }, [currentWhisper?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const doDismiss = useCallback(
    (reason: AlmaDismissReason) => {
      dismissCurrent(reason);
    },
    [dismissCurrent],
  );

  // Auto-dismiss timer (20s défaut, ou whisper.autoDismissMs).
  useEffect(() => {
    if (!currentWhisper) {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = null;
      return;
    }
    const total = currentWhisper.autoDismissMs ?? 20_000;
    pausedRef.current = false;
    remainingRef.current = total;
    startedAtRef.current = Date.now();
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => doDismiss("timeout"), total);
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = null;
    };
  }, [currentWhisper?.id, doDismiss]); // eslint-disable-line react-hooks/exhaustive-deps

  const pauseTimer = () => {
    if (pausedRef.current || !timerRef.current) return;
    const elapsed = Date.now() - startedAtRef.current;
    remainingRef.current = Math.max(0, remainingRef.current - elapsed);
    window.clearTimeout(timerRef.current);
    timerRef.current = null;
    pausedRef.current = true;
  };
  const resumeTimer = () => {
    if (!pausedRef.current || !currentWhisper) return;
    pausedRef.current = false;
    startedAtRef.current = Date.now();
    timerRef.current = window.setTimeout(
      () => doDismiss("timeout"),
      remainingRef.current > 0 ? remainingRef.current : 20_000,
    );
  };

  if (isModalOpen) return null;

  // Résolution du CTA principal (route interne le cas échéant).
  const whisper: AlmaWhisperT | null = (() => {
    if (!currentWhisper) return null;
    const ctaAction = (currentWhisper.metadata as any)?.cta_action as string | undefined;
    const href = resolveAlmaCtaHref(ctaAction);
    if (href && currentWhisper.primaryAction) {
      return {
        ...currentWhisper,
        primaryAction: {
          ...currentWhisper.primaryAction,
          onClick: () => navigate(href),
        },
      };
    }
    return currentWhisper;
  })();

  const handleAction = (onClick: () => void, actionId: string) => {
    if (!whisper) return;
    trackEvent("alma_whisper_action_clicked", {
      metadata: { whisper_type: whisper.type, action_id: actionId },
    });
    onClick();
    doDismiss("action_clicked");
  };

  const toggleSilence = async () => {
    const next = isSilent ? "balanced" : "silent";
    await setFrequency(next);
    trackEvent("alma_frequency_changed", {
      metadata: { from: frequency, to: next, source: "dock" },
    });
    if (next === "silent") {
      setExpanded(false);
      setUserCollapsed(true);
    }
  };

  const collapse = () => {
    setExpanded(false);
    setUserCollapsed(true);
    if (whisper) doDismiss("closed_manually");
  };

  const mood = whisper?.primaryAction ? "attentive" : "idle";

  return (
    <div
      className={cn(
        "fixed z-40 pointer-events-none",
        "right-3 md:right-6",
      )}
      style={{
        bottom: "calc(env(safe-area-inset-bottom, 0px) + 5rem)",
      }}
    >
      {/* Panneau déplié */}
      {expanded && whisper && (
        <div
          role="status"
          aria-live="polite"
          data-whisper-type={whisper.type}
          onPointerEnter={pauseTimer}
          onPointerLeave={resumeTimer}
          onFocusCapture={pauseTimer}
          onBlurCapture={resumeTimer}
          className={cn(
            "pointer-events-auto mb-2 w-[min(20rem,calc(100vw-1.5rem))]",
            "rounded-2xl border border-primary/20 bg-card text-card-foreground shadow-xl",
            "p-3 pr-9 relative",
            "animate-in slide-in-from-bottom-2 fade-in duration-300",
          )}
        >
          <button
            type="button"
            onClick={() => doDismiss("closed_manually")}
            className="absolute right-1 top-1 flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition"
            aria-label="Fermer le message d'Alma"
          >
            <X className="h-3.5 w-3.5" />
          </button>
          <p className="text-[13px] leading-snug text-foreground/90 whitespace-pre-line">
            {whisper.message}
          </p>
          {(whisper.primaryAction || whisper.secondaryAction || whisper.allowNextTip) && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {whisper.primaryAction && (
                <button
                  type="button"
                  onClick={() =>
                    handleAction(whisper.primaryAction!.onClick, whisper.primaryAction!.actionId)
                  }
                  className="rounded-full bg-primary text-primary-foreground text-xs font-semibold px-3 py-1.5 hover:bg-primary/90 transition"
                >
                  {whisper.primaryAction.label}
                </button>
              )}
              {whisper.secondaryAction && (
                <button
                  type="button"
                  onClick={() =>
                    handleAction(
                      whisper.secondaryAction!.onClick,
                      whisper.secondaryAction!.actionId,
                    )
                  }
                  className="text-xs font-medium text-muted-foreground hover:text-foreground transition"
                >
                  {whisper.secondaryAction.label}
                </button>
              )}
              {whisper.allowNextTip && (
                <button
                  type="button"
                  onClick={() => {
                    trackEvent("alma_whisper_action_clicked", {
                      metadata: { whisper_type: whisper.type, action_id: "next_tip" },
                    });
                    void requestNextTip({
                      surface: surfaceFromPath(location.pathname),
                      preferNudge: false,
                    });
                  }}
                  className="text-xs font-medium text-muted-foreground hover:text-foreground transition underline decoration-dotted underline-offset-2"
                >
                  Un autre conseil
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Dock replié (avatar + label + contrôles) */}
      <div
        className={cn(
          "pointer-events-auto flex items-center gap-2 rounded-full pl-1.5 pr-2 py-1.5",
          "bg-card/95 backdrop-blur border border-border shadow-lg",
        )}
      >
        <button
          type="button"
          onClick={() => {
            if (whisper) {
              setExpanded((v) => !v);
              if (expanded) setUserCollapsed(true);
              else setUserCollapsed(false);
            }
          }}
          className="relative flex items-center gap-2 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={whisper ? "Voir le message d'Alma" : "Alma est en veille"}
          aria-expanded={expanded}
        >
          {/* Avatar avec aura pulsante + ombre de contact + accent Sparkles */}
          <span className="relative inline-flex flex-col items-center">
            {/* Aura : signale une présence active. Cadence plus rapide si un
               whisper actionnable est en attente. Masquée en silence. */}
            {!isSilent && (
              <span
                aria-hidden
                className={cn(
                  "absolute inset-0 -m-1 rounded-full bg-primary/25 blur-md",
                  whisper
                    ? "motion-safe:animate-alma-aura-fast"
                    : "motion-safe:animate-alma-aura",
                )}
              />
            )}
            <AlmaAvatarAnimated
              size={40}
              mood={isSilent ? "sleepy" : (mood === "attentive" ? "attentive" : "idle")}
            />
            {/* Accent scintillant, toujours accolé à l'avatar */}
            {!isSilent && (
              <Sparkles
                aria-hidden
                className="absolute -top-0.5 -right-0.5 h-3 w-3 text-primary drop-shadow-sm motion-safe:animate-alma-aura"
              />
            )}
            <span
              aria-hidden
              className="absolute -bottom-0.5 h-1.5 w-8 rounded-full bg-foreground/25 blur-[3px]"
            />
          </span>
          <span className="flex flex-col items-start leading-tight pr-1">
            <span className="text-xs font-semibold text-foreground/80">Alma</span>
            <span className="text-[10px] font-medium text-muted-foreground">
              votre assistante
            </span>
          </span>
          {whisper && !expanded && (
            <span
              aria-hidden
              className="absolute -top-0.5 right-0 h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-card"
            />
          )}
        </button>

        <div className="h-6 w-px bg-border/70" aria-hidden />

        <button
          type="button"
          onClick={toggleSilence}
          className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition"
          aria-label={isSilent ? "Réactiver Alma" : "Mettre Alma en silence"}
          aria-pressed={isSilent}
          title={isSilent ? "Alma est en silence" : "Mettre Alma en silence"}
        >
          {isSilent ? <BellOff className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
        </button>

        {expanded && whisper && (
          <button
            type="button"
            onClick={collapse}
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition"
            aria-label="Replier Alma"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

export default AlmaDock;
