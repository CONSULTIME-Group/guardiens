/**
 * VerifiedSitterRailCard — carte rail « gardien vérifié » (vague 18).
 *
 * Registre : chaleureux, jamais paywall plaqué. Le doré founder porte la
 * confiance (écusson, vérification), distinct du gold du ring d'affinité.
 * AUCUN prix affiché ici : le prix vit sur /mon-abonnement.
 *
 * Le montage conditionnel est piloté en amont via shouldShowVerifiedCard()
 * (flag pricing + statut abonnement).
 */
import { Link } from "react-router-dom";
import { ShieldCheck } from "lucide-react";

const VerifiedSitterRailCard = () => {
  return (
    <article
      className="bg-card border border-border"
      style={{
        borderRadius: "20px",
        padding: "22px",
        boxShadow:
          "0 1px 2px rgba(29,27,22,0.04), 0 8px 24px rgba(29,27,22,0.05)",
      }}
    >
      {/* eyebrow signature aux couleurs founder */}
      <div className="flex items-center gap-2">
        <span
          aria-hidden="true"
          className="inline-block"
          style={{
            width: "20px",
            height: "1px",
            background: "hsl(var(--founder))",
          }}
        />
        <p
          style={{
            color: "hsl(var(--founder))",
            fontSize: "11px",
            fontWeight: 700,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
          }}
        >
          Gardien vérifié
        </p>
      </div>

      <div className="flex items-start gap-[14px] mt-[14px]">
        {/* écusson visuel, tokens founder-soft / founder-border, icône trait founder */}
        <span
          aria-hidden="true"
          className="shrink-0 inline-flex items-center justify-center"
          style={{
            width: "38px",
            height: "38px",
            borderRadius: "9999px",
            background: "hsl(var(--founder-soft))",
            border: "1px solid hsl(var(--founder-border))",
          }}
        >
          <ShieldCheck
            aria-hidden="true"
            style={{
              width: "18px",
              height: "18px",
              color: "hsl(var(--founder))",
            }}
            strokeWidth={1.75}
          />
        </span>

        <div className="min-w-0">
          <h3
            className="font-heading text-foreground"
            style={{ fontSize: "17px", fontWeight: 600, lineHeight: 1.3 }}
          >
            Portez l'écusson de confiance.
          </h3>
          <p
            className="font-sans text-muted-foreground mt-[8px]"
            style={{ fontSize: "13.5px", lineHeight: 1.5 }}
          >
            Priorité dans les résultats, écusson doré sur votre profil,
            confiance des propriétaires au premier regard.
          </p>
        </div>
      </div>

      <div className="mt-[14px]">
        <Link
          to="/mon-abonnement"
          className="text-primary hover:underline underline-offset-4"
          style={{ fontSize: "13px", fontWeight: 700 }}
        >
          Découvrir
        </Link>
      </div>
    </article>
  );
};

export default VerifiedSitterRailCard;
