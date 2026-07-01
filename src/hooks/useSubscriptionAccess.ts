import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { FOUNDER_START, GRACE_END } from "@/lib/constants";
import { logger } from "@/lib/logger";

const LAUNCH_DATE = FOUNDER_START;
const GRACE_END_DATE = GRACE_END;

export type SubStatus = "founder_grace" | "founder_expired" | "premium" | "expired" | "never" | "owner" | "pre_launch";

/**
 * Returns whether the current sitter has full access (can message, apply, etc.)
 * Owners always have access.
 * Avant le 14 juin 2026 : pré-lancement, accès libre pour tous.
 * Du 14 juin au 30 septembre 2026 inclus : gratuité pour TOUS (fondateurs ou non).
 * À partir du 1er octobre 2026 : abonnement actif requis. Le statut is_founder
 * (réservé aux inscrits avant le 13 juillet) ne donne plus d'accès, seulement le badge.
 */
export const useSubscriptionAccess = () => {
  const { user, activeRole } = useAuth();
  const [status, setStatus] = useState<SubStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(true);

  const effectiveRole = user?.role === "both" ? activeRole : user?.role;

  useEffect(() => {
    if (!user) {
      setStatus("never");
      setHasAccess(false);
      setLoading(false);
      return;
    }

    // Safety timeout — never stay loading forever
    const timeout = setTimeout(() => setLoading(false), 5000);

    const load = async () => {
      try {
        const [profileRes, subRes] = await Promise.all([
          supabase.from("profiles").select("is_founder, created_at, role").eq("id", user.id).maybeSingle(),
          supabase.from("subscriptions").select("status, expires_at").eq("user_id", user.id).maybeSingle(),
        ]);

        const p = profileRes.data;
        const now = new Date();
        const createdDate = p?.created_at ? new Date(p.created_at) : new Date();
        const isFounder = p?.is_founder || createdDate < LAUNCH_DATE;

        // Check subscription from DB — data can be null (never subscribed)
        const sub = subRes.data;
        const hasActiveSub = sub != null && (
          sub.status === "active" || sub.status === "trial"
          || (sub.expires_at && new Date(sub.expires_at) > now)
        );

        if (effectiveRole === "owner") {
          setStatus("owner");
          setHasAccess(true);
        } else if (now < LAUNCH_DATE) {
          setStatus("pre_launch");
          setHasAccess(true);
        } else if (hasActiveSub) {
          setStatus("premium");
          setHasAccess(true);
        } else if (now < GRACE_END_DATE) {
          // Gratuité pour tous jusqu'au 30 septembre 2026, fondateurs ou non
          setStatus(isFounder ? "founder_grace" : "founder_grace");
          setHasAccess(true);
        } else if (isFounder && !hasActiveSub) {
          setStatus("founder_expired");
          setHasAccess(false);
        } else {
          setStatus("never");
          setHasAccess(false);
        }
      } catch (err) {
        logger.error("[useSubscriptionAccess] error", { err: String(err) });
        setStatus("never");
        setHasAccess(false);
      } finally {
        setLoading(false);
      }
    };
    load();

    return () => clearTimeout(timeout);
  }, [user, effectiveRole]);

  return { status, hasAccess, loading };
};
