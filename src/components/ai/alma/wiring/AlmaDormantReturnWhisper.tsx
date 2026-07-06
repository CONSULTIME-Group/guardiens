/**
 * Alma Pass 4 — Trigger 12 (P0 retour d'absence longue).
 *
 * Composant invisible monté dans Dashboard. Détecte une première session
 * après plus de 14 jours d'inactivité (via `profiles.last_dashboard_visit_at`).
 * Ne se déclenche pas si WelcomeBackDigest a déjà couvert la session
 * (flag sessionStorage `alma_welcomeback_shown`).
 * Émet un whisper P0 avec CTA "Voir les correspondances".
 */
import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAlma } from "@/contexts/AlmaContext";
import { buildLongAbsenceReturnWhisper } from "@/lib/alma/whisper-triggers";

const DORMANT_DAYS = 14;
const SESSION_FLAG = "alma_dormant_return_shown";
const WELCOMEBACK_FLAG = "alma_welcomeback_shown";

export function AlmaDormantReturnWhisper() {
  const { user, activeRole } = useAuth();
  const { queueWhisper, canEmit } = useAlma();
  const navigate = useNavigate();
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    if (!user?.id) return;
    if (!canEmit("long_absence_return")) return;
    try {
      if (sessionStorage.getItem(SESSION_FLAG) === "1") return;
      if (sessionStorage.getItem(WELCOMEBACK_FLAG) === "1") return;
    } catch {
      /* silent */
    }

    let cancelled = false;
    (async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("first_name, last_dashboard_visit_at")
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled || !profile) return;

      const lastVisit = (profile as any).last_dashboard_visit_at as string | null;
      if (!lastVisit) return;
      const days = Math.floor((Date.now() - new Date(lastVisit).getTime()) / 86_400_000);
      if (days < DORMANT_DAYS) return;

      const { count } = await supabase
        .from("sits")
        .select("id", { count: "exact", head: true })
        .eq("status", "published")
        .neq("user_id", user.id)
        .gt("created_at", lastVisit);
      if (cancelled) return;

      const newSits = count ?? 0;
      const matches = newSits;
      const audience: "owner" | "sitter" =
        activeRole === "owner" ? "owner" : "sitter";

      fired.current = true;
      try {
        sessionStorage.setItem(SESSION_FLAG, "1");
      } catch {
        /* silent */
      }

      queueWhisper(
        buildLongAbsenceReturnWhisper({
          firstName: (profile as any).first_name || (audience === "owner" ? "et bienvenue" : "et bon retour"),
          newSits,
          matches,
          audience,
          onSeeMatches: () => navigate(audience === "owner" ? "/gardiens" : "/annonces"),
        }),
      );
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id, activeRole, canEmit, queueWhisper, navigate]);

  return null;
}

export default AlmaDormantReturnWhisper;
