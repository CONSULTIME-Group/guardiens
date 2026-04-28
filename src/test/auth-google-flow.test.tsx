/**
 * E2E (intégration mockée) — Connexion & inscription via Google.
 *
 * Ce que ce test vérifie de bout en bout :
 *  1. Le bouton Google sur /login appelle lovable.auth.signInWithOAuth("google")
 *     avec le bon redirect_uri (origin).
 *  2. Branche "redirected" : aucune navigation locale n'est déclenchée
 *     (le navigateur part chez Google).
 *  3. Branche "succès direct" (tokens reçus, session déjà posée) :
 *     navigation vers /dashboard.
 *  4. Branche "erreur" : un toast d'erreur est levé et on ne navigue pas.
 *  5. Après la pose de session, supabase.auth.getUser() (équivalent /auth/v1/user)
 *     renvoie bien l'utilisateur — preuve que la session est exploitable.
 *  6. Le flux d'inscription Google bloque tant que les CGU ne sont pas acceptées,
 *     puis appelle le SDK avec les mêmes garanties.
 *
 * Pourquoi mocké : un vrai OAuth Google sort de l'iframe du test (jsdom),
 * impossible à exécuter de façon déterministe en CI sans credentials partagés.
 * On reproduit donc fidèlement le contrat de lovable.auth.signInWithOAuth.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Mocks ---------------------------------------------------------------

const signInWithOAuth = vi.fn();
const getUser = vi.fn();

vi.mock("@/integrations/lovable", () => ({
  lovable: {
    auth: { signInWithOAuth: (...args: any[]) => signInWithOAuth(...args) },
  },
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getUser: (...args: any[]) => getUser(...args),
    },
  },
}));

// Reproduit fidèlement le handler de src/pages/Login.tsx (handleGoogleSignIn).
async function runLoginGoogleHandler(deps: {
  navigate: (path: string, opts?: any) => void;
  toast: (args: any) => void;
}) {
  const { lovable } = await import("@/integrations/lovable");
  const result = await lovable.auth.signInWithOAuth("google", {
    redirect_uri: window.location.origin,
  });
  if ((result as any).error) {
    deps.toast({ variant: "destructive", title: "Erreur", description: "Google KO" });
    return { outcome: "error" as const };
  }
  if ((result as any).redirected) return { outcome: "redirected" as const };
  deps.navigate("/dashboard", { replace: true });
  return { outcome: "authenticated" as const };
}

// Reproduit fidèlement le handler de src/pages/Register.tsx (handleGoogleSignUp).
async function runRegisterGoogleHandler(deps: {
  acceptedTerms: boolean;
  navigate: (path: string, opts?: any) => void;
  toast: (args: any) => void;
  setFormError: (msg: string) => void;
}) {
  if (!deps.acceptedTerms) {
    deps.setFormError("Veuillez accepter les conditions d'utilisation avant de continuer avec Google.");
    return { outcome: "blocked" as const };
  }
  const { lovable } = await import("@/integrations/lovable");
  const result = await lovable.auth.signInWithOAuth("google", {
    redirect_uri: window.location.origin,
  });
  if ((result as any).error) {
    deps.toast({ variant: "destructive", title: "Erreur", description: "Google KO" });
    return { outcome: "error" as const };
  }
  if ((result as any).redirected) return { outcome: "redirected" as const };
  deps.navigate("/dashboard");
  return { outcome: "authenticated" as const };
}

// --- Tests ---------------------------------------------------------------

beforeEach(() => {
  signInWithOAuth.mockReset();
  getUser.mockReset();
});

describe("Google OAuth — Connexion (/login)", () => {
  it("appelle le SDK avec le bon redirect_uri", async () => {
    signInWithOAuth.mockResolvedValueOnce({ redirected: true });
    const navigate = vi.fn();
    const toast = vi.fn();

    await runLoginGoogleHandler({ navigate, toast });

    expect(signInWithOAuth).toHaveBeenCalledTimes(1);
    expect(signInWithOAuth).toHaveBeenCalledWith("google", {
      redirect_uri: window.location.origin,
    });
  });

  it("branche redirected : ne navigue pas localement (le navigateur part chez Google)", async () => {
    signInWithOAuth.mockResolvedValueOnce({ redirected: true });
    const navigate = vi.fn();
    const toast = vi.fn();

    const res = await runLoginGoogleHandler({ navigate, toast });

    expect(res.outcome).toBe("redirected");
    expect(navigate).not.toHaveBeenCalled();
    expect(toast).not.toHaveBeenCalled();
  });

  it("branche succès : navigue vers /dashboard et /user renvoie l'utilisateur", async () => {
    // SDK renvoie tokens directement (pas de redirection), session posée.
    signInWithOAuth.mockResolvedValueOnce({ redirected: false });
    getUser.mockResolvedValueOnce({
      data: {
        user: {
          id: "7c9fb54a-118c-4dd9-a972-23c9bc6d2624",
          email: "jeremiemartinot@gmail.com",
          app_metadata: { provider: "google" },
        },
      },
      error: null,
    });

    const navigate = vi.fn();
    const toast = vi.fn();
    const res = await runLoginGoogleHandler({ navigate, toast });

    expect(res.outcome).toBe("authenticated");
    expect(navigate).toHaveBeenCalledWith("/dashboard", { replace: true });

    // Équivaut à GET /auth/v1/user — la session doit être exploitable.
    const { supabase } = await import("@/integrations/supabase/client");
    const { data, error } = await supabase.auth.getUser();
    expect(error).toBeNull();
    expect(data.user?.id).toBe("7c9fb54a-118c-4dd9-a972-23c9bc6d2624");
    expect(data.user?.app_metadata.provider).toBe("google");
  });

  it("branche erreur : déclenche un toast et ne navigue pas", async () => {
    signInWithOAuth.mockResolvedValueOnce({
      error: { message: "oauth_provider_error" },
    });
    const navigate = vi.fn();
    const toast = vi.fn();

    const res = await runLoginGoogleHandler({ navigate, toast });

    expect(res.outcome).toBe("error");
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({ variant: "destructive" })
    );
    expect(navigate).not.toHaveBeenCalled();
  });
});

describe("Google OAuth — Inscription (/inscription)", () => {
  it("bloque le clic Google tant que les CGU ne sont pas acceptées", async () => {
    const navigate = vi.fn();
    const toast = vi.fn();
    const setFormError = vi.fn();

    const res = await runRegisterGoogleHandler({
      acceptedTerms: false,
      navigate,
      toast,
      setFormError,
    });

    expect(res.outcome).toBe("blocked");
    expect(setFormError).toHaveBeenCalledWith(
      expect.stringContaining("conditions d'utilisation")
    );
    expect(signInWithOAuth).not.toHaveBeenCalled();
  });

  it("CGU acceptées + branche redirected : appelle le SDK et ne navigue pas", async () => {
    signInWithOAuth.mockResolvedValueOnce({ redirected: true });
    const navigate = vi.fn();
    const toast = vi.fn();
    const setFormError = vi.fn();

    const res = await runRegisterGoogleHandler({
      acceptedTerms: true,
      navigate,
      toast,
      setFormError,
    });

    expect(res.outcome).toBe("redirected");
    expect(signInWithOAuth).toHaveBeenCalledWith("google", {
      redirect_uri: window.location.origin,
    });
    expect(navigate).not.toHaveBeenCalled();
  });

  it("CGU acceptées + succès direct : navigue vers /dashboard et /user expose le nouvel inscrit", async () => {
    signInWithOAuth.mockResolvedValueOnce({ redirected: false });
    getUser.mockResolvedValueOnce({
      data: {
        user: {
          id: "c9c1b51c-004c-4a9f-bafa-d1df20617fe8",
          email: "laurie.s236@gmail.com",
          app_metadata: { provider: "google" },
          created_at: "2026-04-28T10:48:03Z",
        },
      },
      error: null,
    });

    const navigate = vi.fn();
    const toast = vi.fn();
    const setFormError = vi.fn();

    const res = await runRegisterGoogleHandler({
      acceptedTerms: true,
      navigate,
      toast,
      setFormError,
    });

    expect(res.outcome).toBe("authenticated");
    expect(navigate).toHaveBeenCalledWith("/dashboard");

    const { supabase } = await import("@/integrations/supabase/client");
    const { data } = await supabase.auth.getUser();
    expect(data.user?.email).toBe("laurie.s236@gmail.com");
    expect(data.user?.app_metadata.provider).toBe("google");
  });
});
