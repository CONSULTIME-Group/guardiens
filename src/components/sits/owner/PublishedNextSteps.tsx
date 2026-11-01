/**
 * Lot PUB1 (01/11/2026, maquette « Annonce en ligne » v4) : ce qui va se passer
 * après la publication, affiché tant que l'annonce publiée n'a reçu aucune
 * candidature. Trois étapes vraies : alerte des gardiens qui suivent le secteur
 * (tâche planifiée toutes les 15 minutes), échange par la messagerie, rencontre
 * facultative puis choix.
 */
const STEPS = [
  "Les gardiens qui suivent votre secteur reçoivent votre annonce dans le quart d'heure.",
  "Vous lisez les profils et vous échangez par la messagerie.",
  "Vous vous rencontrez si vous le souhaitez, puis vous choisissez votre gardien.",
];

const PublishedNextSteps = () => (
  <section aria-labelledby="published-next-steps" className="mt-8 mb-8">
    <p id="published-next-steps" className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#8A5D3B]">
      <span aria-hidden="true" className="inline-block h-px w-[18px] bg-current" />
      Ce qui va se passer
    </p>
    <ol className="mt-2">
      {STEPS.map((text, i) => (
        <li key={text} className="flex gap-[14px] border-b border-border py-[14px] last:border-b-0">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">{i + 1}</span>
          <p className="mt-0.5 text-[15px] leading-relaxed text-foreground">{text}</p>
        </li>
      ))}
    </ol>
  </section>
);

export default PublishedNextSteps;
