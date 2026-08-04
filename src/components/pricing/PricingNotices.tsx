import { Link } from "react-router-dom";

/**
 * Bandeau adressé à l'auteur du texte, avant envoi. Informatif, jamais bloquant.
 */
export const PricingAuthorWarning = ({ className = "" }: { className?: string }) => (
  <div
    role="status"
    className={`rounded-lg border border-warning/40 bg-warning/10 px-3 py-2.5 ${className}`}
  >
    <p className="text-xs text-foreground leading-relaxed">
      Vous mentionnez un tarif. Sur Guardiens, une garde se fait sans échange d'argent. Si vous
      exercez à titre professionnel, déclarez votre activité, elle sera visible sur votre profil.
    </p>
    <Link
      to="/settings?section=security&focus=pro"
      className="mt-1 inline-block text-xs font-medium text-primary hover:underline"
    >
      Déclarer mon activité professionnelle
    </Link>
  </div>
);

/**
 * Encart discret affiché au destinataire, sous un message ou une candidature marquée.
 */
export const PricingRecipientNotice = ({ className = "" }: { className?: string }) => (
  <p
    className={`text-[11.5px] text-muted-foreground leading-snug rounded-lg border border-border bg-muted/40 px-2.5 py-1.5 ${className}`}
  >
    Ce membre mentionne un tarif et n'est pas déclaré comme professionnel. Une garde sur Guardiens
    se fait sans échange d'argent.
  </p>
);

export default PricingAuthorWarning;
