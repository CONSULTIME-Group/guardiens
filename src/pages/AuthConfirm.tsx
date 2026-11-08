import { rememberPublishIntent } from "@/lib/postOnboardingIntent";
import { useEffect, useRef, useState } from "react";
import Head from "@/components/seo/Head";
import { Link, useNavigate } from "react-router-dom";
import { Loader2, MailCheck, RefreshCw } from "lucide-react";
import { useTranslation } from "@/i18n/react";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { trackEventWithUserId } from "@/lib/analytics";

/**
 * Lot PUB3 : une session déjà ouverte au montage suffit pour aboutir, sauf
 * quand le lien porte un jeton à vérifier (token_hash) : sa vérification
 * décide, pour ne jamais confirmer avec la session d'un autre compte.
 */
export const shouldFinishWithExistingSession = (o: { tokenHash: string | null; hash: string }) =>
  !o.tokenHash && !/(^|&)error/.test(o.hash);

/** Compte créé il y a moins de 24 h (premier SIGNED_IN d'une inscription). */
export const isFreshAccount = (createdAt: string | null, now = Date.now()) =>
  !!createdAt && now - new Date(createdAt).getTime() < 24 * 3600 * 1000;

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
    // Lot J1 : l'intention de publication survit à tout l'onboarding.
    rememberPublishIntent(next);

    const rawHash = window.location.hash.replace("#", "");
    const hashParams = new URLSearchParams(rawHash);
    const hashError = hashParams.get("error_description") || hashParams.get("error");
    if (hashError) {
      setError(hashError);
      return;
    }

    // Lot PUB3 : un seul aboutissement, que la session arrive par l'événement
    // ou qu'elle soit déjà ouverte au montage.
    let finished = false;
    const finish = async (event: string, session: Session | null) => {
      if (finished) return;
      finished = true;
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
              let createdAt: string | null = null;
              try {
                const { data: prof } = await supabase
                  .from("profiles")
                  .select("role, created_at")
                  .eq("id", userId)
                  .maybeSingle();
                role = (prof?.role as string | undefined) ?? null;
                createdAt = (prof?.created_at as string | undefined) ?? session?.user?.created_at ?? null;
              } catch { /* silencieux */ }

              // Lot 1 : mesure de la perte clic/confirmation, comptes de moins de 24 h.
              if (isFreshAccount(createdAt)) {
                trackEventWithUserId(userId, "signup_email_confirmed", {
                  source: "/auth/confirm",
                  metadata: { user_id: userId, role, via: "email_link" },
                });
              }
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
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (
          event === "SIGNED_IN" ||
          event === "PASSWORD_RECOVERY" ||
          event === "TOKEN_REFRESHED"
        ) {
          void finish(event, session);
        }
      }
    );

    const tokenHash = url.searchParams.get("token_hash");
    const type = url.searchParams.get("type");

    /**
     * Lot PUB3 (recette du 08/11/2026) : le client Supabase lit les jetons du
     * lien de confirmation dès son chargement et émet SIGNED_IN avant que cet
     * écran ne s'abonne. L'événement perdu laissait « Validation en cours »
     * jusqu'au repli de 15 secondes. Une session déjà ouverte au montage
     * aboutit tout de suite ; un lien à jeton (token_hash) attend sa
     * vérification ci-dessous.
     */
    if (shouldFinishWithExistingSession({ tokenHash, hash: rawHash })) {
      supabase.auth.getSession().then(({ data }) => {
        if (data.session) {
          const recovery = rawHash.includes("type=recovery") || next === "/reset-password";
          void finish(recovery ? "PASSWORD_RECOVERY" : "SIGNED_IN", data.session);
        }
      });
    }

    if (tokenHash && (type === "signup" || type === "email" || type === "recovery")) {
      supabase.auth.verifyOtp({ token_hash: tokenHash, type }).then(async ({ error }) => {
        if (error) {
          console.error("OTP verification failed:", error.message);
          // Lot C1 : un second clic sur un lien déjà utilisé. Session active
          // dans ce navigateur : on continue sans écran d'erreur.
          const { data } = await supabase.auth.getSession();
          if (data.session && type !== "recovery") {
            finished = true;
            subscription.unsubscribe();
            navigate(next, { replace: true });
            return;
          }
          setError(error.message);
        }
      });
    }

    const timeout = setTimeout(async () => {
      if (finished) return;
      const { data } = await supabase.auth.getSession();
      if (finished) return;
      if (data.session) {
        finished = true;
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
        <Head><meta name="robots" content="noindex, nofollow" /></Head>
        <div className="w-full max-w-md rounded-3xl border border-border bg-card p-8 text-center shadow-sm">
          <MailCheck className="mx-auto mb-4 h-10 w-10 text-primary" />
          <h1 className="font-heading text-2xl font-semibold text-foreground">{t("auth_confirm.used_title")}</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{t("auth_confirm.used_body")}</p>
          <div className="mt-6 flex flex-col gap-3">
            <Button asChild><Link to="/login">{t("auth_confirm.used_login")}</Link></Button>
            {!resent && (
              <Button variant="outline" onClick={handleResend} disabled={resending} className="gap-2">
                <RefreshCw className={`h-4 w-4 ${resending ? "animate-spin" : ""}`} />
                {t("auth_confirm.resend_cta")}
              </Button>
            )}
            {resent && (
              <p className="text-sm text-primary font-medium">{t("auth_confirm.resend_success_inline")}</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6">
      <Head><meta name="robots" content="noindex, nofollow" /></Head>
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
