/**
 * EntraideCtaCard — carte dashboard vers /petites-missions.
 *
 * Positionnée juste après « Votre annonce » côté propriétaire pour que
 * l'entraide reste visible sans devoir scroller cinq blocs plus bas.
 * Style aligné avec les autres cartes signature (bord doux, ombre discrète,
 * typographie carnet). Aucune image, un pictogramme sobre suffit.
 */
import { Link } from "react-router-dom";
import { HandHeart, ArrowRight } from "lucide-react";

interface Props {
  /** Ex. « 4 demandes autour de vous ». Optionnel. */
  signal?: string | null;
}

const EntraideCtaCard = ({ signal }: Props) => {
  return (
    <section aria-label="L'entraide autour de vous" className="px-4 sm:px-5 md:px-8">
      <Link
        to="/petites-missions"
        className="group block bg-card border border-border rounded-2xl px-5 py-4 hover:border-primary/50 transition-colors"
        style={{
          boxShadow:
            "0 1px 2px rgba(29,27,22,0.04), 0 8px 24px rgba(29,27,22,0.05)",
        }}
      >
        <div className="flex items-center gap-4">
          <div
            aria-hidden="true"
            className="shrink-0 flex items-center justify-center rounded-full bg-primary/10 text-primary"
            style={{ width: 44, height: 44 }}
          >
            <HandHeart className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h3
              className="font-heading text-foreground"
              style={{ fontSize: "16px", fontWeight: 600, lineHeight: 1.3 }}
            >
              L'entraide, tout près de chez vous
            </h3>
            <p
              className="text-muted-foreground"
              style={{ fontSize: "13px", lineHeight: 1.45, marginTop: 4 }}
            >
              {signal
                ? signal
                : "Arrosage, courrier, présence : donnez ou demandez un coup de main aux gens du coin."}
            </p>
          </div>
          <ArrowRight
            className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0"
            aria-hidden="true"
          />
        </div>
      </Link>
    </section>
  );
};

export default EntraideCtaCard;
