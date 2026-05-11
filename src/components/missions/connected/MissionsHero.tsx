import { ENTRAIDE_HEADER_URL } from "./constants";

const MissionsHero = () => (
  <section className="relative overflow-hidden border-b border-border/40">
    <div className="absolute inset-0">
      <img src={ENTRAIDE_HEADER_URL} alt="" loading="eager" width={1600} height={400} className="w-full h-full object-cover object-[70%_30%] md:object-right" />
      <div className="absolute inset-0 bg-gradient-to-b from-background/95 via-background/80 to-background/60 md:bg-gradient-to-r md:from-background md:via-background/85 md:to-background/50" />
    </div>
    <div className="relative max-w-6xl mx-auto px-4 py-10 md:py-14 text-center space-y-3">
      <h1 className="font-heading text-3xl md:text-4xl font-bold text-foreground leading-tight">
        Petites missions près de chez vous
      </h1>
      <p className="text-sm md:text-base text-muted-foreground max-w-xl mx-auto">
        Demandez un coup de main ou proposez le vôtre — entre gens du coin, sans argent.
      </p>
      <p className="inline-block text-xs font-medium bg-primary/10 text-primary px-3 py-1 rounded-full">
        Gratuit pour tous les membres
      </p>
    </div>
  </section>
);

export default MissionsHero;
