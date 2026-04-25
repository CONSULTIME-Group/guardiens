/**
 * Mock du contexte d'authentification utilisé UNIQUEMENT en mode visual-test
 * (alias Vite). Lit le scénario actif depuis l'URL et expose un user statique
 * + activeRole figé.
 */
import React, { createContext, useContext } from "react";
import { SCENARIOS, type Scenario, type ScenarioId } from "../../tests/visual/fixtures";

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

function getActiveScenario(): Scenario | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const id = params.get("scenario") as ScenarioId | null;
  return id && SCENARIOS[id] ? SCENARIOS[id] : null;
}

function buildProfile(scn: Scenario): Profile {
  return {
    id: scn.viewer.id,
    email: scn.viewer.email,
    role: scn.viewer.role,
    firstName: scn.viewer.firstName,
    lastName: scn.viewer.lastName,
    avatarUrl: undefined,
    profileCompletion: 90,
    identityVerified: true,
    isFounder: true,
    onboardingCompleted: true,
    onboardingMinimalCompleted: true,
    onboardingDismissedAt: null,
  };
}

const noop = async () => {};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // CRITIQUE : on capture le scénario UNE SEULE FOIS au mount via useState
  // (lazy initializer). Sans ça, dès qu'un `<Navigate>` change l'URL en `/login`,
  // la query string `?scenario=...` disparaît, getActiveScenario() retourne null,
  // user devient null, et on boucle infiniment sur la redirection.
  const [scn] = React.useState<Scenario | null>(() => getActiveScenario());
  const user = scn ? buildProfile(scn) : null;
  const activeRole: ActiveRole = scn?.activeRole ?? "sitter";

  const value: AuthContextType = {
    user,
    activeRole,
    isAuthenticated: !!user,
    loading: false,
    switchRole: () => {},
    setActiveRole: () => {},
    login: noop as any,
    register: noop as any,
    logout: () => {},
    refreshProfile: noop as any,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    // En mode visual-test on tolère l'absence de provider — utile pour les
    // composants qui montent useAuth() en dehors de l'arbre principal.
    return {
      user: null,
      activeRole: "sitter" as ActiveRole,
      isAuthenticated: false,
      loading: false,
      switchRole: () => {},
      setActiveRole: () => {},
      login: noop as any,
      register: noop as any,
      logout: () => {},
      refreshProfile: noop as any,
    };
  }
  return context;
};
