import { Link } from "react-router-dom";
import { ArrowRight, HandHeart } from "lucide-react";

interface ExchangePactBannerProps {
  /** owner = "Publier un besoin", sitter = "Proposer mon aide", public = 2 CTA. */
  variant?: "owner" | "sitter" | "public";
  className?: string;
}

/**
 * Bandeau pédagogique qui rappelle le pacte "Coup de main = échange".
 * Décliné pour dashboards owner / sitter et pour la page publique.
 * Ton vouvoiement, pas d'euro, pas d'engagement, mention gratuité.
 */
const ExchangePactBanner = ({ variant = "public", className }: ExchangePactBannerProps) => {
  const primaryCta =
    variant === "sitter"
      ? { label: "Proposer mon aide", to: "/petites-missions/creer?type=offre" }
      : { label: "Publier un besoin", to: "/petites-missions/creer?type=besoin" };

  const secondaryCta =
    variant === "public"
      ? { label: "Parcourir les échanges", to: "/petites-missions" }
      : null;

  return (
    <div
      className={
        "rounded-2xl border border-primary/20 bg-primary/5 p-4 md:p-5 " + (className || "")
      }
    >
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-primary/10 p-2 shrink-0">
          <HandHeart className="h-5 w-5 text-primary" aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-heading text-sm md:text-base font-semibold text-foreground leading-snug">
            Un coup de main, c'est un échange.
          </p>
          <p className="text-xs md:text-sm text-foreground/75 mt-1 leading-relaxed">
            Sans argent, sans abonnement. Vous demandez, vous proposez quelque chose en retour :
            un café, des œufs, un service, une histoire à raconter.
          </p>
          <div className="flex flex-wrap gap-2 mt-3">
            <Link
              to={primaryCta.to}
              className="inline-flex items-center gap-1.5 rounded-full bg-primary text-primary-foreground px-3.5 py-1.5 text-xs font-semibold hover:opacity-90 transition-opacity"
            >
              {primaryCta.label}
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
            {secondaryCta && (
              <Link
                to={secondaryCta.to}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3.5 py-1.5 text-xs font-semibold text-foreground hover:bg-accent transition-colors"
              >
                {secondaryCta.label}
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExchangePactBanner;
