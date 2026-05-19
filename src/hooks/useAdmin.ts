import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const useAdmin = () => {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [checkedUserId, setCheckedUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      setLoading(false);
      setCheckedUserId(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setCheckedUserId(null);
    (async () => {
      const { data, error } = await supabase.rpc("has_role", {
        _user_id: user.id,
        _role: "admin",
      });
      if (cancelled) return;
      setIsAdmin(!error && data === true);
      setCheckedUserId(user.id);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user]);

  const isCheckingCurrentUser = !!user && checkedUserId !== user.id;

  return {
    isAdmin: isCheckingCurrentUser ? false : isAdmin,
    loading: loading || isCheckingCurrentUser,
  };
};
