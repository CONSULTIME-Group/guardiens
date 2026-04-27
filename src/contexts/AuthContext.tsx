import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { getSignupRedirectUrl } from "@/lib/authRedirect";

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
  isFounder: boolean;
  onboardingCompleted: boolean;
  onboardingMinimalCompleted: boolean;
  onboardingDismissedAt: string | null;
}

interface AuthContextType {
  user: Profile | null;
  activeRole: ActiveRole;
  isAuthenticated: boolean;
  loading: boolean;
  switchRole: (role: ActiveRole) => void;
  setActiveRole: (role: ActiveRole) => void;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, role: Role) => Promise<any>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
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
  isFounder: profile.is_founder || false,
  onboardingCompleted: profile.onboarding_completed || false,
  onboardingMinimalCompleted: profile.onboarding_minimal_completed ?? false,
  onboardingDismissedAt: profile.onboarding_dismissed_at || null,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<Profile | null>(null);
  const [activeRole, setActiveRoleState] = useState<ActiveRole>(() => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem('guardiens_active_role');
    } catch {
      saved = null;
    }
    return (saved === 'owner' || saved === 'sitter') ? saved : 'sitter';
  });
  const [loading, setLoading] = useState(true);
  const roleInitialized = useRef(false);

  const switchRole = useCallback((role: ActiveRole) => {
    setActiveRoleState(role);
    try {
      localStorage.setItem('guardiens_active_role', role);
    } catch {}
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
      .select("id, role, first_name, last_name, avatar_url, profile_completion, identity_verified, is_founder, onboarding_completed, onboarding_minimal_completed, onboarding_dismissed_at")
      .eq("id", supabaseUser.id)
      .single();

    if (data) {
      const profile = mapProfile(data, supabaseUser.email);
      setUser(profile);

      // Only initialize role ONCE per session — never override user's manual choice
      if (!roleInitialized.current) {
        roleInitialized.current = true;
        let saved: ActiveRole | null = null;
        try {
          saved = localStorage.getItem('guardiens_active_role') as ActiveRole | null;
        } catch {
          saved = null;
        }

        if (saved === 'owner' || saved === 'sitter') {
          // Verify saved role is compatible with profile
          if (profile.role === 'both' || profile.role === saved) {
            setActiveRoleState(saved);
          } else {
            // Saved role incompatible — use profile default
            const defaultRole: ActiveRole = profile.role === 'sitter' ? 'sitter' : 'owner';
            setActiveRoleState(defaultRole);
            try {
              localStorage.setItem('guardiens_active_role', defaultRole);
            } catch {}
          }
        } else {
          // No saved choice — default based on profile
          const defaultRole: ActiveRole = profile.role === 'sitter' ? 'sitter' : 'owner';
          setActiveRoleState(defaultRole);
          try {
            localStorage.setItem('guardiens_active_role', defaultRole);
          } catch {}
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
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      if (data.user) {
        await fetchProfile(data.user);
      }
    } finally {
      setLoading(false);
    }
  }, [fetchProfile]);

  const register = useCallback(async (email: string, password: string, role: Role) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: getSignupRedirectUrl(),
        data: { role },
      },
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
      // If there's an active session (auto-confirm enabled), update profile now
      if (data.session) {
        await supabase
          .from("profiles")
          .update({ role })
          .eq("id", data.user.id);

        if (role === "sitter" || role === "both") {
          await supabase
            .from("sitter_profiles")
            .upsert({ user_id: data.user.id }, { onConflict: "user_id" });
        }

        if (role === "owner" || role === "both") {
          await supabase
            .from("owner_profiles")
            .upsert({ user_id: data.user.id } as any, { onConflict: "user_id" });
        }
      }
      // If no session (email confirmation required), role is stored in user metadata
      // and will be applied when the user confirms their email via handle_new_user_role trigger

      // Note: l'email de bienvenue est désormais fusionné dans l'email de confirmation
      // d'inscription (template signup.tsx) pour éviter d'envoyer deux emails à la suite.
      // Le template "welcome" reste disponible pour d'autres usages (resend-welcome-batch).

      // Pre-set activeRole so the first dashboard load matches the chosen role
      const initialActive: ActiveRole = role === "sitter" ? "sitter" : "owner";
      try {
        localStorage.setItem("guardiens_active_role", initialActive);
      } catch {}
      setActiveRoleState(initialActive);
    }

    return data;
  }, []);

  const logout = useCallback(async () => {
    try {
      localStorage.removeItem('guardiens_active_role');
    } catch {}
    setUser(null);
    roleInitialized.current = false;
    await supabase.auth.signOut();
  }, []);

  const refreshProfile = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      await fetchProfile(session.user);
    }
  }, [fetchProfile]);

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
        refreshProfile,
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
