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
import { supabase } from "@/integrations/supabase/client";
import { useLocation, useNavigate } from "react-router-dom";

import { ChevronDown, X, MoreHorizontal, Check, EyeOff, Lightbulb, Route, MessageCircle } from "lucide-react";
import { AlmaConversation } from "./AlmaConversation";
import { useAlmaJournal } from "@/hooks/useAlmaJournal";
import type { AlmaJournalEntry } from "@/lib/alma/journal";
import {
  getAlmaConversationState,
  openAlmaConversation,
  setAlmaMoodContext,
  subscribeAlmaConversation,
} from "@/lib/alma/conversation-store";
import { autoDismissDelay, shouldScheduleAutoDismiss } from "@/lib/alma/auto-dismiss";
import { resolvePanelLine } from "@/lib/alma/dock-panel";
import {
  ALMA_COMPOSER_INTRO_STORAGE_KEY,
  promptSurfaceFromPath,
  resolvePromptStarters,
  shouldShowComposerIntro,
} from "@/lib/alma/prompt-starters";

import { cn } from "@/lib/utils";
import { AlmaAvatarAnimated } from "./AlmaAvatarAnimated";
import { useAlmaMood } from "@/hooks/useAlmaMood";
import { useAlma } from "@/contexts/AlmaContext";
import { useAlmaFrequency, type AlmaFrequency } from "@/hooks/useAlmaFrequency";
import { useAlmaHidden } from "@/hooks/useAlmaHidden";
import { useAlmaInstallSuggestion } from "@/hooks/usePwaInstall";
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
import {
  ALMA_OPEN_DOCK_EVENT,
  type AlmaDockOpenDetail,
} from "@/lib/alma/dock-events";


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
      const openDialogs = Array.from(
        document.querySelectorAll<HTMLElement>('[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"]'),
      );
      const hasOpenDialog = openDialogs.some(
        (dialog) => dialog.dataset.almaConversationDialog !== "true",
      );
      setIsOpen(hasOpenDialog);
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
 * Retour visible de la dictée : écoute en cours, transcription en cours,
 * et message d'échec renvoyé par la fonction quand il existe.
 */
export function VoiceStatusLine({
  status,
  error,
}: {
  status: "idle" | "recording" | "transcribing";
  error: string | null;
}) {
  return (
    <div aria-live="polite" className="mt-1 min-h-[16px] px-1">
      {status === "recording" && (
        <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <span className="h-2 w-2 rounded-full bg-destructive animate-pulse" />
          Je vous écoute
        </p>
      )}
      {status === "transcribing" && (
        <p className="text-[11px] text-muted-foreground">Je transcris</p>
      )}
      {status === "idle" && error && (
        <p className="text-[11px] text-muted-foreground">{error}</p>
      )}
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
  const { frequency, setFrequency, loading: frequencyLoading } = useAlmaFrequency();
  const { hidden, setHidden, loading: hiddenLoading } = useAlmaHidden();
  const { activeRole, user } = useAuth();
  const userId = user?.id ?? null;

  const { data: evolution } = useAlmaEvolution();
  const isModalOpen = useIsRadixModalOpen();
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [expanded, setExpanded] = useState(false);
  // Vrai quand Alma s'ouvre d'elle-même : le panneau reste alors non bloquant
  // et ne prend pas le curseur de saisie.
  const [spontaneous, setSpontaneous] = useState(false);
  const [userCollapsed, setUserCollapsed] = useState(false);
  const [entryContext, setEntryContext] = useState<AlmaDockOpenDetail | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  // Fil de conversation, stocké hors React pour survivre au démontage du
  // dock provoqué par une modale Radix.
  const conversation = useSyncExternalStore(
    subscribeAlmaConversation,
    getAlmaConversationState,
  );
  useAlmaInstallSuggestion(!frequencyLoading && !hiddenLoading && !hidden && frequency !== "silent" && !isModalOpen && !conversation.open);

  // Humeur du jour. Elle colore la ligne du panneau, l'avatar, et elle est
  // transmise à la conversation pour qu'Alma parle de l'humeur affichée.
  const almaMood = useAlmaMood({
    silent: frequency === "silent",
    conversationOpen: conversation.open,
  });

  useEffect(() => {
    setAlmaMoodContext({ mood: almaMood.chatMood, line: almaMood.chatLine });
  }, [almaMood.chatMood, almaMood.chatLine]);

  // Réactions ponctuelles de l'avatar, toutes brèves, puis retour à
  // l'humeur du moment.
  const [reaction, setReaction] = useState<"happy" | "playful" | null>(null);
  const lastAlmaCountRef = useRef(0);
  useEffect(() => {
    const almaCount = conversation.messages.filter((m) => m.role === "alma").length;
    if (almaCount > lastAlmaCountRef.current) {
      lastAlmaCountRef.current = almaCount;
      setReaction("happy");
      const t = setTimeout(() => setReaction(null), 2500);
      return () => clearTimeout(t);
    }
    lastAlmaCountRef.current = almaCount;
  }, [conversation.messages]);

  const playPlayful = useCallback(() => {
    setReaction("playful");
    setTimeout(() => setReaction((r) => (r === "playful" ? null : r)), 1500);
  }, []);




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
      setEntryContext(null);
      setSpontaneous(true);
      setExpanded(true);
      setUserCollapsed(false);
      trackEvent("alma_dock_expanded" as any, {
        metadata: {
          surface: surfaceFromPath(location.pathname, activeRole),
          origin: "whisper",
        },
      });
    } else if (userCollapsed) {
      setExpanded(false);
    }
  }, [currentWhisper?.id]); // eslint-disable-line react-hooks/exhaustive-deps


  // Ouverture programmatique depuis une carte du produit. Le détail reste
  // optionnel pour préserver les appels existants sans sujet explicite.
  useEffect(() => {
    const onOpen = (event: Event) => {
      const detail = (event as CustomEvent<AlmaDockOpenDetail>).detail ?? {};
      triggerRef.current = detail.trigger ?? (
        document.activeElement instanceof HTMLElement ? document.activeElement : null
      );
      setEntryContext(detail);
      setSpontaneous(false);
      setExpanded(true);
      setUserCollapsed(false);
      setFocusSignal((value) => value + 1);
    };
    window.addEventListener(ALMA_OPEN_DOCK_EVENT, onOpen);
    return () => window.removeEventListener(ALMA_OPEN_DOCK_EVENT, onOpen);
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
    suspendedRef.current = false;
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
    // N5 : dès que la personne a touché le champ, le compte à rebours ne
    // repart jamais. Elle est en train d'écrire, Alma attend.
    if (suspendedRef.current) return;
    if (!pausedRef.current || !currentWhisper) return;
    pausedRef.current = false;
    startedAtRef.current = Date.now();
    timerRef.current = window.setTimeout(
      () => doDismiss("timeout"),
      remainingRef.current > 0 ? remainingRef.current : 20_000,
    );
  };

  // Suspension définitive du compte à rebours, déclenchée par le focus du
  // champ ou la première frappe.
  const suspendedRef = useRef(false);
  const suspendAutoDismiss = useCallback(() => {
    suspendedRef.current = true;
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = null;
    pausedRef.current = true;
  }, []);

  // Entonnoir de découvrabilité (N6). Une mesure par ouverture de panneau.
  const [focusSignal, setFocusSignal] = useState(0);
  const composerSeenRef = useRef(false);
  const composerFocusedRef = useRef(false);
  const composerTypedRef = useRef(false);


  

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

  const restoreTriggerFocus = useCallback(() => {
    const trigger = triggerRef.current;
    triggerRef.current = null;
    window.requestAnimationFrame(() => {
      if (trigger?.isConnected) trigger.focus({ preventScroll: true });
    });
  }, []);

  const collapse = () => {
    setExpanded(false);
    setUserCollapsed(true);
    if (whisper) doDismiss("closed_manually");
    restoreTriggerFocus();
  };

  const mood = whisper?.primaryAction ? "attentive" : "idle";
  const rawProposition = !whisper && !isSilent ? buildProposition(evolution, activeRole) : null;
  // Ne jamais proposer une action qui pointe vers la page courante.
  const proposition = rawProposition && rawProposition.ctaTo.split(/[?#]/)[0] === location.pathname ? null : rawProposition;
  const stage = evolution?.stage ?? null;
  const avatarSize = stage
    ? ({ nouvelle: 40, eveillee: 44, complice: 46, fidele: 48 } as const)[stage]
    : 40;

  const surface = surfaceFromPath(location.pathname, activeRole);

  // Humeur affichée par l'avatar : le silence prime, puis la réflexion
  // pendant qu'une réponse charge, puis la réaction brève, puis
  // l'attention d'un whisper, puis l'humeur du jour.
  const panelAvatarMood = isSilent
    ? "sleepy"
    : conversation.sending
      ? "thinking"
      : reaction
        ? reaction
        : mood === "attentive"
          ? "attentive"
          : almaMood.avatar;
  // Une seule ligne de texte dans le panneau : le whisper prime, puis la
  // proposition contextuelle, puis l'humeur du jour.
  const panelLine = resolvePanelLine({
    whisperMessage: entryContext?.instantLine ?? whisper?.message ?? null,
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

  // Ouverture du panneau tracée avec son origine (N6).
  const openPanel = useCallback(
    (origin: "whisper" | "avatar" | "pill", trigger?: HTMLElement | null) => {
      triggerRef.current = trigger ?? (
        document.activeElement instanceof HTMLElement ? document.activeElement : null
      );
      setEntryContext(null);
      setSpontaneous(false);
      setExpanded(true);
      setUserCollapsed(false);
      composerSeenRef.current = false;
      composerFocusedRef.current = false;
      composerTypedRef.current = false;
      trackEvent("alma_dock_expanded" as any, {
        metadata: { surface: surfaceFromPath(location.pathname, activeRole), origin },
      });
      setFocusSignal((value) => value + 1);
    },
    [location.pathname, activeRole],
  );

  const openFromPill = useCallback((trigger: HTMLElement) => {
    openPanel("pill", trigger);
  }, [openPanel]);

  const composerSurface = surfaceFromPath(location.pathname, activeRole);

  // Amorces contextuelles (N2 B). La surface d'amorces est distincte de la
  // surface du scheduler : elle couvre la messagerie, les réglages et le
  // guide de la maison.
  const promptSurface = promptSurfaceFromPath(location.pathname);
  const [listingWithoutApplication, setListingWithoutApplication] = useState(false);
  useEffect(() => {
    if (!userId || !expanded || promptSurface !== "my_sits" || activeRole !== "owner") return;
    let alive = true;
    void (async () => {
      try {
        const { data: sits } = await supabase
          .from("sits")
          .select("id")
          .eq("user_id", userId)
          .eq("status", "published");
        const ids = (sits ?? []).map((s) => s.id);
        if (ids.length === 0) return;
        const { data: apps } = await supabase
          .from("applications")
          .select("id")
          .in("sit_id", ids)
          .limit(1);
        if (alive) setListingWithoutApplication((apps?.length ?? 0) === 0);
      } catch {
        // Signal absent : les amorces restent celles de la surface.
      }
    })();
    return () => {
      alive = false;
    };
  }, [userId, expanded, promptSurface, activeRole]);


  const defaultStarters = resolvePromptStarters({
    surface: promptSurface,
    ctx: {
      hasDraftSit: evolution?.signals.hasDraftSit ?? false,
      hasPublishedSitWithoutApplication: listingWithoutApplication,
    },
    whisperType: currentWhisper?.type ?? null,
  });
  const starters = entryContext?.readyReplies?.slice(0, 2) ?? defaultStarters;
  const conversationAction = whisper?.primaryAction
    ? {
        label: whisper.primaryAction.label,
        onClick: () => handleAction(whisper.primaryAction.onClick, whisper.primaryAction.actionId),
      }
    : proposition
      ? {
          label: proposition.ctaLabel,
          onClick: () => {
            navigate(proposition.ctaTo);
            setExpanded(false);
          },
        }
      : null;

  // Phrase de présentation, une seule fois par personne.
  const introKey = userId
    ? `${ALMA_COMPOSER_INTRO_STORAGE_KEY}:${userId}`
    : ALMA_COMPOSER_INTRO_STORAGE_KEY;
  const [showIntro, setShowIntro] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    setShowIntro(shouldShowComposerIntro(window.localStorage.getItem(introKey)));
  }, [introKey]);
  const onIntroSeen = useCallback(() => {
    if (typeof window !== "undefined") window.localStorage.setItem(introKey, "true");
  }, [introKey]);

  // Page du jour d'Alma (lot Y) : entrées déterministes lues à l'ouverture.
  const { page: journal, markActed } = useAlmaJournal(
    userId ?? undefined,
    activeRole === "owner" ? "owner" : "sitter",
    expanded,
  );
  const journalShownRef = useRef(false);
  useEffect(() => {
    if (!expanded) {
      journalShownRef.current = false;
      return;
    }
    if (journalShownRef.current || journal.entries.length === 0) return;
    journalShownRef.current = true;
    trackEvent("alma_journal_page_shown" as any, {
      metadata: {
        surface: composerSurface,
        rule_keys: journal.entries.map((entry) => entry.ruleKey).join(","),
        entries_count: journal.entries.length,
      },
    });
  }, [composerSurface, expanded, journal.entries]);

  const onJournalAction = useCallback(
    (entry: AlmaJournalEntry) => {
      markActed(entry.ruleKey);
      trackEvent("alma_journal_action_clicked" as any, {
        metadata: { surface: composerSurface, rule_key: entry.ruleKey },
      });
    },
    [composerSurface, markActed],
  );

  const onJournalReply = useCallback(
    (reply: string, ruleKey: string) => {
      trackEvent("alma_journal_reply_clicked" as any, {
        metadata: { surface: composerSurface, rule_key: ruleKey, label: reply },
      });
    },
    [composerSurface],
  );

  const onStarterClick = useCallback(
    (label: string) => {
      trackEvent("alma_prompt_suggestion_clicked" as any, {
        metadata: { surface: composerSurface, label },
      });
    },
    [composerSurface],
  );

  const onComposerSeen = useCallback(() => {
    if (composerSeenRef.current) return;
    composerSeenRef.current = true;
    trackEvent("alma_composer_seen" as any, { metadata: { surface: composerSurface } });
  }, [composerSurface]);


  const onComposerFocused = useCallback(() => {
    suspendAutoDismiss();
    if (composerFocusedRef.current) return;
    composerFocusedRef.current = true;
    trackEvent("alma_composer_focused" as any, { metadata: { surface: composerSurface } });
  }, [composerSurface, suspendAutoDismiss]);

  const onComposerTyped = useCallback(() => {
    suspendAutoDismiss();
    if (composerTypedRef.current) return;
    composerTypedRef.current = true;
    trackEvent("alma_composer_typed" as any, { metadata: { surface: composerSurface } });
  }, [composerSurface, suspendAutoDismiss]);

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
      triggerRef.current = document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
      setEntryContext(null);
      setSpontaneous(false);
      setExpanded(true);
      setUserCollapsed(false);
      setFocusSignal((value) => value + 1);
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
    triggerRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    setSpontaneous(false);
    setExpanded(true);
    setUserCollapsed(false);
    setFocusSignal((value) => value + 1);
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
      {expanded && (
        <AlmaConversation
          open={expanded}
          modal={!spontaneous}
          autoFocusInput={!spontaneous}
          onOpenChange={(open) => {
            if (open) return;
            setExpanded(false);
            setUserCollapsed(true);
            if (whisper) doDismiss("closed_manually");
            restoreTriggerFocus();
          }}
          surface={surfaceFromPath(location.pathname, activeRole)}
          activeRole={activeRole === "owner" ? "owner" : "sitter"}
          initialMessage={panelLine}
          moodLine={isSilent || whisper ? null : almaMood.line}
          stageLabel={stage ? STAGE_SHORT_LABEL[stage] : undefined}
          stage={stage ?? undefined}
          subject={entryContext?.subject}
          focusSignal={focusSignal}
          starters={starters}
          showIntro={showIntro}
          onIntroSeen={onIntroSeen}
          onStarterClick={onStarterClick}
          onSeen={onComposerSeen}
          onFocus={onComposerFocused}
          onTyped={onComposerTyped}
          action={conversationAction}
          journal={journal}
          onJournalAction={onJournalAction}
          onJournalReply={onJournalReply}
        />
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
            onClick={(e) => {
              if (expanded) {
                setExpanded(false);
                setUserCollapsed(true);
                restoreTriggerFocus();
              } else {
                openPanel("avatar", e.currentTarget);
              }
            }}

            onPointerEnter={playPlayful}
            onTouchStart={playPlayful}
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
            <AlmaAvatarAnimated
              size={avatarSize}
              mood={panelAvatarMood}
              stage={stage ?? undefined}
              showHalo={!isSilent}
            />
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
          onClick={(e) => {
            if (expanded) {
              setExpanded(false);
              setUserCollapsed(true);
              restoreTriggerFocus();
            } else {
              openPanel("avatar", e.currentTarget);
            }
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

        {/* N4 : porte d'entrée visible de la conversation. Elle reste
            affichée en mode silencieux, le silence portant sur les messages
            spontanés d'Alma, pas sur la possibilité de lui parler. */}
        <button
          type="button"
          data-testid="alma-ask-pill"
          onClick={(e) => openFromPill(e.currentTarget)}
          className="flex h-11 shrink-0 items-center rounded-full border border-border bg-muted/40 px-3 font-body text-[12px] text-muted-foreground hover:bg-muted hover:text-foreground transition focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="hidden sm:inline">Posez moi une question</span>
          <span className="sm:hidden">Question</span>
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
