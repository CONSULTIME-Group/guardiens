import { Heart } from "lucide-react";

export default function EntraideLibreBanner() {
  return (
    <div className="max-w-5xl mx-auto mb-6">
      <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 md:px-5 md:py-3.5 flex items-start md:items-center gap-3">
        <div className="shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary">
          <Heart className="h-4 w-4" fill="currentColor" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-heading text-sm md:text-base font-semibold text-foreground leading-snug">
            L'entraide entre gens du coin reste libre pour tous
          </p>
          <p className="text-xs md:text-sm text-foreground/70 font-body leading-snug mt-0.5">
            Petites missions ponctuelles (potager, courrier, promenade…) :{" "}
            <strong className="text-foreground font-semibold">100 % gratuit</strong>, ni avant ni après le 13 mai.
          </p>
        </div>
      </div>
    </div>
  );
}
