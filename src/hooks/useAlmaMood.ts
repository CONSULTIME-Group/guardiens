/**
 * useAlmaMood, humeur du jour d'Alma (lot 2).
 *
 * Une humeur par session. Le tirage vient de la RPC `get_alma_mood`
 * (deux phases, non répétition sur 30 jours). La météo est calculée côté
 * serveur (fonction `alma-weather`, coordonnées arrondies au dixième de
 * degré) : si l'appel échoue, l'humeur se calcule sur l'heure et la saison
 * seules et le dock continue de fonctionner.
 *
 * `mood` et `line` alimentent l'affichage, ligne de statut du dock et
 * phrase d'ouverture : ils restent nuls quand l'humeur doit se taire.
 * `chatMood` et `chatLine` exposent l'humeur tirée en permanence, pour que
 * la conversation reçoive exactement l'humeur du moment.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { getDailyWeather } from "@/lib/alma/weatherCache";
import { fetchMySitsIndex, fetchMyApplicationsIndex, fetchApplicationsOnMySits } from "@/lib/dashboardShared";
import { isMoodLineTruthful, type MoodTruthFacts } from "../../supabase/functions/_shared/alma-facts";
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
  chatMood: AlmaMoodKey | null;
  chatLine: string | null;
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

/**
 * Contexte d'attention, lu au plus léger : gardes et candidatures.
 * Lot J2-A : les deux côtés sont toujours lus (membre polyvalent), et une
 * garde ne compte que confirmée avec une date de début.
 */
async function loadAttentionContext(
  userId: string,
): Promise<{ sitInProgress: boolean; sitImminent: boolean; pendingApplication: boolean; truth: MoodTruthFacts }> {
  const soon = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);
  const empty = { ownerConfirmedSoon: false, sitterConfirmedSoon: false, receivedPending: false };
  try {
    // Lot P1b : mêmes filtres, appliqués aux lectures partagées du tableau de bord.
    const [mySits, myApps] = await Promise.all([fetchMySitsIndex(userId), fetchMyApplicationsIndex(userId)]);
    const ownRes = {
      data: mySits.filter((r) => ["published", "confirmed", "in_progress"].includes(r.status)).slice(0, 20),
    };
    const sentRes = {
      data: myApps
        .filter((r) => ["pending", "accepted"].includes(r.status))
        .slice(0, 20)
        .map((r) => ({ status: r.status, sits: r.sit ? { status: r.sit.status, start_date: r.sit.start_date } : null })),
    };
    const own = (ownRes.data ?? []) as any[];
    const sent = (sentRes.data ?? []) as any[];
    const publishedIds = own.filter((r) => r.status === "published").map((r) => r.id);
    let receivedPending = false;
    if (publishedIds.length > 0) {
      // Lot P1b : candidatures reçues déjà lues par le tableau de bord.
      const received = await fetchApplicationsOnMySits(userId);
      const published = new Set(publishedIds);
      receivedPending = received.some((r: any) => published.has(r.sit_id) && r.status === "pending");
    }
    const soonStart = (d?: string | null) => Boolean(d) && d! >= today && d! <= soon;
    const ownerConfirmedSoon = own.some((r) => r.status === "confirmed" && soonStart(r.start_date));
    const sitterConfirmedSoon = sent.some(
      (r) => r.status === "accepted" && ["confirmed", "in_progress"].includes(r.sits?.status) && soonStart(r.sits?.start_date),
    );
    return {
      sitInProgress: own.some((r) => r.status === "in_progress") || sent.some((r) => r.status === "accepted" && r.sits?.status === "in_progress"),
      sitImminent: ownerConfirmedSoon || sitterConfirmedSoon,
      pendingApplication: receivedPending,
      truth: { ownerConfirmedSoon, sitterConfirmedSoon, receivedPending },
    };
  } catch {
    return { sitInProgress: false, sitImminent: false, pendingApplication: false, truth: empty };
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
      const { truth, ...attention } = await loadAttentionContext(user.id);
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
      if (cached && !isMoodLineTruthful(cached.content, truth)) {
        try { sessionStorage.removeItem(SESSION_KEY); } catch { /* silent */ }
        setRow(null);
      } else if (cached) {
        setRow(cached);
        setAvatar(MOOD_AVATAR[cached.mood] ?? plan.avatar);
        return;
      }

      // Météo côté serveur. Un échec laisse simplement la condition à null.
      // Lot P1 : une fois par jour au plus, lecture différée après l'affichage.
      let weather: string | null = null;
      try {
        weather = await getDailyWeather(user.id);
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
        // Lot J2-A : une phrase qui raconte une garde ou un départ non confirmé se tait.
        if (!isMoodLineTruthful(picked.content, truth)) return;
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
    chatMood: row?.mood ?? null,
    chatLine: row?.content ?? null,
    avatar,
  };
}
