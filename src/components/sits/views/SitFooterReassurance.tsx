/**
 * Bloc de réassurance affiché en bas de la fiche annonce, identique pour
 * propriétaire et gardien. Anciennement dupliqué dans OwnerSitView et SitterSitView.
 */
const SitFooterReassurance = () => (
  <div className="mt-8 bg-primary/5 border border-primary/10 rounded-xl p-5 text-center">
    <p className="font-heading text-sm font-semibold text-primary">
      Si un imprévu survient, une alerte prioritaire peut être envoyée aux
      gardiens d'urgence éligibles.
    </p>
    <p className="text-xs text-muted-foreground mt-1">
      Écusson « Identité vérifiée », avis croisés, alertes prioritaires
    </p>
  </div>
);

export default SitFooterReassurance;
