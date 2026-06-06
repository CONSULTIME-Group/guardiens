import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { ENTRAIDE_HEADER_URL } from "./constants";

interface Props {
  missionCount?: number;
  helperCount?: number;
  onPropose?: () => void;
}

const MissionsHero = ({ missionCount = 0, helperCount = 0, onPropose }: Props) => {
  const hasActivity = missionCount + helperCount > 0;
  return (
    <section className="relative overflow-hidden border-b border-border/40">
      <div className="absolute inset-0">
        <img src={ENTRAIDE_HEADER_URL} alt="" loading="eager" width={1600} height={400} className="w-full h-full object-cover object-[70%_30%] md:object-right" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/95 via-background/80 to-background/60 md:bg-gradient-to-r md:from-background md:via-background/85 md:to-background/50" />
      </div>
      <div className="relative max-w-6xl mx-auto px-4 py-10 md:py-14 text-center space-y-4">
        <h1 className="font-heading text-3xl md:text-4xl font-bold text-foreground leading-tight">
          Petites missions près de chez vous
        </h1>
        <p className="text-sm md:text-base text-muted-foreground max-w-xl mx-auto">
          Demandez un coup de main ou proposez le vôtre, entre gens du coin, sans argent.
        </p>
        {hasActivity && (
          <p className="text-xs text-muted-foreground">
            {missionCount > 0 && (
              <>
                <span className="font-semibold text-foreground">{missionCount}</span> demande{missionCount > 1 ? "s" : ""} en cours
              </>
            )}
            {missionCount > 0 && helperCount > 0 && <span className="mx-2">·</span>}
            {helperCount > 0 && (
              <>
                <span className="font-semibold text-foreground">{helperCount}</span> personne{helperCount > 1 ? "s" : ""} prête{helperCount > 1 ? "s" : ""} à aider
              </>
            )}
          </p>
        )}
        {/* Item 8, un seul CTA primaire dans le hero, le second devient un lien tertiaire
            pour limiter le mur de boutons verts (4 → 2 sur mobile). */}
        <div className="flex flex-col sm:flex-row items-center gap-3 justify-center pt-1">
          <Link to="/petites-missions/creer">
            <Button variant="hero" size="lg" className="w-full sm:w-auto">
              J'ose, je publie ma demande
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          {onPropose && (
            <button
              type="button"
              onClick={onPropose}
              className="text-sm text-primary font-semibold hover:underline"
            >
              ou me rendre visible comme aidant →
            </button>
          )}
        </div>
      </div>
    </section>
  );
};

export default MissionsHero;
