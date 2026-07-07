/**
 * <AlmaWhisper /> — petite bulle non bloquante émise par la narratrice Alma
 * au fil de la navigation. Slide-in bottom-right desktop, bottom (au-dessus de
 * BottomNav) mobile.
 *
 * Timer d'auto-dismiss :
 *   - 20 s par défaut (25 s cultural côté trigger).
 *   - Pour les faits culturels sur mobile : 30 s, et le timer ne démarre qu'au
 *     premier scroll ou à la première interaction utilisateur.
 *   - Pausé sur focus / pointerenter / touchstart de la bulle, repris sur
 *     blur / pointerleave.
 *
 * Z-index : la bulle est en z-40 pour rester sous les overlays Radix (Dialog,
 * Sheet en z-50). En plus, si un modal Radix est ouvert, on masque totalement
 * la bulle.
 *
 * <AlmaWhisperOutlet /> — monté dans AppLayout, s'abonne à AlmaContext et
 * affiche currentWhisper.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { AlmaAvatar } from "./AlmaAvatar";
import { useAlma } from "@/contexts/AlmaContext";
import { trackEvent } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import { resolveAlmaCtaHref } from "@/lib/alma/cta-actions";
import type { AlmaWhisper as AlmaWhisperT } from "@/lib/alma/whisper-types";

interface AlmaWhisperCardProps {
  whisper: AlmaWhisperT;
  onDismiss: (reason: "closed_manually" | "timeout" | "action_clicked") => void;
  onRequestNext?: () => void;
}

function isMobileViewport(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(max-width: 767px)").matches;
}

function AlmaWhisperCard({ whisper, onDismiss, onRequestNext }: AlmaWhisperCardProps) {
  const timerRef = useRef<number | null>(null);
  const remainingRef = useRef<number>(0);
  const startedAtRef = useRef<number>(0);
  const pausedRef = useRef<boolean>(false);

  const isMobile = isMobileViewport();
  const isCulturalMobile = whisper.type === "cultural_fact" && isMobile;
  // Cultural sur mobile : 30 s, et démarrage différé (attente d'une interaction).
  // Sinon : whisper.autoDismissMs ou 20 s par défaut.
  const totalDelay = isCulturalMobile ? 30_000 : whisper.autoDismissMs ?? 20_000;

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTimer = useCallback(
    (ms: number) => {
      clearTimer();
      remainingRef.current = ms;
      startedAtRef.current = Date.now();
      timerRef.current = window.setTimeout(() => onDismiss("timeout"), ms);
    },
    [clearTimer, onDismiss],
  );

  const pauseTimer = useCallback(() => {
    if (pausedRef.current || timerRef.current === null) return;
    const elapsed = Date.now() - startedAtRef.current;
    remainingRef.current = Math.max(0, remainingRef.current - elapsed);
    clearTimer();
    pausedRef.current = true;
  }, [clearTimer]);

  const resumeTimer = useCallback(() => {
    if (!pausedRef.current) return;
    pausedRef.current = false;
    startTimer(remainingRef.current > 0 ? remainingRef.current : totalDelay);
  }, [startTimer, totalDelay]);

  useEffect(() => {
    pausedRef.current = false;

    if (isCulturalMobile) {
      // Le timer ne démarre qu'à la première interaction utilisateur.
      let started = false;
      const startOnce = () => {
        if (started) return;
        started = true;
        startTimer(totalDelay);
        window.removeEventListener("scroll", startOnce);
        window.removeEventListener("touchstart", startOnce);
        window.removeEventListener("pointerdown", startOnce);
        window.removeEventListener("keydown", startOnce);
      };
      window.addEventListener("scroll", startOnce, { passive: true });
      window.addEventListener("touchstart", startOnce, { passive: true });
      window.addEventListener("pointerdown", startOnce, { passive: true });
      window.addEventListener("keydown", startOnce);
      return () => {
        clearTimer();
        window.removeEventListener("scroll", startOnce);
        window.removeEventListener("touchstart", startOnce);
        window.removeEventListener("pointerdown", startOnce);
        window.removeEventListener("keydown", startOnce);
      };
    }

    startTimer(totalDelay);
    return () => {
      clearTimer();
    };
  }, [whisper.id, isCulturalMobile, totalDelay, startTimer, clearTimer]);

  const handleAction = (
    onClick: () => void,
    actionId: string,
  ) => {
    trackEvent("alma_whisper_action_clicked", {
      metadata: { whisper_type: whisper.type, action_id: actionId },
    });
    onClick();
    onDismiss("action_clicked");
  };

  return (
    <div
      role="status"
      aria-live="polite"
      data-whisper-type={whisper.type}
      onPointerEnter={pauseTimer}
      onPointerLeave={resumeTimer}
      onTouchStart={pauseTimer}
      onFocusCapture={pauseTimer}
      onBlurCapture={resumeTimer}
      className={cn(
        "fixed z-40 pointer-events-auto",
        "left-3 right-3 md:left-auto md:right-6",
        "bottom-24 md:bottom-6",
        "md:max-w-sm",
        "animate-in slide-in-from-bottom-4 fade-in duration-300",
      )}
    >
      <div className="relative rounded-2xl border border-primary/20 bg-card text-card-foreground shadow-lg p-3">
        <button
          type="button"
          onClick={() => onDismiss("closed_manually")}
          className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition"
          aria-label="Fermer le message d'Alma"
        >
          <X className="h-3.5 w-3.5" />
        </button>
        <div className="flex items-start gap-2 pr-10">

          <div className="text-primary shrink-0">
            <AlmaAvatar size={32} mood={whisper.primaryAction ? "attentive" : "idle"} />
          </div>
          <div className="flex-1 min-w-0 space-y-2">
            <p className="text-[13px] leading-snug text-foreground/90 whitespace-pre-line">{whisper.message}</p>
            {(whisper.primaryAction || whisper.secondaryAction || whisper.allowNextTip) && (
              <div className="flex flex-wrap items-center gap-2">
                {whisper.primaryAction && (
                  <button
                    type="button"
                    onClick={() =>
                      handleAction(
                        whisper.primaryAction!.onClick,
                        whisper.primaryAction!.actionId,
                      )
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
                {whisper.allowNextTip && onRequestNext && (
                  <button
                    type="button"
                    onClick={() => {
                      trackEvent("alma_whisper_action_clicked", {
                        metadata: { whisper_type: whisper.type, action_id: "next_tip" },
                      });
                      onRequestNext();
                    }}
                    className="text-xs font-medium text-muted-foreground hover:text-foreground transition underline decoration-dotted underline-offset-2"
                  >
                    Un autre conseil
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Détecte la présence d'un overlay Radix ouvert (Dialog, Sheet, AlertDialog…).
 * On observe le body pour réagir à l'ouverture/fermeture, et on vérifie deux
 * signaux robustes utilisés par Radix :
 *   - un élément avec [role="dialog"][data-state="open"]
 *   - un overlay Radix ouvert ([data-radix-dialog-overlay], data-state="open")
 * En complément, Radix pose `data-scroll-locked` sur le body à l'ouverture.
 */
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

/**
 * Résout la surface générique à partir de l'URL courante pour piloter
 * requestNextTip depuis le bouton « Un autre conseil ».
 */
function surfaceFromPath(pathname: string): string {
  if (pathname === "/dashboard" || pathname.startsWith("/dashboard")) return "owner_dashboard";
  if (pathname === "/sits" || pathname === "/sits/") return "sits_list";
  if (pathname.startsWith("/sits/")) return "sit_detail";
  if (pathname === "/favoris") return "favorites";
  if (pathname.startsWith("/recherche-gardiens")) return "search_page";
  if (pathname.startsWith("/gardiens/")) return "sitter_profile";
  if (pathname.startsWith("/petites-missions")) return "mutual_aid";
  return "listings";
}

export function AlmaWhisperOutlet() {
  const { currentWhisper, dismissCurrent, requestNextTip } = useAlma();
  const isModalOpen = useIsRadixModalOpen();
  const location = useLocation();
  const navigate = useNavigate();
  if (!currentWhisper) return null;
  if (isModalOpen) return null;

  // Intercept CTA usage_nudge : si primaryAction pointe vers une action
  // sémantique connue, on route via React Router. Sinon on laisse le onClick
  // câblé par le builder (culturel : ouverture source externe).
  const ctaAction = (currentWhisper.metadata as any)?.cta_action as string | undefined;
  const href = resolveAlmaCtaHref(ctaAction);
  const whisper: AlmaWhisperT =
    href && currentWhisper.primaryAction
      ? {
          ...currentWhisper,
          primaryAction: {
            ...currentWhisper.primaryAction,
            onClick: () => navigate(href),
          },
        }
      : currentWhisper;

  return (
    <AlmaWhisperCard
      whisper={whisper}
      onDismiss={(reason) => dismissCurrent(reason)}
      onRequestNext={() => {
        void requestNextTip({
          surface: surfaceFromPath(location.pathname),
          preferNudge: false,
        });
      }}
    />
  );
}

export default AlmaWhisperOutlet;
