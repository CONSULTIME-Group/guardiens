import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User as SupabaseUser } from "@supabase/supabase-js";

type Role = "owner" | "sitter" | "both";
type ActiveRole = "owner" | "sitter";

interface Profile {
  id: string;
  email: string;
  role: Role;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  profileCompletion: number;
  identityVerified: boolean;
}

interface AuthContextType {
  user: Profile | null;
  activeRole: ActiveRole;
  isAuthenticated: boolean;
  loading: boolean;
  switchRole: (role: ActiveRole) => void;
  setActiveRole: (role: ActiveRole) => void;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, role: Role) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const mapProfile = (profile: any, authEmail?: string): Profile => ({
  id: profile.id,
  email: authEmail || profile.email || "",
  role: profile.role as Role,
  firstName: profile.first_name || "",
  lastName: profile.last_name || "",
  avatarUrl: profile.avatar_url || undefined,
  profileCompletion: profile.profile_completion || 0,
  identityVerified: profile.identity_verified || false,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<Profile | null>(null);
  const [activeRole, setActiveRoleState] = useState<ActiveRole>(() => {
    const saved = localStorage.getItem('guardiens_active_role');
    return (saved === 'owner' || saved === 'sitter') ? saved : 'sitter';
  });
  const [loading, setLoading] = useState(true);
  const roleInitialized = useRef(false);

  const switchRole = useCallback((role: ActiveRole) => {
    setActiveRoleState(role);
    localStorage.setItem('guardiens_active_role', role);
  }, []);

  // Keep setActiveRole as alias for backward compat
  const setActiveRole = switchRole;

  const checkFounderExpiry = useCallback(async (userId: string, isFounder: boolean) => {
    if (!isFounder) return;
    const FOUNDER_DEADLINE = new Date("2026-06-13T23:59:59Z");
    if (new Date() <= FOUNDER_DEADLINE) return;

    const { data: subs } = await supabase
      .from("subscriptions")
      .select("status")
      .eq("user_id", userId)
      .eq("status", "active")
      .limit(1);

    if (subs && subs.length > 0) return;
  }, []);

  const fetchProfile = useCallback(async (supabaseUser: SupabaseUser) => {
    const { data } = await supabase
      .from("profiles")
      .select("id, role, first_name, last_name, avatar_url, profile_completion, identity_verified, is_founder")
      .eq("id", supabaseUser.id)
      .single();

    if (data) {
      const profile = mapProfile(data, supabaseUser.email);
      setUser(profile);

      // Only initialize role ONCE per session — never override user's manual choice
      if (!roleInitialized.current) {
        roleInitialized.current = true;
        const saved = localStorage.getItem('guardiens_active_role') as ActiveRole | null;

        if (saved === 'owner' || saved === 'sitter') {
          // Verify saved role is compatible with profile
          if (profile.role === 'both' || profile.role === saved) {
            setActiveRoleState(saved);
          } else {
            // Saved role incompatible — use profile default
            const defaultRole: ActiveRole = profile.role === 'sitter' ? 'sitter' : 'owner';
            setActiveRoleState(defaultRole);
            localStorage.setItem('guardiens_active_role', defaultRole);
          }
        } else {
          // No saved choice — default based on profile
          const defaultRole: ActiveRole = profile.role === 'sitter' ? 'sitter' : 'owner';
          setActiveRoleState(defaultRole);
          localStorage.setItem('guardiens_active_role', defaultRole);
        }
      }

      checkFounderExpiry(data.id, data.is_founder).catch(() => {});
    }
  }, [checkFounderExpiry]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setTimeout(async () => {
            await fetchProfile(session.user);
            setLoading(false);
          }, 0);
        } else {
          setUser(null);
          roleInitialized.current = false;
          setLoading(false);
        }
      }
    );

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        await fetchProfile(session.user);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const login = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }, []);

  const register = useCallback(async (email: string, password: string, role: Role) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/dashboard` },
    });
    if (error) throw error;

    // Supabase returns a user with empty identities for repeated signups
    const isRepeatedSignup =
      data.user &&
      (!data.user.identities || data.user.identities.length === 0);

    if (isRepeatedSignup) {
      throw new Error("User already registered");
    }

    if (data.user) {
      await supabase
        .from("profiles")
        .update({ role })
        .eq("id", data.user.id);

      if (role === "sitter" || role === "both") {
        await supabase
          .from("sitter_profiles")
          .upsert({ user_id: data.user.id }, { onConflict: "user_id" });
      }

      supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName: "welcome",
          recipientEmail: email,
          idempotencyKey: `welcome-${data.user.id}`,
          templateData: { firstName: "", role },
        },
      }).catch((err) => console.warn("Welcome email failed:", err));
    }

    return data;
  }, []);

  const logout = useCallback(async () => {
    localStorage.removeItem('guardiens_active_role');
    setUser(null);
    roleInitialized.current = false;
    await supabase.auth.signOut();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        activeRole,
        isAuthenticated: !!user,
        loading,
        switchRole,
        setActiveRole,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};
