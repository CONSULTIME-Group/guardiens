/**
 * Section pédagogique pour visiteurs anonymes, affichée entre le bloc
 * recherche et le footer SEO.
 *
 * Objectif : transformer la consultation libre en inscription. Le visiteur
 * arrive de Google, voit les annonces, mais ne comprend pas forcément :
 *  - comment ça marche concrètement (3 étapes claires) ;
 *  - pourquoi c'est fiable (preuves : vérif identité, avis, rencontre
 *    préalable, gratuité initiale) ;
 *  - combien ça coûte (rappel : consultation libre, inscription gratuite).
 *
 * Pas d'icônes Lucide décoratives (mémoire projet). Numérotation 1/2/3 en
 * chiffres typographiés à la place.
 */
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const STEPS = [
  {
    n: "1",
    title: "Consultez les annonces librement",
    text: "Parcourez les gardes ouvertes partout en France. Aucun compte requis pour explorer dates, photos, animaux et profils des propriétaires.",
  },
  {
    n: "2",
    title: "Inscrivez-vous et postulez",
    text: "Créez votre profil gardien gratuitement, présentez votre expérience et postulez aux annonces qui correspondent à votre disponibilité.",
  },
  {
    n: "3",
    title: "Rencontrez, puis confirmez",
    text: "Échangez par messagerie, faites connaissance lors d'une rencontre préalable, puis confirmez la garde d'un commun accord.",
  },
];

const TRUST = [
  {
    title: "Identité vérifiée",
    text: "Pièce d'identité contrôlée et badge « Vérifié » affiché sur chaque profil concerné.",
  },
  {
    title: "Avis authentiques",
    text: "Chaque garde réalisée donne lieu à un avis croisé propriétaire / gardien, non modifiable.",
  },
  {
    title: "Rencontre préalable",
    text: "Une rencontre est encouragée avant toute confirmation pour valider la confiance mutuelle.",
  },
  {
    title: "Score de confiance",
    text: "Note publique calculée sur l'identité, l'ancienneté, les avis et les gardes réalisées.",
  },
];

const SearchHowItWorksAnon = () => (
  <section
    aria-labelledby="search-how-heading"
    className="border-t border-border bg-background"
  >
    <div className="container max-w-6xl mx-auto px-4 py-12 md:py-16 space-y-12">
      {/* Comment ça marche */}
      <div>
        <h2
          id="search-how-heading"
          className="font-display text-2xl md:text-3xl font-semibold text-foreground mb-3"
        >
          Comment ça marche
        </h2>
        <p className="text-sm md:text-base text-muted-foreground mb-8 max-w-2xl">
          Trouver une garde à domicile prend quelques minutes. Voici les
          trois étapes côté gardien.
        </p>
        <ol className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {STEPS.map((s) => (
            <li
              key={s.n}
              className="rounded-2xl border border-border bg-card p-6 flex flex-col"
            >
              <span
                aria-hidden="true"
                className="font-display text-4xl font-semibold text-primary leading-none mb-3"
              >
                {s.n}
              </span>
              <h3 className="font-medium text-foreground mb-2">{s.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {s.text}
              </p>
            </li>
          ))}
        </ol>
      </div>

      {/* Rassurance */}
      <div>
        <h2 className="font-display text-2xl md:text-3xl font-semibold text-foreground mb-3">
          Une communauté de confiance
        </h2>
        <p className="text-sm md:text-base text-muted-foreground mb-8 max-w-2xl">
          Guardiens repose sur quatre piliers concrets pour sécuriser chaque
          garde.
        </p>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {TRUST.map((t) => (
            <li
              key={t.title}
              className="rounded-xl border border-border bg-card p-5"
            >
              <h3 className="font-medium text-foreground mb-1.5">{t.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t.text}
              </p>
            </li>
          ))}
        </ul>
      </div>

      {/* CTA conversion */}
      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="font-display text-lg md:text-xl font-semibold text-foreground">
            Prêt à postuler à votre première garde ?
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Inscription gratuite. Espace gardien gratuit jusqu'au 30 septembre
            2026, puis 6,99 € par mois sans engagement.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button asChild size="lg">
            <Link to="/inscription">Inscription gratuite</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/tarifs">Voir les tarifs</Link>
          </Button>
        </div>
      </div>
    </div>
  </section>
);

export default SearchHowItWorksAnon;
