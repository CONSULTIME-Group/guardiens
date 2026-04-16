import { useEffect, useRef } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useNavigate } from "react-router-dom";
import { Loader2, MailCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const AuthConfirm = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const url = new URL(window.location.href);
    const next = url.searchParams.get("next") || "/dashboard";

    // Listen for the auth state change triggered by Supabase processing
    // the tokens in the URL (hash fragment or query params).
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
            toast({
              title: "Email confirmé",
              description: "Votre compte est activé !",
            });
            navigate(next, { replace: true });
          }
        }
      }
    );

    // Also try explicit OTP verification for token_hash in query params
    const tokenHash = url.searchParams.get("token_hash");
    const type = url.searchParams.get("type");

    if (tokenHash && (type === "signup" || type === "email" || type === "recovery")) {
      supabase.auth.verifyOtp({ token_hash: tokenHash, type }).then(({ error }) => {
        if (error) {
          console.error("OTP verification failed:", error.message);
          // Don't navigate away — the onAuthStateChange listener
          // might still fire from a hash-based redirect.
        }
        // Success is handled by the onAuthStateChange listener above.
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
      toast({
        variant: "destructive",
        title: "Lien invalide ou expiré",
        description: "Demandez un nouvel email de confirmation puis réessayez.",
      });
      navigate("/login", { replace: true });
    }, 15000);

    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, [navigate, toast]);

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
