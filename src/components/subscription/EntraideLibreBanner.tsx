import { Heart } from "lucide-react";

export default function EntraideLibreBanner() {
  return (
    <div className="max-w-5xl mx-auto mb-6">
      <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-4 md:px-6 md:py-5 flex items-start gap-4">
        <div className="shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary">
          <Heart className="h-5 w-5" fill="currentColor" />
        </div>
        <div className="flex-1 min-w-0 space-y-1.5">
          <p className="font-heading text-sm md:text-base font-semibold text-foreground leading-snug">
            L'entraide entre gens du coin restera toujours offerte (0 €)
          </p>
          <p className="text-xs md:text-sm text-foreground/70 font-body leading-relaxed">
            Arroser un potager, sortir un chien le weekend, garder des poules le temps d'un marché… Ces coups de main entre gens du coin font le tissu d'un village et ne devraient jamais avoir de prix. C'est à nous de montrer l'exemple : les <strong className="text-foreground font-semibold">petites missions d'entraide resteront 100 % offertes (0 €) à vie</strong>, pour que ce lien continue d'exister indépendamment de toute monétisation.
          </p>
        </div>
      </div>
    </div>
  );
}
