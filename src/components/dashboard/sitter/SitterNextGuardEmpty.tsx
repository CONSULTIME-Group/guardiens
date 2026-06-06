import { Link } from "react-router-dom";
import { Calendar, ArrowRight } from "lucide-react";

/**
 * Empty state symétrique de SitterNextGuard.
 * Affiché quand le gardien n'a pas de prochaine garde, garde
 * la même hauteur visuelle pour éviter le saut de layout.
 */
const SitterNextGuardEmpty = () => (
  <div className="px-4 sm:px-5 md:px-8 mb-6 md:mb-8">
    <Link
      to="/search"
      className="group block bg-muted/30 border border-dashed border-border rounded-2xl p-4 sm:p-5 transition-all duration-300 ease-out hover:bg-muted/50 hover:border-primary/30 hover:-translate-y-0.5"
    >
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs uppercase tracking-widest text-muted-foreground font-sans font-medium">
          Prochaine garde
        </p>
        <span className="text-xs bg-muted text-muted-foreground rounded-full px-2.5 py-0.5 font-medium">
          Aucune
        </span>
      </div>

      <p className="text-sm font-semibold text-foreground mb-1 transition-colors group-hover:text-primary">
        Vous n'avez pas encore de garde planifiée
      </p>

      <div className="flex items-center justify-between mt-3">
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
          Trouvez votre première mission
        </span>
        <span className="inline-flex items-center gap-1 text-xs font-medium text-primary transition-transform duration-200 group-hover:translate-x-0.5">
          Explorer <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
      </div>
    </Link>
  </div>
);

export default SitterNextGuardEmpty;
