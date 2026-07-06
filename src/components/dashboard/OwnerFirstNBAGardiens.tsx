/**
 * Owner Pass 3 — Carte "3 gardiens qui vous correspondent" pour new-owner.
 *
 * Rend tangible le vivier local avant même que l'owner ait publié.
 * Score d'affinité calculé côté client via `computeAffinityScore`.
 */
import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Plus } from "lucide-react";
import { useOwnerTopAffinitySitters, type AffinitySitterCard } from "@/hooks/useOwnerTopAffinitySitters";
import { useOwnerProfile } from "@/hooks/useOwnerProfile";
import { trackEvent } from "@/lib/analytics";

export default function OwnerFirstNBAGardiens() {
  const { topSitters, isLoading } = useOwnerTopAffinitySitters();
  const { data: owner } = useOwnerProfile();
  const seenRef = useRef(false);

  useEffect(() => {
    if (isLoading || seenRef.current || topSitters.length === 0) return;
    seenRef.current = true;
    void trackEvent("owner_first_nba_gardiens_seen", {
      metadata: {
        sitters_count: topSitters.length,
        avg_affinity: Math.round(
          topSitters.reduce((a, s) => a + s.affinity.score, 0) / topSitters.length,
        ),
      },
    });
  }, [isLoading, topSitters]);

  if (isLoading) return null;

  const city = owner?.city;

  if (topSitters.length < 3) {
    return (
      <section className="rounded-2xl border border-border bg-card p-5 md:p-6">
        <h2 className="text-lg md:text-xl font-serif font-semibold text-foreground">
          Des gardiens vous attendent près de chez vous
        </h2>
        <p className="text-sm text-muted-foreground mt-2">
          Nous cherchons des gardiens dans votre secteur, revenez dans quelques jours ou parrainez un proche.
        </p>
        <div className="mt-4">
          <Button asChild variant="outline" className="rounded-xl">
            <Link to="/inscription?role=sitter&refer=owner">Parrainer un proche gardien</Link>
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-5 md:p-6">
      <header className="mb-4">
        <h2 className="text-lg md:text-xl font-serif font-semibold text-foreground">
          3 gardiens qui vous correspondent{city ? ` à ${city}` : ""}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Score d'affinité calculé automatiquement. Publiez une annonce pour qu'ils puissent candidater.
        </p>
      </header>

      <ul className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
        {topSitters.map((s, index) => (
          <SitterCard key={s.id} sitter={s} position={index} />
        ))}
      </ul>

      <div className="mt-5 flex justify-center">
        <Button asChild size="lg" className="rounded-xl">
          <Link to="/sits/create">
            <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
            Publier une annonce que ces gardiens verront
          </Link>
        </Button>
      </div>
    </section>
  );
}

function SitterCard({ sitter, position }: { sitter: AffinitySitterCard; position: number }) {
  const initial = (sitter.first_name || "?").slice(0, 1).toUpperCase();
  const topCriteria = sitter.affinity.matched.slice(0, 2);

  const onClick = () => {
    void trackEvent("owner_first_nba_gardien_card_clicked", {
      metadata: {
        sitter_id: sitter.id,
        affinity_score: sitter.affinity.score,
        distance_km: sitter.distance_km,
        position,
      },
    });
  };

  return (
    <li>
      <Link
        to={`/gardiens/${sitter.id}`}
        onClick={onClick}
        className="block rounded-xl border border-border bg-background p-4 hover:border-foreground/30 transition-colors h-full"
      >
        <div className="flex items-center gap-3 mb-3">
          <Avatar className="h-12 w-12">
            {sitter.avatar_url && <AvatarImage src={sitter.avatar_url} alt="" />}
            <AvatarFallback>{initial}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-foreground truncate">
              {sitter.first_name ?? "Gardien"}
            </p>
            {sitter.city && (
              <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                <MapPin className="h-3 w-3" aria-hidden="true" />
                {sitter.city}
                {sitter.distance_km != null && (
                  <span className="text-muted-foreground/70">· {Math.round(sitter.distance_km)} km</span>
                )}
              </p>
            )}
          </div>
        </div>
        <Badge variant="secondary" className="mb-2">
          {sitter.affinity.score} % d'affinité
        </Badge>
        {topCriteria.length > 0 && (
          <ul className="text-xs text-muted-foreground space-y-0.5 mt-1">
            {topCriteria.map((c) => (
              <li key={c} className="truncate">· {c}</li>
            ))}
          </ul>
        )}
      </Link>
    </li>
  );
}
