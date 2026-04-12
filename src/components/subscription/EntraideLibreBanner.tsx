export default function EntraideLibreBanner() {
  return (
    <div className="max-w-3xl mx-auto mb-12">
      <div className="rounded-2xl border border-border bg-card p-6 md:p-8">
        <h2 className="font-heading text-xl md:text-2xl font-semibold text-foreground mb-3">
          L'entraide entre gens du coin reste libre pour tous
        </h2>
        <p className="text-muted-foreground leading-relaxed mb-3">
          Arroser un potager, promener un chien le weekend, garder des poules pendant le marché — ces coups de main ponctuels entre gens du coin ne coûteront jamais rien. Ni aux propriétaires, ni aux gardiens. Pas d'argent, pas d'abonnement.
        </p>
        <p className="text-sm text-muted-foreground">
          Les tarifs ci-dessous concernent uniquement les gardes avec hébergement.
        </p>
      </div>
    </div>
  );
}
