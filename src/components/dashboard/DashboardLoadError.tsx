import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  onRetry: () => void;
  detail?: string | null;
}

/**
 * Encart d'erreur socle du dashboard.
 * Volontairement distinct visuellement de l'empty state / cold-start :
 * bordure + fond warning explicites, icône d'alerte, CTA « Réessayer ».
 * Objectif : ne jamais présenter une panne (réseau, RLS, timeout) comme
 * un compte vide.
 */
export default function DashboardLoadError({ onRetry, detail }: Props) {
  return (
    <div className="px-4 sm:px-5 md:px-8 py-8">
      <div
        role="alert"
        className="mx-auto max-w-2xl rounded-2xl border border-warning/50 bg-warning/10 p-6 shadow-sm"
      >
        <div className="flex items-start gap-4">
          <div className="rounded-full bg-warning/20 p-2 shrink-0">
            <AlertTriangle className="h-6 w-6 text-warning" aria-hidden="true" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-foreground">
              Une erreur est survenue lors du chargement de votre tableau de bord
            </h2>
            <p className="mt-1 text-sm text-foreground/80">
              Vos données n'ont pas pu être récupérées. Il ne s'agit pas d'un compte vide :
              votre historique est intact. Réessayez dans un instant.
            </p>
            {detail && (
              <p className="mt-2 text-xs text-muted-foreground font-mono break-all">
                {detail}
              </p>
            )}
            <div className="mt-4">
              <Button onClick={onRetry} variant="default" size="sm">
                Réessayer
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
