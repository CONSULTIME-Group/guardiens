import { useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useNavigate } from "react-router-dom";
import { Loader2, MailCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const AuthConfirm = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    let mounted = true;

    const finalizeAuth = async () => {
      const url = new URL(window.location.href);
      const tokenHash = url.searchParams.get("token_hash");
      const type = url.searchParams.get("type");
      const next = url.searchParams.get("next") || "/dashboard";

      try {
        if (tokenHash && (type === "signup" || type === "email" || type === "recovery")) {
          const { error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type,
          });

          if (error) throw error;

          if (!mounted) return;
          toast({
            title: type === "recovery" ? "Lien validé" : "Email confirmé",
            description:
              type === "recovery"
                ? "Vous pouvez maintenant choisir un nouveau mot de passe."
                : "Votre compte est activé. Vous pouvez vous connecter.",
          });

          navigate(type === "recovery" ? "/reset-password" : next, { replace: true });
          return;
        }

        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;

        if (!mounted) return;
        if (data.session) {
          navigate(next, { replace: true });
          return;
        }

        toast({
          variant: "destructive",
          title: "Lien invalide ou expiré",
          description: "Demandez un nouvel email de confirmation puis réessayez.",
        });
        navigate("/login", { replace: true });
      } catch (error) {
        if (!mounted) return;
        toast({
          variant: "destructive",
          title: "Impossible de valider le lien",
          description: "Le lien de confirmation semble invalide ou expiré.",
        });
        navigate("/login", { replace: true });
      }
    };

    finalizeAuth();

    return () => {
      mounted = false;
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
