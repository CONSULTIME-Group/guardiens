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
import { useLocation, useNavigate } from "react-router-dom";
import { ChevronDown, Sparkles, X, MoreHorizontal, Check, EyeOff, Lightbulb, Route } from "lucide-react";
import { cn } from "@/lib/utils";
import { AlmaAvatarAnimated } from "./AlmaAvatarAnimated";
import { useAlma } from "@/contexts/AlmaContext";
import { useAlmaFrequency, type AlmaFrequency } from "@/hooks/useAlmaFrequency";
import { useAlmaHidden } from "@/hooks/useAlmaHidden";
import { useAlmaEvolution, type AlmaStage } from "@/hooks/useAlmaEvolution";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { trackEvent } from "@/lib/analytics";
import { resolveAlmaCtaHref } from "@/lib/alma/cta-actions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
      ctaTo: activeRole === "sitter" ? "/profile" : "/owner-profile",
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

function surfaceFromPath(
  pathname: string,
  activeRole?: "owner" | "sitter",
): string {
  if (pathname.startsWith("/dashboard")) {
    return activeRole === "sitter" ? "sitter_dashboard" : "owner_dashboard";
  }
  if (pathname === "/sits" || pathname === "/sits/") return "sits_list";
  if (pathname.startsWith("/sits/")) return "sit_detail";
  if (pathname === "/favoris") return "favorites";
  if (pathname.startsWith("/recherche-gardiens")) return "search_page";
  if (pathname.startsWith("/gardiens/")) return "sitter_profile";
  if (pathname.startsWith("/petites-missions")) return "mutual_aid";
  return "listings";
}

const FREQUENCY_CHOICES: { value: AlmaFrequency; label: string }[] = [
  { value: "silent", label: "Silencieuse" },
  { value: "low", label: "Peu bavarde" },
  { value: "balanced", label: "Modéré (recommandé)" },
  { value: "talkative", label: "Bavarde" },
];

export function AlmaDock() {
  const { currentWhisper, dismissCurrent, requestNextTip } = useAlma();
  const { frequency, setFrequency } = useAlmaFrequency();
  const { hidden, setHidden } = useAlmaHidden();
  const { activeRole } = useAuth();
  const { data: evolution } = useAlmaEvolution();
  const isModalOpen = useIsRadixModalOpen();
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();

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

  const changeFrequency = useCallback(
    async (next: AlmaFrequency) => {
      if (next === frequency) return;
      await setFrequency(next);
      trackEvent("alma_frequency_changed", {
        metadata: { from: frequency, to: next, source: "dock_menu" },
      });
      if (next === "silent") {
        setExpanded(false);
        setUserCollapsed(true);
      }
    },
    [frequency, setFrequency],
  );

  const handleHide = useCallback(async () => {
    await setHidden(true);
    trackEvent("alma_frequency_changed" as any, {
      metadata: { hidden: true, source: "dock_menu", action: "hide" },
    });

    toast({
      title: "Alma est masquée.",
      description: "Vous pouvez la réafficher dans Réglages, section Alma.",
    });
  }, [setHidden, toast]);

  const collapse = () => {
    setExpanded(false);
    setUserCollapsed(true);
    if (whisper) doDismiss("closed_manually");
  };


  const mood = whisper?.primaryAction ? "attentive" : "idle";
  const proposition = !whisper && !isSilent ? buildProposition(evolution, activeRole) : null;
  const stage = evolution?.stage ?? null;
  const avatarSize = stage
    ? ({ nouvelle: 36, eveillee: 40, complice: 42, fidele: 44 } as const)[stage]
    : 36;

  // Action utilisateur : demande explicite d'un conseil. Contourne le quota
  // de session proactif et le verrou de surface (initiée par l'utilisateur),
  // et affiche un repli bienveillant si tout a déjà été vu.
  const askForTip = useCallback(
    (source: "popover" | "proposition") => {
      trackEvent("alma_whisper_action_clicked", {
        metadata: { whisper_type: "on_demand_tip", action_id: `on_demand_${source}` },
      });
      void requestNextTip({
        surface: surfaceFromPath(location.pathname, activeRole),
        preferNudge: false,
        onDemand: true,
        emptyMessage: "Rien de neuf pour l'instant, revenez un peu plus tard.",
      });
      setExpanded(true);

      setUserCollapsed(false);
    },
    [location.pathname, activeRole, requestNextTip],
  );

  if (isModalOpen) return null;
  if (hidden) return null;





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
                      surface: surfaceFromPath(location.pathname, activeRole),
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

      {/* Panneau de proposition permanente (aucun whisper actif) */}
      {expanded && !whisper && proposition && (
        <div
          role="status"
          className={cn(
            "pointer-events-auto mb-2 w-[min(20rem,calc(100vw-1.5rem))]",
            "rounded-2xl border border-border bg-card text-card-foreground shadow-lg",
            "p-3 pr-9 relative",
            "animate-in slide-in-from-bottom-2 fade-in duration-300",
          )}
        >
          <button
            type="button"
            onClick={() => { setExpanded(false); setUserCollapsed(true); }}
            className="absolute right-1 top-1 flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition"
            aria-label="Fermer la proposition d'Alma"
          >
            <X className="h-3.5 w-3.5" />
          </button>
          <p className="text-[13px] leading-snug text-foreground/90">
            {proposition.message}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => { navigate(proposition.ctaTo); setExpanded(false); }}
              className="rounded-full bg-primary text-primary-foreground text-xs font-semibold px-3 py-1.5 hover:bg-primary/90 transition"
            >
              {proposition.ctaLabel}
            </button>
            <button
              type="button"
              onClick={() => askForTip("proposition")}
              className="min-h-11 rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Un conseil ?
            </button>
          </div>
        </div>
      )}

      {/* Dock replié (avatar + label + contrôles) */}
      <div
        className={cn(
          "relative pointer-events-auto flex items-center gap-2 rounded-full pl-1.5 pr-2 py-1.5",
          "bg-card/95 backdrop-blur border border-border shadow-lg",
        )}
      >
        {/* Wrapper relatif autour de l'avatar : la pastille de stade
            et l'indicateur whisper sont positionnés par rapport à
            cette zone, qui a exactement la taille de l'avatar. */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setExpanded((v) => !v);
              if (expanded) setUserCollapsed(true);
              else setUserCollapsed(false);
            }}
            className="relative inline-flex flex-col items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={
              whisper
                ? "Voir le message d'Alma"
                : proposition
                ? "Voir la proposition d'Alma"
                : "Ouvrir Alma"
            }
            aria-expanded={expanded}
          >
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
              size={avatarSize}
              mood={isSilent ? "sleepy" : (mood === "attentive" ? "attentive" : "idle")}
              stage={stage ?? undefined}
            />
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
          </button>

          {/* Indicateur "message en attente" : haut gauche, couleur
              warning distincte du vert, taille légèrement supérieure. */}
          {whisper && !expanded && (
            <span
              aria-hidden
              className="absolute -top-1 left-0 h-3 w-3 rounded-full bg-warning ring-2 ring-card"
            />
          )}

          {/* Pastille de stade : simple indicateur non interactif. Le contrôle
              passe désormais par le menu unique ci-dessous. */}
          {stage && (
            <span
              aria-hidden
              title={`Alma · ${STAGE_SHORT_LABEL[stage]}`}
              className={cn(
                "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-card",
                STAGE_DOT_CLASS[stage],
              )}
            />
          )}
        </div>

        {/* Label Alma / stade (déclencheur du panneau) */}
        <button
          type="button"
          tabIndex={-1}
          onClick={() => {
            setExpanded((v) => !v);
            if (expanded) setUserCollapsed(true);
            else setUserCollapsed(false);
          }}
          className="flex flex-col items-start leading-tight pr-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-hidden
        >
          <span className="text-xs font-semibold text-foreground/80">Alma</span>
          <span className="text-[10px] font-medium text-muted-foreground">
            {stage ? STAGE_SHORT_LABEL[stage] : "votre assistante"}
          </span>
        </button>

        <div className="h-6 w-px bg-border/70" aria-hidden />

        {/* Menu unique : parcours, conseil, fréquence, masquer. */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Options d'Alma"
              className="flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <MoreHorizontal className="h-5 w-5" aria-hidden />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="end" className="w-72" sideOffset={12}>
            <DropdownMenuLabel className="pb-1">
              <div className="flex items-center gap-2">
                {stage && (
                  <span
                    aria-hidden
                    className={cn("h-2.5 w-2.5 rounded-full", STAGE_DOT_CLASS[stage])}
                  />
                )}
                <span className="text-sm font-semibold text-foreground">
                  {stage ? `Alma, stade ${STAGE_SHORT_LABEL[stage]}` : "Alma, votre assistante"}
                </span>
              </div>
              {evolution?.nextMilestone && (
                <p className="mt-1 text-xs font-normal text-muted-foreground leading-snug">
                  {evolution.nextMilestone}
                </p>
              )}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="min-h-11 cursor-pointer"
              onSelect={() => navigate("/alma")}
            >
              <Route className="mr-2 h-4 w-4" aria-hidden />
              <span>Mon parcours</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="min-h-11 cursor-pointer"
              onSelect={(e) => {
                e.preventDefault();
                askForTip("popover");
              }}
            >
              <Lightbulb className="mr-2 h-4 w-4" aria-hidden />
              <span>Un conseil ?</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">
              Fréquence
            </DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={frequency}
              onValueChange={(v) => {
                void changeFrequency(v as AlmaFrequency);
              }}
            >
              {FREQUENCY_CHOICES.map((c) => (
                <DropdownMenuRadioItem
                  key={c.value}
                  value={c.value}
                  className="min-h-11 cursor-pointer text-sm"
                >
                  {c.label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="min-h-11 cursor-pointer text-destructive focus:text-destructive"
              onSelect={(e) => {
                e.preventDefault();
                void handleHide();
              }}
            >
              <EyeOff className="mr-2 h-4 w-4" aria-hidden />
              <span>Masquer Alma</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {expanded && whisper && (
          <button
            type="button"
            onClick={collapse}
            className="flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
