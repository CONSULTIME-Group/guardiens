import { ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";

/**
 * Encart discret « vérification d'identité recommandée » affiché sur
 * les formulaires de publication et de réponse aux petites missions.
 *
 * Non bloquant, purement incitatif : la garde serveur ne l'exige pas.
 */
const IdentityRecommendedHint = ({ compact = false }: { compact?: boolean }) => (
  <div
    className={`rounded-xl border border-info-border/60 bg-info-soft/60 px-3 py-2 flex items-start gap-2 ${
      compact ? "text-[11px]" : "text-xs"
    } text-info leading-relaxed`}
  >
    <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
    <p className="min-w-0">
      <span className="font-semibold">Vérification d'identité recommandée.</span>{" "}
      Non obligatoire, mais elle rassure les autres membres et fait grandir votre écusson de confiance.{" "}
      <Link to="/profile" className="underline underline-offset-2 font-medium">
        Vérifier plus tard
      </Link>
      .
    </p>
  </div>
);

export default IdentityRecommendedHint;
