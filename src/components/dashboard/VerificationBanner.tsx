import { Link } from "react-router-dom";
import { ShieldCheck, Clock, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  status: string | null;
  rejectionReason?: string | null;
}

const VerificationBanner = ({ status, rejectionReason }: Props) => {
  if (!status || status === "verified") return null;

  if (status === "pending") {
    return (
      <div className="rounded-xl border border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800 p-4 flex items-start gap-3">
        <Clock className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-blue-800 dark:text-blue-300">Vérification en cours</p>
          <p className="text-xs text-blue-600/80 dark:text-blue-400/70 mt-0.5">
            Votre pièce d'identité est en cours de vérification. On revient vers vous sous 24h.
          </p>
        </div>
      </div>
    );
  }

  if (status === "rejected") {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800 p-4 flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-medium text-red-800 dark:text-red-300">Vérification non aboutie</p>
          <p className="text-xs text-red-600/80 dark:text-red-400/70 mt-0.5">
            {rejectionReason || "Veuillez soumettre un nouveau document."}
          </p>
          <Button size="sm" variant="outline" className="mt-2 text-xs" asChild>
            <Link to="/settings#verification">Réessayer</Link>
          </Button>
        </div>
      </div>
    );
  }

  // not_submitted
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 p-4 flex items-start gap-3">
      <ShieldCheck className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
          Votre identité n'est pas encore vérifiée
        </p>
        <p className="text-xs text-amber-600/80 dark:text-amber-400/70 mt-0.5">
          Les profils vérifiés reçoivent 3× plus de réponses. Ça prend 2 minutes.
        </p>
        <Button size="sm" className="mt-2 text-xs gap-1.5" asChild>
          <Link to="/settings#verification">
            <ShieldCheck className="h-3.5 w-3.5" />
            Vérifier mon identité
          </Link>
        </Button>
      </div>
    </div>
  );
};

export default VerificationBanner;
