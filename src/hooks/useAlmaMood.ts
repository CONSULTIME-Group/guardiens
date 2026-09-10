/**
 * useAlmaMood, humeur du jour d'Alma (lot 2).
 *
 * Une humeur par session. Le tirage vient de la RPC `get_alma_mood`
 * (deux phases, non répétition sur 30 jours). La météo est calculée côté
 * serveur (fonction `alma-weather`, coordonnées arrondies au dixième de
 * degré) : si l'appel échoue, l'humeur se calcule sur l'heure et la saison
 * seules et le dock continue de fonctionner.
 *
 * Ce hook n'alimente QUE la ligne de statut du dock et la phrase
 * d'ouverture. Il n'est jamais lu par la conversation.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  resolveMoodPlan,
  seasonFromDate,
  timeOfDayFromDate,
  MOOD_AVATAR,
  type AlmaMoodAvatar,
  type AlmaMoodKey,
  type AlmaMoodRow,
} from "@/lib/alma/mood";

const SESSION_KEY = "alma_mood_session";

interface UseAlmaMoodParams {
  silent: boolean;
  conversationOpen: boolean;
}

interface UseAlmaMoodResult {
  mood: AlmaMoodKey | null;
  line: string | null;
  avatar: AlmaMoodAvatar;
}

function readSession(): AlmaMoodRow | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as AlmaMoodRow) : null;
  } catch {
    return null;
  }
}

/** Contexte d'attention, lu au plus léger : gardes et candidatures. */
async function loadAttentionContext(
  userId: string,
  activeRole: "owner" | "sitter",
): Promise<{ sitInProgress: boolean; sitImminent: boolean; pendingApplication: boolean }> {
  const soon = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);
  try {
    if (activeRole === "owner") {
      const { data } = await supabase
        .from("sits")
        .select("status, start_date")
        .eq("user_id", userId)
        .in("status", ["confirmed", "in_progress"])
        .limit(10);
      const rows = data ?? [];
      return {
        sitInProgress: rows.some((r: any) => r.status === "in_progress"),
        sitImminent: rows.some(
          (r: any) =>
            r.status === "confirmed" && r.start_date && r.start_date >= today && r.start_date <= soon,
        ),
        pendingApplication: false,
      };
    }
    const { data } = await supabase
      .from("applications")
      .select("status, sits:sit_id(status, start_date)")
      .eq("sitter_id", userId)
      .in("status", ["pending", "accepted"])
      .limit(20);
    const rows = data ?? [];
    return {
      sitInProgress: rows.some((r: any) => r.sits?.status === "in_progress"),
      sitImminent: rows.some(
        (r: any) =>
          r.status === "accepted" &&
          r.sits?.start_date &&
          r.sits.start_date >= today &&
          r.sits.start_date <= soon,
      ),
      pendingApplication: rows.some((r: any) => r.status === "pending"),
    };
  } catch {
    return { sitInProgress: false, sitImminent: false, pendingApplication: false };
  }
}

export function useAlmaMood({ silent, conversationOpen }: UseAlmaMoodParams): UseAlmaMoodResult {
  const { user, activeRole } = useAuth();
  const [row, setRow] = useState<AlmaMoodRow | null>(() => readSession());
  const [avatar, setAvatar] = useState<AlmaMoodAvatar>("idle");
  const [express, setExpress] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!user?.id) return;

    (async () => {
      const attention = await loadAttentionContext(
        user.id,
        activeRole === "owner" ? "owner" : "sitter",
      );
      if (cancelled) return;

      const plan = resolveMoodPlan({
        silent,
        conversationOpen,
        timeOfDay: timeOfDayFromDate(),
        ...attention,
      });
      setAvatar(plan.avatar);
      setExpress(plan.express);
      if (!plan.express) return;

      const cached = readSession();
      if (cached) {
        setRow(cached);
        setAvatar(MOOD_AVATAR[cached.mood] ?? plan.avatar);
        return;
      }

      // Météo côté serveur. Un échec laisse simplement la condition à null.
      let weather: string | null = null;
      try {
        const { data } = await supabase.functions.invoke("alma-weather", { body: {} });
        const c = (data as any)?.condition;
        weather = typeof c === "string" ? c : null;
      } catch {
        weather = null;
      }
      if (cancelled) return;

      try {
        const { data, error } = await supabase.rpc("get_alma_mood" as any, {
          p_user_id: user.id,
          p_weather: weather,
          p_season: seasonFromDate(),
          p_time_of_day: timeOfDayFromDate(),
          p_mood: plan.forced,
        });
        if (cancelled || error || !data) return;
        const picked = data as unknown as AlmaMoodRow;
        if (!picked?.id || !picked?.content) return;
        setRow(picked);
        setAvatar(MOOD_AVATAR[picked.mood] ?? plan.avatar);
        try {
          sessionStorage.setItem(SESSION_KEY, JSON.stringify(picked));
        } catch {
          /* silent */
        }
      } catch {
        /* silent : le dock fonctionne sans humeur */
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, activeRole, silent, conversationOpen]);

  return {
    mood: express ? row?.mood ?? null : null,
    line: express ? row?.content ?? null : null,
    avatar,
  };
}
