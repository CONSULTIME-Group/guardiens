/**
 * AlmaContext — état global cross-page de la narratrice Alma (Pass 4).
 *
 * Rôle :
 *  - Charger la préférence `profiles.alma_frequency` et les types blacklistés
 *    via RPC `get_alma_blacklisted_types`.
 *  - Maintenir la queue courante et le whisper actuellement visible.
 *  - Exposer canEmit(type) au reste de l'app pour gate les triggers.
 *  - Logger chaque émission et chaque dismiss dans `alma_whisper_history`.
 *
 * `useAlma()` retourne toujours un objet stable : composants peuvent l'appeler
 * sans provider (dégrade en no-op) pour ne pas casser les surfaces publiques.
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
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { trackEvent } from "@/lib/analytics";
import {
  AlmaWhisper,
  AlmaWhisperType,
  AlmaFrequency,
  AlmaDismissReason,
} from "@/lib/alma/whisper-types";
import {
  canEmit as canEmitPure,
  makeInitialState,
  onDismiss,
  onEmit,
  pickNext,
  SchedulerState,
} from "@/lib/alma/whisper-scheduler";

interface AlmaContextValue {
  queueWhisper: (whisper: AlmaWhisper) => void;
  dismissCurrent: (reason: AlmaDismissReason) => void;
  canEmit: (type: AlmaWhisperType) => boolean;
  currentWhisper: AlmaWhisper | null;
  frequency: AlmaFrequency;
}

const NOOP_VALUE: AlmaContextValue = {
  queueWhisper: () => {},
  dismissCurrent: () => {},
  canEmit: () => false,
  currentWhisper: null,
  frequency: "balanced",
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
  const { user } = useAuth();
  const [state, setState] = useState<SchedulerState>(() => makeInitialState("balanced"));
  const [queue, setQueue] = useState<AlmaWhisper[]>([]);
  const [current, setCurrent] = useState<AlmaWhisper | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

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
      const freq = ((profile as any)?.alma_frequency ?? "balanced") as AlmaFrequency;
      const blTypes = Array.isArray(blacklist)
        ? (blacklist as any[]).map((r) => r.whisper_type as AlmaWhisperType)
        : [];
      setState(makeInitialState(freq, blTypes));
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const canEmit = useCallback(
    (type: AlmaWhisperType) => canEmitPure(stateRef.current, type).ok,
    [],
  );

  const queueWhisper = useCallback((whisper: AlmaWhisper) => {
    setQueue((q) => {
      // dédoublonne par type déjà en queue ou déjà en cours
      if (q.some((w) => w.type === whisper.type)) return q;
      return [...q, whisper];
    });
  }, []);

  // Sélection du prochain whisper
  useEffect(() => {
    if (current || queue.length === 0) return;
    const next = pickNext(queue, stateRef.current);
    if (!next) return;

    setCurrent(next);
    setQueue((q) => q.filter((w) => w.id !== next.id));
    setState((s) => onEmit(s));

    trackEvent("alma_whisper_emitted", {
      metadata: { whisper_type: next.type, surface: next.surface, priority: next.priority },
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
        } as any);
    }
  }, [current, queue, user?.id]);

  const dismissCurrent = useCallback(
    (reason: AlmaDismissReason) => {
      if (!current) return;
      const w = current;
      setCurrent(null);
      setState((s) => onDismiss(s, reason));

      trackEvent("alma_whisper_dismissed", {
        metadata: { whisper_type: w.type, reason },
      });

      if (user?.id) {
        void supabase
          .from("alma_whisper_history" as any)
          .update({ dismissed_reason: reason } as any)
          .eq("user_id", user.id)
          .eq("whisper_type", w.type)
          .is("dismissed_reason", null);
      }
    },
    [current, user?.id],
  );

  const value = useMemo<AlmaContextValue>(
    () => ({
      queueWhisper,
      dismissCurrent,
      canEmit,
      currentWhisper: current,
      frequency: state.frequency,
    }),
    [queueWhisper, dismissCurrent, canEmit, current, state.frequency],
  );

  return <AlmaCtx.Provider value={value}>{children}</AlmaCtx.Provider>;
}

export function useAlma(): AlmaContextValue {
  return useContext(AlmaCtx);
}
