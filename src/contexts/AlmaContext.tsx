/**
 * AlmaContext — état global cross-page de la narratrice Alma.
 *
 * Étape 1 évolution :
 *  - `verboseMode` piloté par le query param `?alma=verbose` (session courante,
 *    bypass total du quota / cooldown / mute des whispers proactifs).
 *  - `requestNextTip({ surface, context, role, state })` : tirage initié par
 *    l'utilisateur (bouton « Un autre conseil » sur la bulle, ou point d'accès
 *    Alma persistant en topbar). Bypasse toutes les gates de session côté client
 *    et les cooldowns côté serveur. Respecte le dedup 24h via `p_exclude_ids`.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  ReactNode,
} from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { trackEvent } from "@/lib/analytics";
import {
  AlmaWhisper,
  AlmaWhisperType,
  AlmaFrequency,
  AlmaDismissReason,
  AlmaAudience,
} from "@/lib/alma/whisper-types";
import {
  canEmit as canEmitPure,
  makeInitialState,
  onDismiss,
  onEmit,
  pickNext,
  SchedulerState,
} from "@/lib/alma/whisper-scheduler";
import { buildCulturalFactWhisper, buildUsageNudgeWhisper } from "@/lib/alma/whisper-triggers";

/**
 * Routes sur lesquelles Alma NE DOIT PAS afficher de whisper flottant proactif.
 */
const WHISPER_EXCLUDED_ROUTES: RegExp[] = [
  /^\/sits\/create(\/|$|\?)/,
  /^\/sits\/[^/]+\/edit(\/|$|\?)/,
];

function isWhisperExcludedRoute(pathname: string): boolean {
  return WHISPER_EXCLUDED_ROUTES.some((re) => re.test(pathname));
}

const INPUT_FOCUS_QUIET_MS = 3000;
const VERBOSE_SESSION_KEY = "alma_verbose_mode";
const SEEN_IDS_SESSION_KEY = "alma_seen_fact_ids";
const MAX_SEEN_IDS = 40;
/** Un seul whisper proactif par session (toutes pages, toutes fréquences). */
const SESSION_EMITTED_KEY = "alma_session_whisper_emitted";
function hasSessionEmitted(): boolean {
  try { return sessionStorage.getItem(SESSION_EMITTED_KEY) === "1"; } catch { return false; }
}
function markSessionEmitted() {
  try { sessionStorage.setItem(SESSION_EMITTED_KEY, "1"); } catch { /* silent */ }
}

function loadSeenIds(): string[] {
  try {
    const raw = sessionStorage.getItem(SEEN_IDS_SESSION_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.slice(-MAX_SEEN_IDS) : [];
  } catch {
    return [];
  }
}
function pushSeenId(id: string) {
  try {
    const arr = loadSeenIds();
    if (arr.includes(id)) return;
    arr.push(id);
    sessionStorage.setItem(
      SEEN_IDS_SESSION_KEY,
      JSON.stringify(arr.slice(-MAX_SEEN_IDS)),
    );
  } catch {
    /* silent */
  }
}

export interface RequestNextTipParams {
  surface: string;
  context?: Record<string, unknown>;
  role?: "owner" | "sitter" | "any";
  state?: "any" | "no_active_sit" | "new_owner" | "new_sitter" | "profile_incomplete";
  /** Si false, on ne tente pas d'abord un nudge (utile pour rester "culturel pur"). */
  preferNudge?: boolean;
  /** Message affiché si aucun conseil éligible. */
  emptyMessage?: string;
  /**
   * True quand la demande est initiée par un clic utilisateur (bouton "Un conseil ?").
   * Contourne le cooldown 24h serveur et assouplit la dédup (autorise de renvoyer
   * un fait déjà vu si rien de neuf n'est disponible). N'affecte pas le proactif.
   */
  onDemand?: boolean;
}


/**
 * Verrou global : une seule surface Alma « proactive » visible à la fois.
 * Poids plus élevé = priorité plus haute (peut déloger l'occupant courant).
 * first_meeting (100) > welcome_back (50) > whisper (10). Le dock replié
 * et la proposition permanente du dock ne sont PAS soumis au verrou.
 */
export type AlmaProactiveSurface = "first_meeting" | "welcome_back" | "whisper";
const SURFACE_WEIGHT: Record<AlmaProactiveSurface, number> = {
  first_meeting: 100,
  welcome_back: 50,
  whisper: 10,
};

interface AlmaContextValue {
  queueWhisper: (whisper: AlmaWhisper) => void;
  /**
   * Ferme le whisper courant.
   * - `reason` : cause du dismiss (timeout, closed_manually, action_clicked, ...).
   * - `actionId` : requis quand `reason === "action_clicked"`. Persiste dans
   *   `alma_whisper_history.action_taken` pour le dashboard admin.
   */
  dismissCurrent: (reason: AlmaDismissReason, actionId?: string) => void;
  canEmit: (type: AlmaWhisperType) => boolean;
  currentWhisper: AlmaWhisper | null;
  frequency: AlmaFrequency;
  verboseMode: boolean;
  /** Tire à la demande le prochain conseil éligible pour cette surface. */
  requestNextTip: (params: RequestNextTipParams) => Promise<void>;
  /** Surface proactive actuellement affichée, ou null si aucune. */
  activeProactiveSurface: AlmaProactiveSurface | null;
  /** Tente de réserver la surface proactive. Retourne true si accordé. */
  claimProactiveSurface: (kind: AlmaProactiveSurface) => boolean;
  /** Libère la surface si elle est encore détenue par `kind`. */
  releaseProactiveSurface: (kind: AlmaProactiveSurface) => void;
}

const NOOP_VALUE: AlmaContextValue = {
  queueWhisper: () => {},
  dismissCurrent: () => {},
  canEmit: () => false,
  currentWhisper: null,
  frequency: "balanced",
  verboseMode: false,
  requestNextTip: async () => {},
  activeProactiveSurface: null,
  claimProactiveSurface: () => false,
  releaseProactiveSurface: () => {},
};


const AlmaCtx = createContext<AlmaContextValue>(NOOP_VALUE);

function sessionId(): string {
  try {
    const KEY = "alma_session_id";
    let id = sessionStorage.getItem(KEY);
    if (!id) {
      id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      sessionStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    return "no-session";
  }
}

export function AlmaProvider({ children }: { children: ReactNode }) {
  const { user, activeRole } = useAuth();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [state, setState] = useState<SchedulerState>(() => makeInitialState("balanced"));
  const [queue, setQueue] = useState<AlmaWhisper[]>([]);
  const [current, setCurrent] = useState<AlmaWhisper | null>(null);
  const [activeProactiveSurface, setActiveProactiveSurface] =
    useState<AlmaProactiveSurface | null>(null);
  const activeSurfaceRef = useRef<AlmaProactiveSurface | null>(null);
  activeSurfaceRef.current = activeProactiveSurface;
  const stateRef = useRef(state);
  stateRef.current = state;
  const lastInputFocusRef = useRef<number>(0);
  const inputFocusedRef = useRef<boolean>(false);
  const pathnameRef = useRef(location.pathname);
  pathnameRef.current = location.pathname;

  // Verbose mode : query param ?alma=verbose OU flag session (persiste après refresh)
  const [verboseMode, setVerboseMode] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem(VERBOSE_SESSION_KEY) === "1";
    } catch {
      return false;
    }
  });
  useEffect(() => {
    if (searchParams.get("alma") === "verbose" && !verboseMode) {
      try {
        sessionStorage.setItem(VERBOSE_SESSION_KEY, "1");
      } catch {
        /* silent */
      }
      setVerboseMode(true);
      // eslint-disable-next-line no-console
      console.info("[Alma] verbose mode activé pour cette session.");
    }
  }, [searchParams, verboseMode]);

  useEffect(() => {
    const isFormField = (el: EventTarget | null): boolean => {
      if (!(el instanceof HTMLElement)) return false;
      const tag = el.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
      if (el.isContentEditable) return true;
      return false;
    };
    const onFocusIn = (e: FocusEvent) => {
      if (isFormField(e.target)) {
        inputFocusedRef.current = true;
        lastInputFocusRef.current = Date.now();
      }
    };
    const onFocusOut = (e: FocusEvent) => {
      if (isFormField(e.target)) {
        inputFocusedRef.current = false;
        lastInputFocusRef.current = Date.now();
      }
    };
    const onInput = (e: Event) => {
      if (isFormField(e.target)) {
        lastInputFocusRef.current = Date.now();
      }
    };
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    document.addEventListener("input", onInput, true);
    return () => {
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
      document.removeEventListener("input", onInput, true);
    };
  }, []);

  const isProactiveMuted = useCallback((): boolean => {
    if (verboseMode) return false;
    if (isWhisperExcludedRoute(pathnameRef.current)) return true;
    if (inputFocusedRef.current) return true;
    if (Date.now() - lastInputFocusRef.current < INPUT_FOCUS_QUIET_MS) return true;
    return false;
  }, [verboseMode]);

  // Charge fréquence + blacklist
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      const [{ data: profile }, { data: blacklist }] = await Promise.all([
        supabase
          .from("profiles")
          .select("alma_frequency" as any)
          .eq("id", user.id)
          .maybeSingle(),
        supabase.rpc("get_alma_blacklisted_types" as any),
      ]);
      if (cancelled) return;
      const raw = (profile as any)?.alma_frequency;
      const freq: AlmaFrequency =
        raw === "silent" || raw === "low" || raw === "balanced" || raw === "talkative"
          ? raw
          : "balanced";
      const blTypes = Array.isArray(blacklist)
        ? (blacklist as any[]).map((r) => r.whisper_type as AlmaWhisperType)
        : [];
      setState(makeInitialState(freq, blTypes));
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const claimProactiveSurface = useCallback(
    (kind: AlmaProactiveSurface): boolean => {
      const current = activeSurfaceRef.current;
      if (current && SURFACE_WEIGHT[kind] <= SURFACE_WEIGHT[current]) return false;
      activeSurfaceRef.current = kind;
      setActiveProactiveSurface(kind);
      return true;
    },
    [],
  );

  const releaseProactiveSurface = useCallback((kind: AlmaProactiveSurface) => {
    if (activeSurfaceRef.current !== kind) return;
    activeSurfaceRef.current = null;
    setActiveProactiveSurface(null);
  }, []);

  const canEmit = useCallback(
    (type: AlmaWhisperType) => {
      if (verboseMode) return true;
      if (hasSessionEmitted()) return false;
      if (isProactiveMuted()) return false;
      const active = activeSurfaceRef.current;
      // Une surface plus prioritaire (first_meeting, welcome_back) bloque les whispers.
      if (active && SURFACE_WEIGHT[active] > SURFACE_WEIGHT.whisper) return false;
      return canEmitPure(stateRef.current, type).ok;
    },
    [isProactiveMuted, verboseMode],
  );

  const queueWhisper = useCallback(
    (whisper: AlmaWhisper) => {
      if (!verboseMode && isProactiveMuted()) return;
      if (!verboseMode && hasSessionEmitted()) return;
      setQueue((q) => {
        if (q.some((w) => w.type === whisper.type)) return q;
        return [...q, whisper];
      });
    },
    [isProactiveMuted, verboseMode],
  );

  // Sélection du prochain whisper
  useEffect(() => {
    if (current || queue.length === 0) return;
    if (!verboseMode && isProactiveMuted()) return;
    if (!verboseMode && hasSessionEmitted()) return;
    // Verrou : si une surface plus prioritaire est active, on ne parle pas.
    if (!verboseMode) {
      const active = activeSurfaceRef.current;
      if (active && SURFACE_WEIGHT[active] > SURFACE_WEIGHT.whisper) return;
    }

    let next: AlmaWhisper | null;
    if (verboseMode) {
      // Bypass total : on prend le plus prioritaire de la queue.
      const order: Record<string, number> = { P0: 0, P1: 1, P2: 2, P3: 3 };
      next = [...queue].sort((a, b) => order[a.priority] - order[b.priority])[0] ?? null;
    } else {
      next = pickNext(queue, stateRef.current);
    }
    if (!next) return;

    // Claim de la surface pour le whisper. En mode verbose, on force le claim
    // sans se soucier du verrou (mais on l'écrit quand même pour cohérence).
    if (!verboseMode) {
      const claimed = claimProactiveSurface("whisper");
      if (!claimed) return;
    } else {
      activeSurfaceRef.current = "whisper";
      setActiveProactiveSurface("whisper");
    }

    setCurrent(next);
    setQueue((q) => q.filter((w) => w.id !== next!.id));
    if (!verboseMode) setState((s) => onEmit(s, next!.type));
    if (!verboseMode) markSessionEmitted();

    const factId = (next.metadata as any)?.fact_id;
    if (factId) pushSeenId(String(factId));

    trackEvent("alma_whisper_emitted", {
      metadata: {
        whisper_type: next.type,
        surface: next.surface,
        priority: next.priority,
        verbose: verboseMode,
      },
    });

    if (user?.id) {
      void supabase
        .from("alma_whisper_history" as any)
        .insert({
          user_id: user.id,
          whisper_type: next.type,
          surface: next.surface,
          session_id: sessionId(),
          metadata: next.metadata ?? null,
        } as any)
        .then(({ error }) => {
          if (error) {
            // eslint-disable-next-line no-console
            console.error("[Alma] insert alma_whisper_history a échoué", error);
          }
        });
    }
  }, [current, queue, user?.id, isProactiveMuted, verboseMode, claimProactiveSurface, activeProactiveSurface]);

  const dismissCurrent = useCallback(
    (reason: AlmaDismissReason, actionId?: string) => {
      if (!current) return;
      const w = current;
      setCurrent(null);
      setState((s) => onDismiss(s, reason));
      // Libère le verrou de surface tenu par ce whisper.
      if (activeSurfaceRef.current === "whisper") {
        activeSurfaceRef.current = null;
        setActiveProactiveSurface(null);
      }

      trackEvent("alma_whisper_dismissed", {
        metadata: { whisper_type: w.type, reason, action_id: actionId ?? null },
      });

      if (user?.id) {
        const patch: Record<string, unknown> = { dismissed_reason: reason };
        // Ne renseigne action_taken QUE pour un clic volontaire, jamais pour
        // un auto-dismiss ou une fermeture manuelle : le dashboard admin
        // compte les actions via cette colonne.
        if (reason === "action_clicked" && actionId) {
          patch.action_taken = actionId;
        }
        void supabase
          .from("alma_whisper_history" as any)
          .update(patch as any)
          .eq("user_id", user.id)
          .eq("whisper_type", w.type)
          .is("dismissed_reason", null)
          .then(({ error }) => {
            if (error) {
              // eslint-disable-next-line no-console
              console.error("[Alma] update alma_whisper_history a échoué", error);
            }
          });
      }
    },
    [current, user?.id],
  );


  const requestNextTip = useCallback<AlmaContextValue["requestNextTip"]>(
    async ({ surface, context, role, state: userState, preferNudge = true, emptyMessage, onDemand = false }) => {
      if (!user?.id) return;
      const audience: AlmaAudience = activeRole === "owner" ? "owner" : "sitter";
      // En mode on_demand, on n'exclut RIEN côté client pour maximiser les chances
      // de retour ; la RPC gère elle-même la dédup et le repli si besoin.
      const excluded = onDemand ? [] : loadSeenIds();

      // 1) Essai usage_nudge en priorité si preferNudge et role/state fournis.
      if (preferNudge && role && userState) {
        try {
          const { data } = await supabase.rpc("get_alma_usage_nudge" as any, {
            p_user_id: user.id,
            p_surface: surface,
            p_role: role,
            p_state: userState,
            p_bypass_cooldown: true,
            p_exclude_ids: excluded,
          });
          if (data && (data as any).id) {
            const nudge = buildUsageNudgeWhisper({ payload: data as any, audience, surface });
            setCurrent(nudge);
            pushSeenId(String((data as any).id));
            trackEvent("alma_next_tip_delivered", {
              metadata: { fact_id: (data as any).id, kind: "usage_nudge", surface },
            });
            return;
          }
        } catch {
          /* silent, on tombe sur cultural */
        }
      }

      // 2) Sinon, fait culturel.
      try {
        const { data } = await supabase.rpc("get_alma_cultural_fact" as any, {
          p_user_id: user.id,
          p_surface: surface,
          p_context: (context ?? {}) as any,
          p_bypass_cooldown: true,
          p_exclude_ids: excluded,
          p_on_demand: onDemand,
          p_frequency: stateRef.current.frequency,
        });

        if (data && (data as any).id) {
          const fact = data as any;
          const whisper = buildCulturalFactWhisper({
            fact,
            audience,
            surface,
            onSource: (url) => {
              try {
                window.open(url, "_blank", "noopener,noreferrer");
              } catch { /* silent */ }
            },
          });
          setCurrent(whisper);
          pushSeenId(String(fact.id));
          trackEvent("alma_next_tip_delivered", {
            metadata: { fact_id: fact.id, kind: "cultural_fact", surface },
          });
          return;
        }
      } catch {
        /* silent */
      }

      // 3) Rien de neuf.
      setCurrent({
        id: `alma-empty-${Date.now()}`,
        type: "cultural_fact",
        audience,
        surface,
        priority: "P3",
        allowNextTip: false,
        message: emptyMessage ?? "Rien de neuf pour l'instant, revenez un peu plus tard.",
        autoDismissMs: 6_000,
      });
      trackEvent("alma_next_tip_empty", { metadata: { surface } });
    },
    [user?.id, activeRole],
  );

  const value = useMemo<AlmaContextValue>(
    () => ({
      queueWhisper,
      dismissCurrent,
      canEmit,
      currentWhisper: current,
      frequency: state.frequency,
      verboseMode,
      requestNextTip,
      activeProactiveSurface,
      claimProactiveSurface,
      releaseProactiveSurface,
    }),
    [
      queueWhisper,
      dismissCurrent,
      canEmit,
      current,
      state.frequency,
      verboseMode,
      requestNextTip,
      activeProactiveSurface,
      claimProactiveSurface,
      releaseProactiveSurface,
    ],
  );

  return <AlmaCtx.Provider value={value}>{children}</AlmaCtx.Provider>;
}

export function useAlma(): AlmaContextValue {
  return useContext(AlmaCtx);
}
