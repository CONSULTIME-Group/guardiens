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
import { useToast } from "@/hooks/use-toast";

/**
 * Détecte le cas "Sign in with Google" où Google a créé un nouveau compte
 * (variante d'email Gmail avec/sans points, ou googlemail.com) alors que
 * l'utilisateur a déjà un compte canonique Guardiens.
 *
 * Stratégie en 2 niveaux :
 *  1. Compte STRICTEMENT VIDE → suppression automatique + redirect /login.
 *  2. Compte avec données (cas rare) → dialog : « me reconnecter » ou « continuer ».
 *
 * Garde-fous :
 *  - Vérif côté serveur via `is_account_empty` (impossible à forger).
 *  - Suppression via edge function authentifiée (service_role).
 */
const DuplicateAccountGuard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const checked = useRef(false);
  const [canonicalEmail, setCanonicalEmail] = useState<string | null>(null);
  const [autoCleaning, setAutoCleaning] = useState(false);

  useEffect(() => {
    if (checked.current) return;
    if (!user?.id || !user.email) return;

    const localPart = user.email.split("@")[0]?.toLowerCase() ?? "";
    const domain = user.email.split("@")[1]?.toLowerCase() ?? "";
    const isGmail = domain === "gmail.com" || domain === "googlemail.com";
    const looksFresh =
      !user.firstName &&
      !user.onboardingMinimalCompleted &&
      !user.onboardingCompleted;

    if (!isGmail || !looksFresh || !localPart) return;

    checked.current = true;
    (async () => {
      try {
        const { data: dup, error: dupErr } = await supabase.rpc(
          "find_duplicate_gmail_account",
          { _user_id: user.id }
        );
        if (dupErr) return;
        const row = Array.isArray(dup) ? dup[0] : dup;
        const canonical = row?.canonical_email as string | undefined;
        if (!canonical) return;

        // Double-check serveur : compte VRAIMENT vide ?
        const { data: emptyData } = await supabase.rpc("is_account_empty", {
          _user_id: user.id,
        });

        if (emptyData === true) {
          // Cas le plus fréquent : nettoyage automatique silencieux.
          setAutoCleaning(true);
          const { data: result, error: fnErr } = await supabase.functions.invoke(
            "delete-empty-duplicate-account",
            { body: {} }
          );
          if (fnErr || (result as any)?.error) {
            // Fallback : on bascule sur le dialog manuel.
            setAutoCleaning(false);
            setCanonicalEmail(canonical);
            return;
          }
          toast({
            title: "Doublon Google détecté et supprimé",
            description: `Google a créé un nouveau compte avec une variante de votre email (points ou googlemail.com). Ce compte vide vient d'être supprimé automatiquement. Reconnectez-vous avec votre adresse d'origine : ${canonical}`,
            duration: 9000,
          });
          await logout();
          navigate(`/login?email=${encodeURIComponent(canonical)}`, {
            replace: true,
            state: { prefilledEmail: canonical, reason: "duplicate-cleaned" },
          });
          return;
        }

        // Compte avec données → dialog manuel.
        setCanonicalEmail(canonical);
      } catch {
        // silencieux
      }
    })();
  }, [
    user?.id,
    user?.email,
    user?.firstName,
    user?.onboardingMinimalCompleted,
    user?.onboardingCompleted,
    logout,
    navigate,
    toast,
  ]);

  const handleSwitch = async () => {
    const target = canonicalEmail
      ? `/login?email=${encodeURIComponent(canonicalEmail)}`
      : "/login";
    setCanonicalEmail(null);
    await logout();
    navigate(target, { replace: true });
  };

  if (autoCleaning) {
    return (
      <div
        className="fixed inset-0 z-[60] flex items-center justify-center bg-background/90 backdrop-blur-sm px-6"
        role="status"
        aria-live="polite"
      >
        <div className="text-center space-y-3 max-w-md">
          <p className="font-heading text-lg">Doublon Google détecté</p>
          <p className="text-sm text-muted-foreground">
            Google a créé un nouveau compte avec une variante de votre email
            (points ou googlemail.com). Comme ce compte est vide, nous le
            supprimons automatiquement et vous renvoyons vers votre compte
            d'origine.
          </p>
          <p className="text-xs text-muted-foreground">Nettoyage en cours…</p>
        </div>
      </div>
    );
  }

  return (
    <AlertDialog open={!!canonicalEmail}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Compte existant détecté</AlertDialogTitle>
          <AlertDialogDescription>
            Vous possédez déjà un compte Guardiens avec l'adresse{" "}
            <strong>{canonicalEmail}</strong>. Google a créé une variante de cet
            email (avec ou sans points), ce qui crée un nouveau compte. Pour
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
