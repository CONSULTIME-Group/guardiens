import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { getSignupRedirectUrl } from "@/lib/authRedirect";
import { getOAuthTraceId, logOAuthStage, endOAuthFlow } from "@/lib/oauthLogger";

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
  hasSession: boolean;
  authChecked: boolean;
  /** Vrai uniquement sur un échec avéré de lecture du profil, jamais sur un simple délai. */
  profileError: boolean;
  /** Vrai quand la vérification distante n'a pas répondu dans le délai prévu. */
  authTimeout: boolean;
  switchRole: (role: ActiveRole) => void;
  setActiveRole: (role: ActiveRole) => void;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, role: Role, nextPath?: string) => Promise<any>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

class AuthTimeoutError extends Error {
  constructor() {
    super("Auth timeout");
    this.name = "AuthTimeoutError";
  }
}

const isAuthTimeoutError = (error: unknown): error is AuthTimeoutError =>
  error instanceof AuthTimeoutError;

const isInvalidSessionError = (error: unknown): boolean => {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { status?: number; code?: string; name?: string; message?: string };
  const details = `${candidate.code ?? ""} ${candidate.name ?? ""} ${candidate.message ?? ""}`.toLowerCase();
  return candidate.status === 401
    || details.includes("jwt expired")
    || details.includes("invalid jwt")
    || details.includes("invalid token")
    || details.includes("session_not_found")
    || details.includes("session not found");
};

/**
 * Détection synchrone d'un token Supabase persistant en localStorage.
 * Utilisée en initialisation paresseuse de `hasSession`, pour que le premier
 * rendu connaisse déjà la présence probable d'une session (pas de permutation
 * de coquille après le premier paint). Protégée pour le SSR et le prerender.
 */
export const detectPersistedToken = (): boolean => {
  try {
    if (typeof window === "undefined" || !window.localStorage) return false;
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key && /^sb-.*-auth-token$/.test(key)) {
        const raw = window.localStorage.getItem(key);
        if (raw && raw.length > 2) return true;
      }
    }
  } catch {
    return false;
  }
  return false;
};

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
  const [hasSession, setHasSession] = useState(() => detectPersistedToken());
  const [authChecked, setAuthChecked] = useState(false);
  const [profileError, setProfileError] = useState(false);
  const [authTimeout, setAuthTimeout] = useState(false);
  const roleInitialized = useRef(false);
  const userRef = useRef<Profile | null>(null);
  const settledRef = useRef(false);

  const clearInvalidSession = useCallback(() => {
    settledRef.current = true;
    userRef.current = null;
    setUser(null);
    setHasSession(false);
    setAuthChecked(true);
    setProfileError(false);
    setAuthTimeout(false);
    setLoading(false);
    roleInitialized.current = false;
    void supabase.auth.signOut({ scope: "local" }).catch(() => {});
  }, []);

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
    const FOUNDER_DEADLINE = new Date("2026-09-30T23:59:59Z");
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
    setAuthTimeout(false);
    const profileRequest = supabase
      .from("profiles")
      .select("id, role, first_name, last_name, avatar_url, profile_completion, identity_verified, is_founder, onboarding_completed, onboarding_minimal_completed, onboarding_dismissed_at")
      .eq("id", supabaseUser.id)
      .single();

    let timeoutId: ReturnType<typeof window.setTimeout> | undefined;
    const profileTimeout = new Promise<never>((_, reject) => {
      timeoutId = window.setTimeout(() => reject(new AuthTimeoutError()), 8000);
    });

    let result: Awaited<typeof profileRequest>;
    try {
      result = await Promise.race([profileRequest, profileTimeout]);
    } catch (error) {
      if (isAuthTimeoutError(error)) {
        setHasSession(false);
        setAuthChecked(true);
        setAuthTimeout(true);
        setLoading(false);
      }
      throw error;
    } finally {
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
    }

    const { data, error } = result;

    if (error || !data) throw error ?? new Error("Profil introuvable");

    if (data) {
      const profile = mapProfile(data, supabaseUser.email);
      userRef.current = profile;
      setUser(profile);
      setProfileError(false);
      setAuthTimeout(false);

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
    // Au montage : si un flux OAuth est actif (trace_id présent en sessionStorage),
    // on logge le "callback_returned" pour matérialiser le retour depuis Google.
    if (getOAuthTraceId()) {
      logOAuthStage("callback_returned", "auth-context", {
        href_path: typeof window !== "undefined" ? window.location.pathname : null,
      });
    }

    // (A) Token persistant déjà détecté en initialisation paresseuse (voir
    // detectPersistedToken) : on maintient authChecked=false (squelette) le
    // temps que le refresh se résolve.
    const hasPersistedToken = detectPersistedToken();

    settledRef.current = false;
    const markChecked = (session: boolean) => {
      settledRef.current = true;
      setHasSession(session);
      setAuthChecked(true);
      setAuthTimeout(false);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          markChecked(true);
          // Si un flux OAuth est en cours, on trace la pose de session.
          if (getOAuthTraceId()) {
            logOAuthStage("session_set", "auth-context", {
              event,
              provider: (session.user.app_metadata as any)?.provider ?? null,
            });
          }
          setTimeout(async () => {
            try {
              await fetchProfile(session.user);
              setHasSession(true);
              setAuthChecked(true);
              setProfileError(false);
              if (getOAuthTraceId()) {
                logOAuthStage("user_endpoint_ok", "auth-context");
                endOAuthFlow("success");
              }
            } catch (error) {
              if (isAuthTimeoutError(error)) return;
              if (isInvalidSessionError(error)) {
                clearInvalidSession();
              } else {
                // Échec avéré de lecture du profil avec une session valide.
                setHasSession(true);
                setAuthChecked(true);
                setProfileError(true);
              }
            } finally {
              setLoading(false);
            }
          }, 0);
        } else {
          // (B) INITIAL_SESSION à null + token persistant : on attend
          // SIGNED_IN / TOKEN_REFRESHED ou la résolution de getSession().
          if (event === "INITIAL_SESSION" && hasPersistedToken && !settledRef.current) {
            return;
          }
          markChecked(false);
          userRef.current = null;
          setUser(null);
          setProfileError(false);
          roleInitialized.current = false;
          setLoading(false);
        }
      }
    );

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        markChecked(true);
        try {
          await fetchProfile(session.user);
          setHasSession(true);
          setAuthChecked(true);
          setProfileError(false);
        } catch (error) {
          if (isAuthTimeoutError(error)) return;
          if (isInvalidSessionError(error)) {
            clearInvalidSession();
          } else {
            // Session valide, lecture du profil en échec avéré.
            setHasSession(true);
            setAuthChecked(true);
            setProfileError(true);
          }
        }
      } else {
        markChecked(false);
        setProfileError(false);
      }
      setLoading(false);
    }).catch((error) => {
      if (isInvalidSessionError(error) || !hasPersistedToken) {
        clearInvalidSession();
      } else {
        setHasSession(false);
        setAuthChecked(true);
        setAuthTimeout(true);
      }
      setLoading(false);
    });

    // (C) Timeout court : sans token persistant, libère le parcours visiteur.
    // Avec un token probable, conserve le chargement pour éviter toute bascule.
    const safety = window.setTimeout(() => {
      setAuthChecked(true);
      if (!hasPersistedToken && !settledRef.current && !userRef.current) {
        setHasSession(false);
        setLoading(false);
      }
    }, 1500);

    // Ce délai couvre getSession. fetchProfile possède son propre délai afin
    // qu'une session déjà résolue ne puisse pas laisser le chargement bloqué.
    const extendedSafety = window.setTimeout(() => {
      if (hasPersistedToken && !settledRef.current && !userRef.current) {
        setHasSession(false);
        setAuthChecked(true);
        setAuthTimeout(true);
        setLoading(false);
      }
    }, 8000);

    return () => {
      subscription.unsubscribe();
      window.clearTimeout(safety);
      window.clearTimeout(extendedSafety);
    };
  }, [clearInvalidSession, fetchProfile]);

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      if (data.user) {
        // La session posée fait foi : une erreur de lecture du profil ne doit
        // jamais faire échouer la connexion, le profil sera rechargé ensuite.
        try {
          await fetchProfile(data.user);
        } catch (error) {
          if (isAuthTimeoutError(error)) return;
          if (isInvalidSessionError(error)) {
            clearInvalidSession();
          } else {
            setHasSession(true);
            setAuthChecked(true);
            setProfileError(true);
          }
        }
      }
    } finally {
      setLoading(false);
    }
  }, [clearInvalidSession, fetchProfile]);

  const register = useCallback(async (email: string, password: string, role: Role, nextPath?: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: getSignupRedirectUrl(nextPath),
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
    userRef.current = null;
    setUser(null);
    setHasSession(false);
    setProfileError(false);
    setAuthTimeout(false);
    roleInitialized.current = false;
    await supabase.auth.signOut();
  }, []);

  const refreshProfile = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      try {
        await fetchProfile(session.user);
      } catch (error) {
        if (isAuthTimeoutError(error)) throw error;
        if (isInvalidSessionError(error)) {
          clearInvalidSession();
        } else {
          setHasSession(true);
          setProfileError(true);
        }
        throw error;
      }
    }
  }, [clearInvalidSession, fetchProfile]);

  return (
    <AuthContext.Provider
      value={{
        user,
        activeRole,
        isAuthenticated: !!user || hasSession,
        loading,
        hasSession,
        authChecked,
        profileError,
        authTimeout,
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
