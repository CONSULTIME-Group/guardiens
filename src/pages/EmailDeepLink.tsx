import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import PageMeta from "@/components/PageMeta";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { deepLinkOutcome } from "@/lib/emailDeepLink";

/**
 * Page d'atterrissage des liens profonds deposes dans les emails declenches
 * par un message ou une candidature. Elle consomme le jeton en POST (aucune
 * consommation au prechargement d'un client mail), puis :
 * - meme compte deja connecte : depose la personne dans le fil concerne ;
 * - aucun compte connecte, email immediat de moins de 2 heures : ouvre la
 *   session et depose la personne dans le fil (lot Y1, P4-06) ;
 * - relance, lien plus ancien, jeton deja utilise : connexion, puis retour
 *   sur le bon fil ;
 * - autre compte connecte : la session en place est gardee, la personne
 *   choisit de changer de compte.
 */
export default function EmailDeepLink() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [failed, setFailed] = useState(false);
  const [otherAccountNext, setOtherAccountNext] = useState<string | null>(null);

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
        const outcome = deepLinkOutcome(error ? null : data);
        if (outcome.kind === "session") {
          window.location.replace(outcome.url);
          return;
        }
        if (outcome.kind === "same_account") {
          navigate(outcome.next, { replace: true });
          return;
        }
        if (outcome.kind === "other_account") {
          setOtherAccountNext(outcome.next);
          return;
        }
        navigate(`/login?redirect=${encodeURIComponent(outcome.next)}`, { replace: true });
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

  if (otherAccountNext) {
    return (
      <>
        <PageMeta title="Accès à votre conversation" description="Ouverture de votre conversation Guardiens." noindex />
        <main className="flex min-h-[60vh] min-w-0 flex-1 items-center justify-center px-6">
          <div className="max-w-md text-center space-y-4" data-testid="deep-link-other-account">
            <h1 className="font-heading text-xl font-semibold">Ce lien est réservé à un autre compte</h1>
            <p className="text-muted-foreground">
              Vous êtes connecté avec un autre compte sur cet appareil. Pour ouvrir ce message,
              connectez-vous avec le compte qui a reçu l'email.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <Button
                onClick={async () => {
                  await logout();
                  navigate(`/login?redirect=${encodeURIComponent(otherAccountNext)}`, { replace: true });
                }}
              >
                Changer de compte
              </Button>
              <Button asChild variant="outline">
                <Link to="/dashboard">Rester sur mon compte</Link>
              </Button>
            </div>
          </div>
        </main>
      </>
    );
  }

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
