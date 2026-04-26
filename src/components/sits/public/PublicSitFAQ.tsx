/**
 * Mini-FAQ honnête pour les visiteurs anonymes de la page d'annonce.
 * Traite les objections clés avant qu'elles ne deviennent des freins.
 *
 * NOTE — Politique de transparence sur l'abonnement :
 * À ce jour, l'inscription et la candidature sont gratuites pour tout le
 * monde. Un abonnement gardien sera introduit à terme — on l'annonce ici
 * sans le cacher pour préserver la confiance.
 */
import { useState } from "react";
import { ChevronDown } from "lucide-react";

const FAQ_ITEMS: Array<{ q: string; a: string }> = [
  {
    q: "C'est vraiment gratuit ?",
    a: "Oui : la garde elle-même est 100 % gratuite, sans aucun paiement entre membres. L'inscription et la candidature aux annonces sont également gratuites aujourd'hui. À terme, un abonnement gardien sera introduit pour faire vivre la plateforme — vous serez prévenu(e) bien avant tout changement.",
  },
  {
    q: "Comment je suis protégé(e) en tant que gardien ?",
    a: "Chaque membre passe par une vérification d'identité, un accord de garde est signé en amont entre les deux parties, et un système d'avis croisés permet d'évaluer la fiabilité de chacun. Une équipe modère les signalements.",
  },
  {
    q: "Je n'ai jamais gardé d'animaux, est-ce que je peux postuler ?",
    a: "Oui. Beaucoup de gardes conviennent à des profils débutants (chats indépendants, séjours courts, animaux faciles). Vous pouvez préciser votre expérience dans votre message — c'est le propriétaire qui décide.",
  },
];

export default function PublicSitFAQ() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  return (
    <section aria-labelledby="public-sit-faq-heading" className="mb-8">
      <h2
        id="public-sit-faq-heading"
        className="font-heading text-lg font-semibold mb-3 text-foreground"
      >
        Vos questions avant de postuler
      </h2>
      <ul className="space-y-2">
        {FAQ_ITEMS.map((item, idx) => {
          const isOpen = openIdx === idx;
          return (
            <li
              key={item.q}
              className="rounded-xl border border-border bg-card overflow-hidden"
            >
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={`faq-panel-${idx}`}
                onClick={() => setOpenIdx(isOpen ? null : idx)}
                className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left text-sm font-medium text-foreground hover:bg-muted/40 transition-colors"
              >
                <span>{item.q}</span>
                <ChevronDown
                  className={`h-4 w-4 text-muted-foreground transition-transform shrink-0 ${
                    isOpen ? "rotate-180" : ""
                  }`}
                  aria-hidden="true"
                />
              </button>
              {isOpen && (
                <div
                  id={`faq-panel-${idx}`}
                  className="px-4 pb-3 text-sm text-muted-foreground leading-relaxed"
                >
                  {item.a}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
