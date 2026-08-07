import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import PageMeta from "@/components/seo/PageMeta";

/**
 * Page d'atterrissage des liens profonds authentifies deposes dans les emails
 * declenches par un message ou une candidature. Elle consomme le jeton en POST
 * (aucune consommation au prechargement d'un client mail), ouvre la session,
 * puis depose la personne dans le fil concerne. Jeton expire ou deja utilise :
 * redirection vers la connexion, avec retour sur le bon fil ensuite.
 */
export default function EmailDeepLink() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const token = searchParams.get("t") ?? "";

    const run = async () => {
      if (!token) {
        navigate("/login?redirect=%2Fmessages", { replace: true });
        return;
      }
      try {
        const { data, error } = await supabase.functions.invoke("email-deep-link", {
          body: { token },
        });
        if (cancelled) return;
        const next = typeof data?.next === "string" ? data.next : "/messages";
        if (!error && data?.ok && typeof data?.url === "string") {
          window.location.replace(data.url);
          return;
        }
        navigate(`/login?redirect=${encodeURIComponent(next)}`, { replace: true });
      } catch {
        if (cancelled) return;
        setFailed(true);
        navigate("/login?redirect=%2Fmessages", { replace: true });
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [searchParams, navigate]);

  return (
    <>
      <PageMeta title="Accès à votre conversation" description="Ouverture de votre conversation Guardiens." noindex />
      <main className="flex min-h-[60vh] min-w-0 flex-1 items-center justify-center px-6">
        <p className="text-center text-muted-foreground">
          {failed
            ? "Nous vous redirigeons vers la page de connexion."
            : "Ouverture de votre conversation, un instant."}
        </p>
      </main>
    </>
  );
}
