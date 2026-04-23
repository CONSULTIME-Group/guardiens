import { Heart, Check } from "lucide-react";

export default function EntraideLibreBanner() {
  return (
    <div className="max-w-3xl mx-auto mb-12">
      <div className="rounded-2xl border-2 border-primary/30 bg-gradient-to-br from-primary/5 via-primary/[0.03] to-transparent p-6 md:p-8 shadow-sm">
        {/* Badge top */}
        <div className="flex items-center gap-2 mb-4">
          <div className="inline-flex items-center gap-1.5 bg-primary/10 text-primary text-xs font-body font-semibold uppercase tracking-wider px-3 py-1.5 rounded-full">
            <Heart className="h-3.5 w-3.5" fill="currentColor" />
            Gratuit pour toujours — quoi qu'il arrive
          </div>
        </div>

        <h2 className="font-heading text-xl md:text-2xl font-semibold text-foreground mb-3">
          L'entraide entre gens du coin reste libre pour tous
        </h2>
        <p className="text-foreground/70 leading-relaxed mb-5">
          Arroser un potager, promener un chien le weekend, garder des poules pendant le marché — ces coups de main ponctuels entre voisins ne coûteront <strong className="text-foreground">jamais rien</strong>. Ni aux propriétaires, ni aux gardiens. <strong className="text-foreground">Pas d'argent, pas d'abonnement</strong>, ni avant ni après le 13 mai.
        </p>

        {/* Liste claire de ce qui reste gratuit */}
        <div className="bg-background/60 border border-border/50 rounded-xl p-4 mb-4">
          <p className="text-xs uppercase tracking-widest text-foreground/50 font-body font-semibold mb-3">
            Ce qui restera toujours 100 % gratuit
          </p>
          <ul className="space-y-2">
            <li className="flex items-start gap-2.5 text-sm">
              <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <span className="font-body text-foreground/80">Publier et répondre aux petites missions d'entraide (potager, courrier, promenade ponctuelle…)</span>
            </li>
            <li className="flex items-start gap-2.5 text-sm">
              <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <span className="font-body text-foreground/80">Inscription propriétaire — publier vos annonces, recevoir et choisir des candidatures</span>
            </li>
            <li className="flex items-start gap-2.5 text-sm">
              <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <span className="font-body text-foreground/80">Consulter les guides locaux, fiches races et conseils de la communauté</span>
            </li>
            <li className="flex items-start gap-2.5 text-sm">
              <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <span className="font-body text-foreground/80">Laisser et lire des avis, échanger entre membres</span>
            </li>
          </ul>
        </div>

        <p className="text-sm text-foreground/60 font-body italic">
          Les tarifs ci-dessous concernent uniquement l'<strong className="not-italic font-medium text-foreground/80">abonnement gardien</strong> pour postuler aux gardes avec hébergement.
        </p>
      </div>
    </div>
  );
}
