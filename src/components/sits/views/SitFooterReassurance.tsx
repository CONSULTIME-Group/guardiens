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
      Le réseau de gardiens d'urgence est à venir : il pourra relayer le
      gardien titulaire en cas d'imprévu.
    </p>
  </div>
);

export default SitFooterReassurance;
