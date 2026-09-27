/**
 * Encart unique sous « Aussi pour vous » (lot D2).
 *
 * a) S'il existe des questions sans réponse qui comptent pour les annonces
 *    en ligne (deux au plus, chiffrées sur les annonces réelles), l'encart
 *    les nomme avec leurs boutons « Répondre ».
 * b) Sinon, l'encart invite à élargir la zone d'alerte, avec le compte réel
 *    des gardes publiées (`fallbackTotalPublished`).
 * Bordure beige, fond clair, rayon 18, bouton contour pin à droite
 * (en mobile, dessous). Jamais de barre de progression ni de badge permanent.
 */
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSitterMissingOpportunities } from "@/hooks/useSitterMissingOpportunities";
import { pickMissingOpportunities } from "@/lib/missingOpportunities";

const BOX_CLASS = "border border-border px-[22px] py-[22px] md:px-[26px]";
const BOX_STYLE = { borderRadius: "18px", backgroundColor: "hsl(var(--hero-paper) / 0.6)" } as const;
const BTN_CLASS =
  "inline-flex min-h-[44px] shrink-0 items-center justify-center rounded-full border border-primary px-[18px] text-[14px] font-semibold text-primary transition-colors hover:bg-primary/5";

export const alertInviteText = (n: number): string =>
  n === 1
    ? "1 garde est publiée en ce moment. Une zone d'alerte plus large vous prévient dès qu'une annonce paraît."
    : n > 1
      ? `${n} gardes sont publiées en ce moment. Une zone d'alerte plus large vous prévient dès qu'une annonce paraît.`
      : "Une zone d'alerte plus large vous prévient dès qu'une annonce paraît.";

export const SitterAlertInvite = ({ totalPublished }: { totalPublished: number }) => (
  <section aria-label="Zone d'alerte" data-testid="sitter-alert-invite" className={BOX_CLASS} style={BOX_STYLE}>
    <div className="flex flex-col md:flex-row md:items-center gap-[14px] md:gap-[22px]">
      <div className="min-w-0 flex-1">
        <h2 className="font-heading text-foreground text-[19px] font-semibold leading-snug">
          Recevez les nouvelles gardes en premier.
        </h2>
        <p className="mt-[8px] text-muted-foreground text-[13.5px] leading-relaxed">{alertInviteText(totalPublished)}</p>
      </div>
      <Link to="/mon-secteur" className={BTN_CLASS}>Élargir ma zone</Link>
    </div>
  </section>
);

interface Props {
  /** Compte réel des gardes publiées pour l'encart de repli. Absent : pas de repli. */
  fallbackTotalPublished?: number;
}

const SitterMissingOpportunities = ({ fallbackTotalPublished }: Props = {}) => {
  const { user } = useAuth();
  const stats = useSitterMissingOpportunities(user?.id);
  const items = useMemo(() => pickMissingOpportunities(stats), [stats]);

  if (items.length === 0) {
    return typeof fallbackTotalPublished === "number" ? <SitterAlertInvite totalPublished={fallbackTotalPublished} /> : null;
  }

  return (
    <section
      aria-labelledby="missing-opportunities-heading"
      data-testid="sitter-missing-opportunities"
      className={BOX_CLASS}
      style={BOX_STYLE}
    >
      <h2 id="missing-opportunities-heading" className="font-heading text-foreground text-[19px] font-semibold leading-snug">
        Ces réponses comptent pour les annonces en ligne
      </h2>
      <ul className="mt-[14px] space-y-[14px]">
        {items.map((item) => (
          <li key={item.key} className="flex flex-col gap-[8px] md:flex-row md:items-center md:justify-between md:gap-[22px]">
            <p className="text-[13.5px] text-muted-foreground">{item.sentence}</p>
            <Link to={item.href} className={BTN_CLASS}>{item.ctaLabel}</Link>
          </li>
        ))}
      </ul>
    </section>
  );
};

export default SitterMissingOpportunities;
