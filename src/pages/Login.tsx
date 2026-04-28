import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { getSignupRedirectUrl } from "@/lib/authRedirect";
import { Eye, EyeOff, ArrowLeft } from "lucide-react";
import { getAuthFieldAttrs } from "@/lib/inAppBrowser";
import { mapAuthError } from "@/lib/authErrorMessages";
import { InAppBrowserBanner } from "@/components/auth/InAppBrowserBanner";
import { AuthIllustrationPanel } from "@/components/auth/AuthIllustrationPanel";
import { trackEvent } from "@/lib/analytics";
import { startOAuthFlow, logOAuthStage, endOAuthFlow } from "@/lib/oauthLogger";

const Login = () => {
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const { login } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    startOAuthFlow("/login");
    try {
      trackEvent("login_completed", { source: "/login", metadata: { method: "google", stage: "started" } });
    } catch {}
    logOAuthStage("sdk_called", "/login", { redirect_uri: window.location.origin });
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      const info = mapAuthError(result.error as any);
      logOAuthStage("error", "/login", { code: info.code, title: info.title });
      endOAuthFlow("error");
      toast({ variant: "destructive", title: info.title, description: info.description });
      setIsGoogleLoading(false);
      return;
    }
    if (result.redirected) {
      logOAuthStage("redirecting", "/login");
      return;
    }
    logOAuthStage("tokens_received", "/login");
    navigate("/dashboard", { replace: true });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setPasswordError(null);
    try {
      trackEvent("login_completed", { source: "/login", metadata: { method: "email", stage: "started" } });
    } catch {}
    try {
      await login(email.trim().toLowerCase(), password);
      try {
        trackEvent("login_completed", { source: "/login", metadata: { method: "email", stage: "success" } });
      } catch {}
      navigate("/dashboard", { replace: true });
    } catch (error: any) {
      const info = mapAuthError(error);
      try {
        trackEvent("login_completed", {
          source: "/login",
          metadata: { method: "email", stage: "failed", error_code: info.code },
        });
      } catch {}

      if (info.code === "invalid_credentials") {
        setPasswordError(`${info.title}. ${info.description ?? ""}`.trim());
        setFailedAttempts((n) => n + 1);
      } else if (info.code === "email_not_confirmed") {
        const handleResend = async () => {
          const { error: resendError } = await supabase.auth.resend({
            type: "signup",
            email,
            options: { emailRedirectTo: getSignupRedirectUrl() },
          });
          if (resendError) {
            const resendInfo = mapAuthError(resendError);
            toast({ variant: "destructive", title: resendInfo.title, description: resendInfo.description });
          } else {
            toast({
              title: "Email renvoyé",
              description: "Un nouvel email de confirmation vient d'être envoyé.",
            });
          }
        };
        toast({
          variant: "destructive",
          title: info.title,
          description: info.description,
          action: (
            <ToastAction altText="Renvoyer" onClick={handleResend}>
              Renvoyer l'email
            </ToastAction>
          ),
        });
      } else if (info.code === "rate_limited") {
        setPasswordError(`${info.title}. ${info.description ?? ""}`.trim());
      } else {
        toast({ variant: "destructive", title: info.title, description: info.description });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      <Helmet><meta name="robots" content="noindex, nofollow" /></Helmet>

      <AuthIllustrationPanel
        title="L'entraide locale, retrouvée"
        tagline="Un coup de main, un lien de confiance."
        description="Un gardien de votre région veille sur votre maison et vos animaux. Et entre gens du coin, on ose à nouveau demander, et proposer un coup de main."
      />

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <Link
            to="/"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6 gap-1"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Retour au site
          </Link>
          <div className="text-center mb-10">
            <Link to="/" className="inline-block">
              <h1 className="font-heading text-3xl font-bold mb-2 hover:opacity-80 transition-opacity">
                <span className="text-primary">g</span>uardiens
              </h1>
            </Link>
            <p className="text-muted-foreground">Content de vous revoir</p>
          </div>

          <InAppBrowserBanner className="mb-6" />

          {/* Google Sign-In */}
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="w-full mb-4"
            onClick={handleGoogleSignIn}
            disabled={isGoogleLoading || isLoading}
          >
            <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            {isGoogleLoading ? "Connexion…" : "Continuer avec Google"}
          </Button>

          {/* Clickwrap implicite : si l'utilisateur crée un compte via Google depuis /login
              (premier OAuth), il n'a pas vu la case CGU de /inscription. On l'informe ici. */}
          <p className="text-center text-[11px] text-muted-foreground -mt-2 mb-4 leading-snug">
            En continuant avec Google, vous acceptez nos{" "}
            <Link to="/cgu" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">
              conditions d'utilisation
            </Link>{" "}
            et notre{" "}
            <Link to="/confidentialite" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">
              politique de confidentialité
            </Link>.
          </p>

          <div className="relative my-6" role="separator">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">ou avec votre email</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="vous@exemple.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="rounded-lg h-12"
                {...getAuthFieldAttrs("email")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Votre mot de passe"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setPasswordError(null); }}
                  required
                  className="rounded-lg h-12 pr-12"
                  {...getAuthFieldAttrs("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                  aria-pressed={showPassword}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" aria-hidden="true" /> : <Eye className="h-5 w-5" aria-hidden="true" />}
                </button>
              </div>
              {passwordError && (
                <div className="space-y-2">
                  <p className="text-sm text-destructive">{passwordError}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                    <Link to="/forgot-password" className="text-primary hover:underline">
                      Mot de passe oublié ?
                    </Link>
                    {failedAttempts >= 2 && (
                      <Link to={`/inscription${email ? `?email=${encodeURIComponent(email)}` : ""}`} className="text-primary hover:underline">
                        Pas encore de compte ? Inscrivez-vous
                      </Link>
                    )}
                  </div>
                </div>
              )}
            </div>
            {!passwordError && (
              <div className="flex justify-end">
                <Link to="/forgot-password" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Mot de passe oublié ?
                </Link>
              </div>
            )}
            <Button type="submit" className="w-full" size="lg" disabled={isLoading || isGoogleLoading}>
              {isLoading ? "Connexion..." : "Se connecter"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Pas encore de compte ?{" "}
            <Link to="/inscription" className="text-primary font-medium hover:underline">Créer un compte</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
