import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const LAUNCH_DATE = new Date("2026-05-13T00:00:00Z");
const GRACE_END_DATE = new Date("2026-06-13T00:00:00Z");

export type SubStatus = "founder_grace" | "founder_expired" | "premium" | "expired" | "never" | "owner" | "pre_launch";

/**
 * Returns whether the current sitter has full access (can message, apply, etc.)
 * Before May 13: everyone has access.
 * Between May 13 and June 13: founders have access, non-founders need sub.
 * After June 13: everyone needs a sub (founders included).
 * Owners always have access.
 */
export const useSubscriptionAccess = () => {
  const { user, activeRole } = useAuth();
  const [status, setStatus] = useState<SubStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(true);

  const effectiveRole = user?.role === "both" ? activeRole : user?.role;

  useEffect(() => {
    if (!user) { setLoading(false); return; }

    const load = async () => {
      const [profileRes, subRes] = await Promise.all([
        supabase.from("profiles").select("is_founder, created_at, role").eq("id", user.id).single(),
        supabase.from("subscriptions").select("status").eq("user_id", user.id).eq("status", "active").maybeSingle(),
      ]);

      const p = profileRes.data;
      const now = new Date();
      const createdDate = p?.created_at ? new Date(p.created_at) : new Date();
      const isFounder = p?.is_founder || createdDate < LAUNCH_DATE;
      const hasActiveSub = subRes.data?.status === "active";

      if (effectiveRole === "owner") {
        setStatus("owner");
        setHasAccess(true);
      } else if (now < LAUNCH_DATE) {
        // Before May 13: free for everyone
        setStatus("pre_launch");
        setHasAccess(true);
      } else if (hasActiveSub) {
        setStatus("premium");
        setHasAccess(true);
      } else if (isFounder && now < GRACE_END_DATE) {
        setStatus("founder_grace");
        setHasAccess(true);
      } else if (isFounder && !hasActiveSub) {
        setStatus("founder_expired");
        setHasAccess(false);
      } else {
        setStatus("never");
        setHasAccess(false);
      }
      setLoading(false);
    };
    load();
  }, [user, effectiveRole]);

  return { status, hasAccess, loading };
};
