import { useEffect, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useNavigate } from "react-router-dom";
import { Loader2, MailCheck, AlertTriangle, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { trackEventWithUserId } from "@/lib/analytics";

const AuthConfirm = () => {
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
    // Sécurité : on n'accepte que les chemins internes (pas d'URL absolue, pas de protocol-relative).
    const next = /^\/(?!\/)/.test(rawNext) ? rawNext : "/dashboard";

    // Check for error in hash fragment (Supabase redirects errors there)
    const hashParams = new URLSearchParams(window.location.hash.replace("#", ""));
    const hashError = hashParams.get("error_description") || hashParams.get("error");
    if (hashError) {
      setError(hashError);
      return; // Don't set up listeners — show error UI immediately
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (
          event === "SIGNED_IN" ||
          event === "PASSWORD_RECOVERY" ||
          event === "TOKEN_REFRESHED"
        ) {
          subscription.unsubscribe();

          if (event === "PASSWORD_RECOVERY") {
            toast({
              title: "Lien validé",
              description: "Vous pouvez maintenant choisir un nouveau mot de passe.",
            });
            navigate("/reset-password", { replace: true });
          } else {
            // ── Émission signup_email_confirmed (avant redirect) ──
            // C'est ICI que le funnel doit incrémenter, pas dans Dashboard :
            // AuthConfirm consomme le hash type=signup et redirige vers /dashboard
            // sans hash, ce qui empêchait l'émission côté Dashboard.
            // Déduplication via localStorage par user_id.
            try {
              const userId = session?.user?.id ?? null;
              if (userId) {
                const flagKey = `email_confirmed_tracked_${userId}`;
                if (!localStorage.getItem(flagKey)) {
                  localStorage.setItem(flagKey, "1");
                  trackEventWithUserId(userId, "signup_email_confirmed", {
                    source: "/auth/confirm",
                    metadata: { user_id: userId, via: "email_link" },
                  });
                }
              }
            } catch { /* silencieux */ }

            toast({
              title: "Email confirmé",
              description: "Votre compte est activé !",
            });
            navigate(next, { replace: true });
          }
        }
      }
    );

    // Try explicit OTP verification for token_hash in query params
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

    // Timeout: if nothing happens after 15s, check session one more time
    const timeout = setTimeout(async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        subscription.unsubscribe();
        navigate(next, { replace: true });
        return;
      }
      subscription.unsubscribe();
      setError("Le lien a expiré. Demandez un nouvel email de confirmation.");
    }, 15000);

    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, [navigate, toast]);

  const handleResend = async () => {
    setResending(true);
    // Try to get email from a previous session or prompt user
    const email = window.prompt("Entrez votre adresse email pour recevoir un nouveau lien :");
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
        title: "Erreur",
        description: resendError.message,
      });
    } else {
      setResent(true);
      toast({
        title: "Email renvoyé",
        description: "Vérifiez votre boîte de réception.",
      });
    }
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-6">
        <Helmet><meta name="robots" content="noindex, nofollow" /></Helmet>
        <div className="w-full max-w-md rounded-3xl border border-border bg-card p-8 text-center shadow-sm">
          <AlertTriangle className="mx-auto mb-4 h-10 w-10 text-destructive" />
          <h1 className="font-heading text-2xl font-semibold text-foreground">Lien invalide ou expiré</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            {error.includes("expired")
              ? "Ce lien de confirmation a expiré. Demandez-en un nouveau ci-dessous."
              : error}
          </p>
          <div className="mt-6 flex flex-col gap-3">
            {!resent && (
              <Button onClick={handleResend} disabled={resending} className="gap-2">
                <RefreshCw className={`h-4 w-4 ${resending ? "animate-spin" : ""}`} />
                Renvoyer un email de confirmation
              </Button>
            )}
            {resent && (
              <p className="text-sm text-primary font-medium">✓ Email renvoyé — vérifiez votre boîte.</p>
            )}
            <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground">
              Retour à la connexion
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
        <h1 className="font-heading text-2xl font-semibold text-foreground">Validation en cours</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Nous finalisons votre confirmation de compte et votre connexion sécurisée.
        </p>
        <Loader2 className="mx-auto mt-6 h-6 w-6 animate-spin text-primary" />
        <Link to="/login" className="mt-6 inline-block text-sm text-muted-foreground hover:text-foreground">
          Retour à la connexion
        </Link>
      </div>
    </div>
  );
};

export default AuthConfirm;
