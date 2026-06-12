import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { getSignupRedirectUrl } from "@/lib/authRedirect";
import { sanitizeRedirect, buildRedirectQuery } from "@/lib/safeRedirect";
import { Eye, EyeOff, ArrowLeft } from "lucide-react";
import { getAuthFieldAttrs } from "@/lib/inAppBrowser";
import { mapAuthError } from "@/lib/authErrorMessages";
import { InAppBrowserBanner } from "@/components/auth/InAppBrowserBanner";
import { AuthIllustrationPanel } from "@/components/auth/AuthIllustrationPanel";
import { trackEvent } from "@/lib/analytics";
import { startOAuthFlow, logOAuthStage, endOAuthFlow } from "@/lib/oauthLogger";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const Login = () => {
  const { t } = useTranslation();
  const [capsLockOn, setCapsLockOn] = useState(false);
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
  const redirectTarget = sanitizeRedirect(searchParams.get("redirect"));
  const postAuthTarget = redirectTarget ?? "/dashboard";

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    startOAuthFlow("/login");
    try {
      trackEvent("login_completed", { source: "/login", metadata: { method: "google", stage: "started" } });
    } catch {}
    const googleRedirectUrl = `${window.location.origin}${postAuthTarget}`;
    logOAuthStage("sdk_called", "/login", { redirect_uri: googleRedirectUrl });
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: googleRedirectUrl,
      extraParams: {
        prompt: "select_account",
        ...(email.trim() ? { login_hint: email.trim().toLowerCase() } : {}),
      },
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
    navigate(postAuthTarget, { replace: true });
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
      navigate(postAuthTarget, { replace: true });
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
              title: t("login_page.email_resent_title"),
              description: t("login_page.email_resent_body"),
            });
          }
        };
        toast({
          variant: "destructive",
          title: info.title,
          description: info.description,
          action: (
            <ToastAction altText={t("login_page.resend_email")} onClick={handleResend}>
              {t("login_page.resend_email")}
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
      <Helmet>
        <title>{t("login_page.meta_title")}</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <AuthIllustrationPanel
        title={t("login_page.panel_title")}
        tagline={t("login_page.panel_tagline")}
        description={t("login_page.panel_description")}
      />

      <div className="flex-1 flex items-center justify-center px-6 py-6 md:py-12">
        <div className="w-full max-w-md">
          <Link
            to="/"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6 gap-1"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {t("auth_common.back_to_site")}
          </Link>
          <div className="text-center mb-6 md:mb-10">
            <Link to="/" className="inline-block">
              <h1 className="font-heading text-2xl md:text-3xl font-bold mb-2 hover:opacity-80 transition-opacity">
                <span className="text-primary">g</span>uardiens
              </h1>
            </Link>
            <p className="text-muted-foreground">{t("login_page.welcome_back")}</p>
          </div>

          <InAppBrowserBanner className="mb-6" />

          <Button
            type="button"
            variant="outline"
            size="lg"
            className="w-full mb-3"
            onClick={handleGoogleSignIn}
            disabled={isGoogleLoading || isLoading}
          >
            <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            {isGoogleLoading ? t("login_page.google_loading") : t("login_page.google_continue")}
          </Button>

          <p className="text-center text-[11px] text-muted-foreground mb-4 leading-relaxed px-2 sm:px-4">
            {t("login_page.gdpr_prefix")}{" "}
            <Link to="/cgu" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">
              {t("login_page.gdpr_terms")}
            </Link>{" "}
            {t("login_page.gdpr_and")}{" "}
            <Link to="/confidentialite" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">
              {t("login_page.gdpr_privacy")}
            </Link>.{" "}
            <Popover>
              <PopoverTrigger asChild>
                <button type="button" className="underline hover:text-foreground">
                  {t("login_page.gdpr_details")}
                </button>
              </PopoverTrigger>
              <PopoverContent className="text-[11px] leading-relaxed w-72">
                {t("login_page.gdpr_popover")}
              </PopoverContent>
            </Popover>
          </p>


          <div className="relative my-6" role="separator">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">{t("login_page.or_email")}</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">{t("auth_common.email")}</Label>
              <Input
                id="email"
                type="email"
                placeholder={t("auth_common.email_placeholder")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus={!email}
                className="rounded-lg h-12"
                {...getAuthFieldAttrs("email")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t("auth_common.password")}</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder={t("login_page.password_placeholder")}
                  value={password}
                  autoFocus={!!email}
                  onChange={(e) => { setPassword(e.target.value); setPasswordError(null); }}
                  onKeyDown={(e) => setCapsLockOn(e.getModifierState && e.getModifierState("CapsLock"))}
                  onKeyUp={(e) => setCapsLockOn(e.getModifierState && e.getModifierState("CapsLock"))}
                  onBlur={() => setCapsLockOn(false)}
                  required
                  className="rounded-lg h-12 pr-12"
                  aria-describedby={capsLockOn ? "capslock-hint" : undefined}
                  {...getAuthFieldAttrs("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? t("auth_common.hide_password") : t("auth_common.show_password")}
                  aria-pressed={showPassword}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" aria-hidden="true" /> : <Eye className="h-5 w-5" aria-hidden="true" />}
                </button>
              </div>
              {capsLockOn && (
                <p id="capslock-hint" className="text-xs text-warning-foreground">
                  {t("auth_common.capslock_on")}
                </p>
              )}
              {passwordError && (
                <div className="space-y-2">
                  <p className="text-sm text-destructive">{passwordError}</p>
                  {failedAttempts >= 2 && (
                    <Link to={`/inscription${(() => {
                      const params = new URLSearchParams();
                      if (email) params.set("email", email);
                      if (redirectTarget) params.set("redirect", redirectTarget);
                      const qs = params.toString();
                      return qs ? `?${qs}` : "";
                    })()}`} className="text-sm text-primary hover:underline">
                      {t("login_page.no_account_prompt")}
                    </Link>
                  )}
                </div>
              )}
            </div>
            <div className="flex justify-end">
              <Link to="/forgot-password" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                {t("login_page.forgot")}
              </Link>
            </div>
            <Button type="submit" className="w-full" size="lg" disabled={isLoading || isGoogleLoading}>
              {isLoading ? t("login_page.submitting") : t("login_page.submit")}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            {t("login_page.no_account")}{" "}
            <Link to={`/inscription${buildRedirectQuery(redirectTarget)}`} className="text-primary font-medium hover:underline">{t("login_page.create_account")}</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
