/**
 * Lot ALMA3 (10/11/2026) : Alma invite à donner son avis sur Google.
 *
 * Composant invisible monté avec le dock. Sur l'accueil seulement (/dashboard),
 * pour un membre qui a reçu l'invitation dans la cloche (notification
 * google_review_invite : membres qui ont utilisé Guardiens, sans tri par
 * satisfaction), une seule fois par membre et par navigateur
 * (localStorage alma_google_review_shown:{membre}, posé quand le murmure
 * est affiché). Aucune lecture pour un membre qui l'a déjà vu.
 */
import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useAlma } from "@/contexts/AlmaContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { buildGoogleReviewWhisper } from "@/lib/alma/whisper-triggers";
import {
  GOOGLE_REVIEW_NOTIFICATION_TYPE,
  GOOGLE_REVIEW_PANEL_MESSAGE,
  GOOGLE_REVIEW_PEEK,
  googleReviewDoneKey,
} from "@/lib/alma/googleReview";

const TYPE = "community_google_review" as const;

function alreadyShown(userId: string): boolean {
  try {
    return window.localStorage.getItem(googleReviewDoneKey(userId)) === "1";
  } catch {
    return true;
  }
}

export function AlmaGoogleReviewWhisper() {
  const { user, activeRole } = useAuth();
  const { queueWhisper, canEmit, currentWhisper } = useAlma();
  const { pathname } = useLocation();
  const userId = user?.id ?? null;
  const queuedRef = useRef(false);

  useEffect(() => {
    if (!userId || queuedRef.current) return;
    if (pathname !== "/dashboard") return;
    if (alreadyShown(userId)) return;
    if (!canEmit(TYPE)) return;
    let cancelled = false;
    void (async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("id")
        .eq("user_id", userId)
        .eq("type", GOOGLE_REVIEW_NOTIFICATION_TYPE)
        .limit(1);
      if (cancelled || error || !data || data.length === 0 || queuedRef.current) return;
      queuedRef.current = true;
      queueWhisper(
        buildGoogleReviewWhisper({
          audience: activeRole === "owner" ? "owner" : "sitter",
          surface: activeRole === "owner" ? "owner_dashboard" : "sitter_dashboard",
          peek: GOOGLE_REVIEW_PEEK,
          panelMessage: GOOGLE_REVIEW_PANEL_MESSAGE,
        }),
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, pathname, activeRole, canEmit, queueWhisper]);

  useEffect(() => {
    if (!userId || currentWhisper?.type !== TYPE) return;
    try {
      window.localStorage.setItem(googleReviewDoneKey(userId), "1");
    } catch {
      /* stockage indisponible : le murmure peut revenir une fois */
    }
  }, [userId, currentWhisper?.type]);

  return null;
}

export default AlmaGoogleReviewWhisper;
