/**
 * Bloc de réassurance affiché en bas de la fiche annonce, identique pour
 * propriétaire et gardien. Anciennement dupliqué dans OwnerSitView et SitterSitView.
 */
const SitFooterReassurance = () => (
  <div className="mt-8 bg-primary/5 border border-primary/10 rounded-xl p-5 text-center">
    <p className="font-heading text-sm font-semibold text-primary">
      Écusson « Identité vérifiée » et avis croisés après chaque garde.
    </p>
    <p className="text-xs text-muted-foreground mt-1">
      Vous échangez avant de vous engager, et vous vous rencontrez si vous le
      souhaitez.
    </p>
  </div>
);

export default SitFooterReassurance;
