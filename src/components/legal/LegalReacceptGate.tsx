/**
 * Lot J2b : porte de réacceptation des textes légaux (CGU v9, article 15.4).
 *
 * Montée une seule fois pour un membre connecté (App.tsx), chargée seulement
 * à partir de la plus proche date d'effet d'une version à réaccepter.
 * Un appel my_pending_legal_documents par session (cache react-query), puis,
 * s'il reste des documents à accepter, une fenêtre bloquante hors des routes
 * laissées libres par l'article 15.4 (messagerie, paramètres, textes légaux).
 * Une erreur de lecture laisse la navigation ouverte ; une erreur
 * d'enregistrement garde la fenêtre avec un nouvel essai, sans toucher à la
 * session.
 */
import { useId, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { frenchDate } from "@/config/legalVersions";
import { legalAcceptanceSettled } from "@/lib/legalAcceptance";
import {
  CLOSE_ACCOUNT_PATH,
  fetchMyPendingLegalDocuments,
  isReacceptExemptPath,
  reacceptCheckboxLabel,
  recordMyReacceptance,
  type PendingLegalDocument,
} from "@/lib/legalReaccept";

export const LEGAL_PENDING_QUERY_KEY = "legal-pending-documents";

export const REACCEPT_SUMMARY = [
  "Guardiens fournit les outils de mise en relation : les membres restent seuls parties à leurs gardes et à leurs coups de main.",
  "Les règles de garde, d'assurance et d'entraide sont précisées, et la garde d'enfants est exclue de l'entraide.",
  "Tout arrêt ou toute évolution du service est annoncé 30 jours à l'avance.",
] as const;

const LegalReacceptGate = () => {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const { pathname } = useLocation();
  const queryClient = useQueryClient();
  const checkboxId = useId();
  const [checked, setChecked] = useState(false);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);

  const queryKey = [LEGAL_PENDING_QUERY_KEY, userId];
  const { data: pending } = useQuery<PendingLegalDocument[]>({
    queryKey,
    enabled: !!userId,
    queryFn: async () => {
      // Une trace Google en cours couvre déjà les versions publiées.
      await legalAcceptanceSettled();
      return fetchMyPendingLegalDocuments();
    },
    staleTime: Infinity,
    gcTime: Infinity,
    retry: false,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  if (!userId || !pending || pending.length === 0) return null;
  if (isReacceptExemptPath(pathname)) return null;

  const effectiveOn = pending.map((d) => d.effective_on).sort().pop();

  const handleContinue = async () => {
    if (!checked || saving) return;
    setSaving(true);
    setFailed(false);
    try {
      await recordMyReacceptance();
      queryClient.setQueryData<PendingLegalDocument[]>(queryKey, []);
    } catch {
      setFailed(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AlertDialog open onOpenChange={() => { /* fenêtre fermée par l'acceptation seulement */ }}>
      <AlertDialogContent
        className="w-[calc(100%-2rem)] max-h-[90vh] overflow-y-auto rounded-2xl"
        onEscapeKeyDown={(e) => e.preventDefault()}
        data-testid="legal-reaccept-gate"
      >
        <AlertDialogHeader>
          <AlertDialogTitle className="text-xl">Nos conditions évoluent</AlertDialogTitle>
          <AlertDialogDescription className="text-foreground/80">
            {effectiveOn
              ? `Depuis le ${frenchDate(effectiveOn)}, de nouvelles versions de nos conditions s'appliquent. L'essentiel :`
              : "De nouvelles versions de nos conditions s'appliquent. L'essentiel :"}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <ul className="list-disc space-y-2 pl-5 text-sm text-foreground/80">
          {REACCEPT_SUMMARY.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>

        <p className="text-sm text-foreground/80">
          Les textes complets :{" "}
          <a href="/cgu" target="_blank" rel="noopener noreferrer" className="text-primary underline-offset-2 hover:underline">
            Conditions Générales d'Utilisation
          </a>{" "}
          et{" "}
          <a href="/cgs" target="_blank" rel="noopener noreferrer" className="text-primary underline-offset-2 hover:underline">
            Conditions Générales de Services
          </a>
          . Votre messagerie et vos paramètres restent accessibles.
        </p>

        <div className="flex items-start gap-3">
          <Checkbox
            id={checkboxId}
            checked={checked}
            onCheckedChange={(v) => setChecked(v === true)}
            className="mt-0.5"
          />
          <label htmlFor={checkboxId} className="cursor-pointer text-sm leading-snug text-foreground">
            {reacceptCheckboxLabel()}
          </label>
        </div>

        {failed && (
          <p role="alert" className="text-sm text-destructive">
            L'enregistrement a été interrompu. Vérifiez votre connexion, puis réessayez.
          </p>
        )}

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Link to={CLOSE_ACCOUNT_PATH} className="text-sm text-muted-foreground underline-offset-2 hover:underline">
            Fermer mon compte
          </Link>
          <Button onClick={handleContinue} disabled={!checked || saving}>
            {failed ? "Réessayer" : "Continuer"}
          </Button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default LegalReacceptGate;
