import { fetchMyProfile } from "@/lib/myProfile";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { PRICING_ACTIVATION_DATE } from "@/config/pricing";
import { isPricingActive, isPaywallInForce } from "@/lib/pricing";
import { logger } from "@/lib/logger";

export type SubStatus = "founder_grace" | "founder_expired" | "premium" | "expired" | "never" | "owner" | "pre_launch";

/**
 * Accès complet du gardien (messagerie, candidatures). Aucune date codée en dur.
 * - PRICING_IS_ACTIVE false : accès complet pour tous.
 * - PRICING_IS_ACTIVE true :
 *   propriétaire : accès complet ;
 *   abonnement actif ou trial : accès complet ;
 *   PRICING_ACTIVATION_DATE null ou future : accès complet pour tous
 *   (avertissement journalisé si la date manque) ;
 *   sinon, sans abonnement : pas d'accès. Le statut fondateur garde son badge.
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

    if (!isPricingActive()) {
      setStatus(effectiveRole === "owner" ? "owner" : "founder_grace");
      setHasAccess(true);
      setLoading(false);
      return;
    }

    const timeout = setTimeout(() => setLoading(false), 5000);

    const load = async () => {
      try {
        const [profileRes, subRes] = await Promise.all([
          fetchMyProfile(user.id!),
          supabase.from("subscriptions").select("status, expires_at").eq("user_id", user.id).maybeSingle(),
        ]);
        const isFounder = profileRes.data?.is_founder === true;
        const now = new Date();
        const sub = subRes.data;
        const hasActiveSub = sub != null && (
          sub.status === "active" || sub.status === "trial"
          || (sub.expires_at != null && new Date(sub.expires_at) > now)
        );

        if (!PRICING_ACTIVATION_DATE) {
          logger.warn("[useSubscriptionAccess] PRICING_IS_ACTIVE vaut true sans PRICING_ACTIVATION_DATE : accès complet maintenu");
        }

        if (effectiveRole === "owner") {
          setStatus("owner");
          setHasAccess(true);
        } else if (hasActiveSub) {
          setStatus("premium");
          setHasAccess(true);
        } else if (!isPaywallInForce(PRICING_ACTIVATION_DATE, now)) {
          setStatus("founder_grace");
          setHasAccess(true);
        } else {
          setStatus(isFounder ? "founder_expired" : "never");
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
