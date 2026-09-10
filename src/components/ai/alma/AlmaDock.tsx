/**
 * <AlmaDock />, présence persistante d'Alma en bas à droite.
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
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ChevronDown, Sparkles, X, MoreHorizontal, Check, EyeOff, Lightbulb, Route, MessageCircle, Mic, Send, Square } from "lucide-react";
import { AlmaConversation } from "./AlmaConversation";
import {
  getAlmaConversationState,
  openAlmaConversation,
  sendAlmaMessage,
  subscribeAlmaConversation,
} from "@/lib/alma/conversation-store";
import { autoDismissDelay, shouldScheduleAutoDismiss } from "@/lib/alma/auto-dismiss";
import { composerPlaceholder, resolvePanelLine } from "@/lib/alma/dock-panel";
import { useAlmaVoiceInput } from "@/hooks/useAlmaVoiceInput";
import { cn } from "@/lib/utils";
import { AlmaAvatarAnimated } from "./AlmaAvatarAnimated";
import { useAlmaMood } from "@/hooks/useAlmaMood";
import { useAlma } from "@/contexts/AlmaContext";
import { useAlmaFrequency, type AlmaFrequency } from "@/hooks/useAlmaFrequency";
import { useAlmaHidden } from "@/hooks/useAlmaHidden";
import { useAlmaEvolution, type AlmaStage } from "@/hooks/useAlmaEvolution";
import { MIN_COMPLETION_TO_APPLY } from "@/hooks/useAccessLevel";
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

// Libellé court affiché sous l'avatar Alma. La clé technique « complice »
// est conservée pour la rétrocompat BDD, seul le rendu FR change en « Proche ».
const STAGE_SHORT_LABEL: Record<AlmaStage, string> = {
  nouvelle: "Nouvelle",
  eveillee: "Éveillée",
  complice: "Proche",
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

  if (signals.profileCompletion < MIN_COMPLETION_TO_APPLY) {
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
      ctaTo: "/settings?section=security&src=alma_dock",
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
    if (signals.publishedSitsCount === 0 && signals.allSitsCount === 0) {
      return {
        message: "Publions votre première annonce pour trouver une personne de confiance.",
        ctaLabel: "Publier une annonce",
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
  // Aucune proposition de repli : l'ancien CTA vers /conseils doublonnait
  // avec « Un conseil ? » du menu. Sans signal, le panneau affiche l'humeur.
  return null;
}



function useIsRadixModalOpen(): boolean {
  const [isOpen, setIsOpen] = useState(false);
  useEffect(() => {
    if (typeof document === "undefined") return;
    const compute = () => {
      // On ne considère comme "modale bloquante" que les vraies dialog /
      // alertdialog Radix. Les DropdownMenu / Popover (role="menu") ne
      // doivent PAS démonter le dock, sinon le menu d'Alma se ferme
      // instantanément à l'ouverture et ses items deviennent incliquables.
      const hasOpenDialog =
        document.querySelector('[role="dialog"][data-state="open"]') !== null ||
        document.querySelector('[role="alertdialog"][data-state="open"]') !== null;
      const hasOpenOverlay =
        document.querySelector('[data-radix-dialog-overlay][data-state="open"]') !== null ||
        document.querySelector('[data-radix-alert-dialog-overlay][data-state="open"]') !== null;
      setIsOpen(hasOpenDialog || hasOpenOverlay);
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

// Source unique : `src/lib/alma/surfaces.ts`, partagée avec le diagnostic admin.
export { surfaceFromPath } from "@/lib/alma/surfaces";
import { surfaceFromPath } from "@/lib/alma/surfaces";

const FREQUENCY_CHOICES: { value: AlmaFrequency; label: string }[] = [
  { value: "silent", label: "Silencieuse" },
  { value: "low", label: "Peu bavarde" },
  { value: "balanced", label: "Modérée (recommandée)" },
  { value: "talkative", label: "Bavarde" },
];

/**
 * Composeur du panneau déplié : champ + micro, toujours visibles.
 * Le premier envoi ouvre le fil (semé de la ligne affichée) puis transmet
 * le message. Jamais d'autofocus : le clavier ne s'ouvre qu'au tap
 * volontaire de la personne.
 */
function DockComposer({
  surface,
  activeRole,
  seed,
}: {
  surface: string;
  activeRole: "owner" | "sitter";
  seed: string;
}) {
  const [draft, setDraft] = useState("");
  const dictatedRef = useRef(false);
  const voice = useAlmaVoiceInput((text) => {
    dictatedRef.current = true;
    setDraft((d) => (d ? `${d} ${text}` : text));
  });

  const submit = () => {
    const text = draft.trim();
    if (!text) return;
    const inputMode = dictatedRef.current ? "voice" : "keyboard";
    dictatedRef.current = false;
    setDraft("");
    openAlmaConversation(seed);
    void sendAlmaMessage({ text, surface, activeRole, inputMode });
  };

  return (
    <div className="mt-2 flex items-end gap-2">
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
        }}
        rows={1}
        maxLength={2000}
        placeholder={composerPlaceholder(surface)}
        aria-label="Votre message pour Alma"
        autoFocus={false}
        className="flex-1 resize-none rounded-xl border border-input bg-background px-3 py-2 text-[13px] leading-snug max-h-24 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      {voice.supported && (
        <button
          type="button"
          onClick={voice.toggle}
          disabled={voice.status === "transcribing"}
          aria-label={voice.status === "recording" ? "Arrêter la dictée" : "Dicter votre message"}
          aria-pressed={voice.status === "recording"}
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition",
            voice.status === "recording"
              ? "bg-destructive text-destructive-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          {voice.status === "recording" ? (
            <Square className="h-4 w-4" />
          ) : (
            <Mic className="h-4 w-4" />
          )}
        </button>
      )}
      <button
        type="button"
        onClick={submit}
        disabled={draft.trim().length === 0}
        aria-label="Envoyer à Alma"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-50 transition"
      >
        <Send className="h-4 w-4" />
      </button>
    </div>
  );
}

export function AlmaDock() {
  // Défense en profondeur : ne rien monter pour un visiteur anonyme, même
  // si le composant est appelé hors AppLayout par régression.
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return null;
  return <AlmaDockInner />;
}

function AlmaDockInner() {
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

  // Fil de conversation, stocké hors React pour survivre au démontage du
  // dock provoqué par une modale Radix.
  const conversation = useSyncExternalStore(
    subscribeAlmaConversation,
    getAlmaConversationState,
  );

  // Humeur du jour. Elle vit uniquement dans la ligne de statut et dans la
  // phrase d'ouverture, jamais dans une réponse à une question.
  const almaMood = useAlmaMood({
    silent: frequency === "silent",
    conversationOpen: conversation.open,
  });


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

  // Ouverture programmatique depuis n'importe quelle carte du produit
  // (ex. AlmaRailWhisper). Événement fenêtre volontairement minimal pour
  // éviter un refactor du dock ou l'ajout d'une nouvelle API de contexte.
  useEffect(() => {
    const onOpen = () => {
      setExpanded(true);
      setUserCollapsed(false);
    };
    window.addEventListener("alma:open-dock", onOpen);
    return () => window.removeEventListener("alma:open-dock", onOpen);
  }, []);

  const doDismiss = useCallback(
    (reason: AlmaDismissReason, actionId?: string) => {
      dismissCurrent(reason, actionId);
    },
    [dismissCurrent],
  );


  // Auto-dismiss timer (20s défaut, ou whisper.autoDismissMs).
  // Une conversation ouverte suspend ce timer : le message reste à l'écran,
  // il est devenu le premier message du fil.
  useEffect(() => {
    if (
      !shouldScheduleAutoDismiss({
        hasWhisper: !!currentWhisper,
        conversationOpen: conversation.open,
      })
    ) {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = null;
      return;
    }
    const total = autoDismissDelay(currentWhisper?.autoDismissMs);
    pausedRef.current = false;
    remainingRef.current = total;
    startedAtRef.current = Date.now();
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => doDismiss("timeout"), total);
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = null;
    };
  }, [currentWhisper?.id, conversation.open, doDismiss]); // eslint-disable-line react-hooks/exhaustive-deps

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
    doDismiss("action_clicked", actionId);
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
  const rawProposition = !whisper && !isSilent ? buildProposition(evolution, activeRole) : null;
  // Ne jamais proposer une action qui pointe vers la page courante.
  const proposition = rawProposition && rawProposition.ctaTo.split(/[?#]/)[0] === location.pathname ? null : rawProposition;
  const stage = evolution?.stage ?? null;
  const avatarSize = stage
    ? ({ nouvelle: 36, eveillee: 40, complice: 42, fidele: 44 } as const)[stage]
    : 36;

  const surface = surfaceFromPath(location.pathname, activeRole);
  // Une seule ligne de texte dans le panneau : le whisper prime, puis la
  // proposition contextuelle, puis l'humeur du jour.
  const panelLine = resolvePanelLine({
    whisperMessage: whisper?.message ?? null,
    propositionMessage: proposition?.message ?? null,
    moodLine: isSilent ? null : almaMood.line,
  });

  // Expose l'état déplié via un attribut body : le panneau réserve son
  // espace au lieu de chevaucher le contenu (règle globale sur #main-content
  // dans index.css, plus le opt-in [data-alma-safe-area] de /messages).
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (expanded) {
      document.body.dataset.almaDockExpanded = "true";
    } else {
      delete document.body.dataset.almaDockExpanded;
    }
    return () => {
      delete document.body.dataset.almaDockExpanded;
    };
  }, [expanded]);

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

  // Ouvre le fil. Le whisper courant devient le premier message, sinon
  // c'est la proposition contextuelle déjà calculée qui sert d'amorce.
  const startConversation = () => {
    const seed =
      whisper?.message ??
      proposition?.message ??
      "Je vous écoute. Dites-moi ce que vous cherchez.";
    openAlmaConversation(seed);
    trackEvent("alma_conversation_opened" as any, {
      metadata: { surface: surfaceFromPath(location.pathname, activeRole) },
    });
    setExpanded(true);
    setUserCollapsed(false);
  };

  if (isModalOpen) return null;
  if (hidden) return null;





  return (
    <div
      className={cn(
        "fixed z-40 pointer-events-none flex flex-col items-end",
        "left-3 right-3 md:left-auto md:right-6",
        // Mobile : au-dessus de la BottomNav (h-16 + safe-area) avec marge.
        // Desktop : simple marge basse (pas de BottomNav).
        "bottom-[calc(env(safe-area-inset-bottom,0px)+5.5rem)] md:bottom-6",
      )}
    >
      {/* Fil de conversation, prioritaire sur les panneaux d'un seul message */}
      {expanded && conversation.open && (
        <AlmaConversation
          surface={surfaceFromPath(location.pathname, activeRole)}
          activeRole={activeRole === "owner" ? "owner" : "sitter"}
        />
      )}

      {/* Panneau déplié : une seule ligne de texte, le composeur toujours
          visible, au maximum une action. Le whisper prime sur l'humeur, qui
          se tait. La croix n'existe que sur un whisper, jamais sur une
          humeur. */}
      {expanded && !conversation.open && (
        <div
          role="status"
          aria-live="polite"
          data-testid="alma-dock-panel"
          data-whisper-type={whisper?.type}
          onPointerEnter={whisper ? pauseTimer : undefined}
          onPointerLeave={whisper ? resumeTimer : undefined}
          onFocusCapture={whisper ? pauseTimer : undefined}
          onBlurCapture={whisper ? resumeTimer : undefined}
          className={cn(
            "pointer-events-auto mb-2 w-full md:w-96 relative",
            "rounded-2xl border bg-card text-card-foreground shadow-xl",
            whisper ? "border-primary/20 p-3 pr-9" : "border-border p-3",
            "animate-in slide-in-from-bottom-2 fade-in duration-300",
          )}
        >
          {whisper && (
            <button
              type="button"
              onClick={() => doDismiss("closed_manually")}
              className="absolute right-1 top-1 flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition"
              aria-label="Fermer le message d'Alma"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <p className="text-[13px] leading-snug text-foreground/90 whitespace-pre-line">
            {panelLine}
          </p>
          {whisper?.primaryAction && (
            <div className="mt-2">
              <button
                type="button"
                data-testid="alma-panel-action"
                onClick={() =>
                  handleAction(whisper.primaryAction!.onClick, whisper.primaryAction!.actionId)
                }
                className="rounded-full bg-primary text-primary-foreground text-xs font-semibold px-3 py-1.5 hover:bg-primary/90 transition"
              >
                {whisper.primaryAction.label}
              </button>
            </div>
          )}
          <DockComposer
            surface={surface}
            activeRole={activeRole === "owner" ? "owner" : "sitter"}
            seed={panelLine}
          />
          {!whisper && proposition && (
            <div className="mt-2">
              <button
                type="button"
                data-testid="alma-panel-action"
                onClick={() => { navigate(proposition.ctaTo); setExpanded(false); }}
                className="rounded-full border border-border bg-muted/50 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition"
              >
                {proposition.ctaLabel}
              </button>
            </div>
          )}
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
              mood={isSilent ? "sleepy" : (mood === "attentive" ? "attentive" : almaMood.avatar)}
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
              title={STAGE_SHORT_LABEL[stage] ? `Alma · ${STAGE_SHORT_LABEL[stage]}` : "Alma"}
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
          {/* Sous le nom : le stade de relation, jamais l'humeur. L'humeur
              se lit dans le texte du panneau et dans l'avatar. */}
          {stage && STAGE_SHORT_LABEL[stage] ? (
            <span className="text-[10px] font-medium text-muted-foreground">
              {STAGE_SHORT_LABEL[stage]}
            </span>
          ) : (
            <span className="text-[10px] font-medium text-muted-foreground">votre assistante</span>
          )}
        </button>

        <div className="h-6 w-px bg-border/70" aria-hidden />

        {/* Menu unique : parcours, conseil, fréquence, masquer. */}
        <DropdownMenu modal={false}>
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
                  {stage && STAGE_SHORT_LABEL[stage] ? `Alma, stade ${STAGE_SHORT_LABEL[stage]}` : "Alma, votre assistante"}
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
            <DropdownMenuItem
              className="min-h-11 cursor-pointer"
              onSelect={(e) => {
                e.preventDefault();
                startConversation();
              }}
            >
              <MessageCircle className="mr-2 h-4 w-4" aria-hidden />
              <span>Parler à Alma</span>
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
