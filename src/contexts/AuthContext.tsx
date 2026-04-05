import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
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
  setActiveRole: (role: ActiveRole) => void;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, role: Role) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const mapProfile = (profile: any): Profile => ({
  id: profile.id,
  email: profile.email || "",
  role: profile.role as Role,
  firstName: profile.first_name || "",
  lastName: profile.last_name || "",
  avatarUrl: profile.avatar_url || undefined,
  profileCompletion: profile.profile_completion || 0,
  identityVerified: profile.identity_verified || false,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<Profile | null>(null);
  const [activeRole, setActiveRole] = useState<ActiveRole>("sitter");
  const [loading, setLoading] = useState(true);

  const checkFounderExpiry = useCallback(async (userId: string, isFounder: boolean) => {
    if (!isFounder) return;
    const FOUNDER_DEADLINE = new Date("2026-06-13T23:59:59Z");
    if (new Date() <= FOUNDER_DEADLINE) return;

    // Check if they have an active/trial subscription
    const { data: subs } = await supabase
      .from("abonnements")
      .select("statut")
      .eq("user_id", userId)
      .in("statut", ["trial", "active"])
      .limit(1);

    if (subs && subs.length > 0) return;

    // Expire their subscription
    await supabase
      .from("abonnements")
      .update({ statut: "expired" } as any)
      .eq("user_id", userId);
  }, []);

  const fetchProfile = useCallback(async (supabaseUser: SupabaseUser) => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", supabaseUser.id)
      .single();

    if (data) {
      const profile = mapProfile(data);
      setUser(profile);
      if (profile.role === "owner") setActiveRole("owner");
      else setActiveRole("sitter");

      // Check founder expiry in background
      checkFounderExpiry(data.id, data.is_founder).catch(console.warn);
    }
  }, [checkFounderExpiry]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          // Use setTimeout to avoid Supabase auth deadlock
          setTimeout(async () => {
            await fetchProfile(session.user);
            setLoading(false);
          }, 0);
        } else {
          setUser(null);
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

    // Update profile with selected role
    if (data.user) {
      await supabase
        .from("profiles")
        .update({ role })
        .eq("id", data.user.id);

      // Auto-create sitter_profile if role is sitter or both
      if (role === "sitter" || role === "both") {
        await supabase
          .from("sitter_profiles")
          .upsert({ user_id: data.user.id }, { onConflict: "user_id" });
      }

      // Send welcome email (fire-and-forget)
      supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName: "welcome",
          recipientEmail: email,
          idempotencyKey: `welcome-${data.user.id}`,
          templateData: { firstName: "", role },
        },
      }).catch((err) => console.warn("Welcome email failed:", err));
    }
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        activeRole,
        isAuthenticated: !!user,
        loading,
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
