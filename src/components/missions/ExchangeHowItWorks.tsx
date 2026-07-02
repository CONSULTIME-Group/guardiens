import { Link } from "react-router-dom";
import { ArrowRight, MessageCircle, HandHeart, Sparkles } from "lucide-react";

interface ExchangeHowItWorksProps {
  /** owner = perspective propriétaire, sitter = perspective gardien, public = neutre. */
  variant?: "owner" | "sitter" | "public";
  className?: string;
  /** Titre optionnel, sinon "Comment ça marche ?". */
  title?: string;
}

/**
 * Bloc pédagogique 3 étapes qui explique le concept d'échange des coups de main.
 * Décliné pour dashboards owner / sitter et pour la page publique.
 * Sans argent, sans abonnement, vouvoiement, ton chaleureux.
 */
const ExchangeHowItWorks = ({
  variant = "public",
  className,
  title = "Comment ça marche ?",
}: ExchangeHowItWorksProps) => {
  const steps =
    variant === "sitter"
      ? [
          {
            icon: HandHeart,
            title: "1. Repérez un besoin ou proposez votre aide",
            text: "Parcourez les besoins près de chez vous, ou publiez une offre : promenade, visite éclair, coup de patte au jardin.",
          },
          {
            icon: MessageCircle,
            title: "2. Convenez d'un petit échange",
            text: "Ni tarif ni facture. Un café, des œufs du jardin, une histoire à partager, un service en retour : vous décidez ensemble.",
          },
          {
            icon: Sparkles,
            title: "3. Rendez-vous, puis laissez un avis",
            text: "Vous vous rencontrez, vous rendez service, vous vous notez. Chaque échange nourrit votre réputation.",
          },
        ]
      : variant === "owner"
      ? [
          {
            icon: HandHeart,
            title: "1. Publiez votre besoin en 1 minute",
            text: "Une visite pour votre chat, un coup de main au jardin, une course urgente : décrivez, ajoutez une photo, publiez.",
          },
          {
            icon: MessageCircle,
            title: "2. Convenez d'un petit échange",
            text: "Ni tarif ni facture. Un café, des œufs du jardin, une histoire à partager, un service en retour : vous décidez ensemble.",
          },
          {
            icon: Sparkles,
            title: "3. On se retrouve, puis on se remercie",
            text: "Le coup de main a lieu, vous laissez un avis. La personne qui vous aide gagne en réputation locale.",
          },
        ]
      : [
          {
            icon: HandHeart,
            title: "1. Publiez un besoin ou une offre",
            text: "Un coup de main ponctuel : visite d'animal, promenade, jardinage, courses, présence rassurante.",
          },
          {
            icon: MessageCircle,
            title: "2. Convenez d'un petit échange",
            text: "Sans argent, sans abonnement. Un café, des œufs, un service en retour : c'est vous qui décidez.",
          },
          {
            icon: Sparkles,
            title: "3. Rendez-vous et laissez un avis",
            text: "Après le coup de main, un mot, un merci, une note. La confiance locale se construit échange après échange.",
          },
        ];

  const primaryCta =
    variant === "sitter"
      ? { label: "Proposer mon aide", to: "/petites-missions/creer?type=offre" }
      : { label: "Publier un besoin", to: "/petites-missions/creer?type=besoin" };

  return (
    <section
      className={
        "rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-transparent p-4 md:p-6 " +
        (className || "")
      }
      aria-label="Concept des coups de main"
    >
      <header className="mb-4 md:mb-5">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">
          Coups de main
        </p>
        <h3 className="font-heading text-lg md:text-xl font-semibold text-foreground mt-1">
          {title}
        </h3>
        <p className="text-sm text-foreground/70 mt-1">
          Un coup de main, c'est un échange. Sans argent, sans abonnement.
        </p>
      </header>

      <ol className="grid gap-3 md:grid-cols-3">
        {steps.map((step) => {
          const Icon = step.icon;
          return (
            <li
              key={step.title}
              className="rounded-xl border border-border bg-card p-4 flex flex-col gap-2"
            >
              <div className="rounded-lg bg-primary/10 p-2 w-fit">
                <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
              </div>
              <p className="font-heading text-sm font-semibold text-foreground leading-snug">
                {step.title}
              </p>
              <p className="text-xs text-foreground/70 leading-relaxed">{step.text}</p>
            </li>
          );
        })}
      </ol>

      <div className="flex flex-wrap items-center gap-2 mt-4 md:mt-5">
        <Link
          to={primaryCta.to}
          className="inline-flex items-center gap-1.5 rounded-full bg-primary text-primary-foreground px-4 py-2 text-xs font-semibold hover:opacity-90 transition-opacity"
        >
          {primaryCta.label}
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
        <Link
          to="/petites-missions"
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-4 py-2 text-xs font-semibold text-foreground hover:bg-accent transition-colors"
        >
          Parcourir les échanges
        </Link>
      </div>
    </section>
  );
};

export default ExchangeHowItWorks;
