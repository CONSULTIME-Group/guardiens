import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

/**
 * Détecte le cas "Sign in with Google" où Google a créé un nouveau compte
 * (variante d'email Gmail avec/sans points) alors que l'utilisateur a déjà
 * un compte canonique. Au lieu de l'enfermer dans l'onboarding, on lui propose
 * de se reconnecter avec son compte d'origine.
 *
 * Déclenchement strict :
 *  - utilisateur loggé
 *  - profil "frais" : pas de prénom + onboarding non complété
 *  - email Gmail/Googlemail
 *  - un autre profil avec email Gmail équivalent existe (RPC)
 */
const DuplicateAccountGuard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const checked = useRef(false);
  const [canonicalEmail, setCanonicalEmail] = useState<string | null>(null);

  useEffect(() => {
    if (checked.current) return;
    if (!user?.id || !user.email) return;

    const localPart = user.email.split("@")[0]?.toLowerCase() ?? "";
    const domain = user.email.split("@")[1]?.toLowerCase() ?? "";
    const isGmail = domain === "gmail.com" || domain === "googlemail.com";
    const looksFresh = !user.firstName && !user.onboardingMinimalCompleted && !user.onboardingCompleted;

    if (!isGmail || !looksFresh || !localPart) return;

    checked.current = true;
    (async () => {
      try {
        const { data, error } = await supabase.rpc("find_duplicate_gmail_account", {
          _user_id: user.id,
        });
        if (error) return;
        const row = Array.isArray(data) ? data[0] : data;
        if (row?.canonical_email) {
          setCanonicalEmail(row.canonical_email as string);
        }
      } catch {
        // silencieux
      }
    })();
  }, [user?.id, user?.email, user?.firstName, user?.onboardingMinimalCompleted, user?.onboardingCompleted]);

  const handleSwitch = async () => {
    const target = canonicalEmail
      ? `/login?email=${encodeURIComponent(canonicalEmail)}`
      : "/login";
    setCanonicalEmail(null);
    await logout();
    navigate(target, { replace: true });
  };

  return (
    <AlertDialog open={!!canonicalEmail}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Compte existant détecté</AlertDialogTitle>
          <AlertDialogDescription>
            Vous possédez déjà un compte Guardiens avec l'adresse{" "}
            <strong>{canonicalEmail}</strong>. Google a créé une variante de cet
            email (avec ou sans points), ce qui crée un nouveau compte vide. Pour
            retrouver vos données, reconnectez-vous avec votre compte d'origine.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setCanonicalEmail(null)}>
            Continuer quand même
          </AlertDialogCancel>
          <AlertDialogAction onClick={handleSwitch}>
            Me reconnecter avec mon compte
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DuplicateAccountGuard;
