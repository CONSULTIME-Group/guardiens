import { useEffect, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useNavigate } from "react-router-dom";
import { Loader2, MailCheck, AlertTriangle, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { trackEventWithUserId } from "@/lib/analytics";

const AuthConfirm = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const handled = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const url = new URL(window.location.href);
    const rawNext = url.searchParams.get("next") || "/dashboard";
    const next = /^\/(?!\/)/.test(rawNext) ? rawNext : "/dashboard";

    const hashParams = new URLSearchParams(window.location.hash.replace("#", ""));
    const hashError = hashParams.get("error_description") || hashParams.get("error");
    if (hashError) {
      setError(hashError);
      return;
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (
          event === "SIGNED_IN" ||
          event === "PASSWORD_RECOVERY" ||
          event === "TOKEN_REFRESHED"
        ) {
          subscription.unsubscribe();

          if (event === "PASSWORD_RECOVERY") {
            toast({
              title: t("auth_confirm.recovery_validated_title"),
              description: t("auth_confirm.recovery_validated_body"),
            });
            navigate("/reset-password", { replace: true });
          } else {
            try {
              const userId = session?.user?.id ?? null;
              if (userId) {
                const flagKey = `email_confirmed_tracked_${userId}`;
                if (!localStorage.getItem(flagKey)) {
                  localStorage.setItem(flagKey, "1");

                  let role: string | null = null;
                  try {
                    const { data: prof } = await supabase
                      .from("profiles")
                      .select("role")
                      .eq("id", userId)
                      .maybeSingle();
                    role = (prof?.role as string | undefined) ?? null;
                  } catch { /* silencieux */ }

                  trackEventWithUserId(userId, "signup_email_confirmed", {
                    source: "/auth/confirm",
                    metadata: { user_id: userId, role, via: "email_link" },
                  });
                  const completedKey = `signup_completed_tracked_${userId}`;
                  if (!localStorage.getItem(completedKey)) {
                    localStorage.setItem(completedKey, "1");
                    trackEventWithUserId(userId, "signup_completed", {
                      source: "/auth/confirm",
                      metadata: { user_id: userId, role, auto_confirmed: false, via: "email_link" },
                    });
                  }
                }
              }
            } catch { /* silencieux */ }

            toast({
              title: t("auth_confirm.confirmed_title"),
              description: t("auth_confirm.confirmed_body"),
            });
            navigate(next, { replace: true });
          }
        }
      }
    );

    const tokenHash = url.searchParams.get("token_hash");
    const type = url.searchParams.get("type");

    if (tokenHash && (type === "signup" || type === "email" || type === "recovery")) {
      supabase.auth.verifyOtp({ token_hash: tokenHash, type }).then(({ error }) => {
        if (error) {
          console.error("OTP verification failed:", error.message);
          setError(error.message);
        }
      });
    }

    const timeout = setTimeout(async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        subscription.unsubscribe();
        navigate(next, { replace: true });
        return;
      }
      subscription.unsubscribe();
      setError(t("auth_confirm.expired_fallback"));
    }, 15000);

    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, [navigate, toast, t]);

  const handleResend = async () => {
    setResending(true);
    const email = window.prompt(t("auth_confirm.prompt_email"));
    if (!email) {
      setResending(false);
      return;
    }
    const { error: resendError } = await supabase.auth.resend({
      type: "signup",
      email,
    });
    setResending(false);
    if (resendError) {
      toast({
        variant: "destructive",
        title: t("auth_confirm.error_toast_title"),
        description: resendError.message,
      });
    } else {
      setResent(true);
      toast({
        title: t("auth_confirm.resend_toast_title"),
        description: t("auth_confirm.resend_toast_body"),
      });
    }
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-6">
        <Helmet><meta name="robots" content="noindex, nofollow" /></Helmet>
        <div className="w-full max-w-md rounded-3xl border border-border bg-card p-8 text-center shadow-sm">
          <AlertTriangle className="mx-auto mb-4 h-10 w-10 text-destructive" />
          <h1 className="font-heading text-2xl font-semibold text-foreground">{t("auth_confirm.invalid_title")}</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            {error.includes("expired")
              ? t("auth_confirm.expired_body")
              : error}
          </p>
          <div className="mt-6 flex flex-col gap-3">
            {!resent && (
              <Button onClick={handleResend} disabled={resending} className="gap-2">
                <RefreshCw className={`h-4 w-4 ${resending ? "animate-spin" : ""}`} />
                {t("auth_confirm.resend_cta")}
              </Button>
            )}
            {resent && (
              <p className="text-sm text-primary font-medium">{t("auth_confirm.resend_success_inline")}</p>
            )}
            <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground">
              {t("auth_confirm.back_to_login")}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6">
      <Helmet><meta name="robots" content="noindex, nofollow" /></Helmet>
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-8 text-center shadow-sm">
        <MailCheck className="mx-auto mb-4 h-10 w-10 text-primary" />
        <h1 className="font-heading text-2xl font-semibold text-foreground">{t("auth_confirm.validating_title")}</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          {t("auth_confirm.validating_body")}
        </p>
        <Loader2 className="mx-auto mt-6 h-6 w-6 animate-spin text-primary" />
        <Link to="/login" className="mt-6 inline-block text-sm text-muted-foreground hover:text-foreground">
          {t("auth_confirm.back_to_login")}
        </Link>
      </div>
    </div>
  );
};

export default AuthConfirm;
