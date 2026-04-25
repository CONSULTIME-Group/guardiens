/**
 * Bloc de réassurance affiché en bas de la fiche annonce, identique pour
 * propriétaire et gardien. Anciennement dupliqué dans OwnerSitView et SitterSitView.
 */
const SitFooterReassurance = () => (
  <div className="mt-8 bg-primary/5 border border-primary/10 rounded-xl p-5 text-center">
    <p className="font-heading text-sm font-semibold text-primary">
      Vous partez l'esprit léger — et si un imprévu survient, votre réseau local
      de gardiens prend le relais.
    </p>
    <p className="text-xs text-muted-foreground mt-1">
      Profils vérifiés · Avis croisés · Gardiens d'urgence mobilisables
    </p>
  </div>
);

export default SitFooterReassurance;
