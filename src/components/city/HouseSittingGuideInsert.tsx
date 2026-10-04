import { Link } from "react-router-dom";

/**
 * Encart de maillage vers le guide house sitting (lot SEO-7).
 * Importé uniquement par CityPage et GuideDetail (chunks lazy), jamais par l'entrée.
 */
export const HOUSE_SITTING_GUIDE_PATH = "/actualites/c-est-quoi-le-house-sitting";

export default function HouseSittingGuideInsert({ className = "" }: { className?: string }) {
  return (
    <aside
      aria-labelledby="house-sitting-guide-insert"
      data-testid="house-sitting-guide-insert"
      className={`rounded-xl border border-border bg-card p-5 md:p-6 ${className}`}
    >
      <h2 id="house-sitting-guide-insert" className="font-heading text-xl font-bold text-foreground mb-2">
        Qu'est-ce qu'un home sitter ?
      </h2>
      <p className="text-muted-foreground mb-3">
        Un home sitter loge chez vous pendant votre absence et prend soin de la maison et des animaux. Sur Guardiens, c'est un échange, et l'inscription est gratuite.
      </p>
      <Link to={HOUSE_SITTING_GUIDE_PATH} className="font-medium text-primary underline underline-offset-4 hover:no-underline">
        Lire le guide du house sitting
      </Link>
    </aside>
  );
}
