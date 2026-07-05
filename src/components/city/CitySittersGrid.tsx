import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, ShieldCheck } from "lucide-react";
import TrustHaloAvatar from "@/components/sitters/TrustHaloAvatar";

interface Props {
  city: string;
  citySlug?: string;
}

interface SitterRow {
  id: string;
  first_name: string | null;
  avatar_url: string | null;
  city: string | null;
}

/**
 * Affiche 3-6 gardiens du coin sur une page ville SEO.
 * RGPD : prénom + ville + avatar uniquement. Données déjà publiques sur /gardiens/:id.
 */
const CitySittersGrid = ({ city, citySlug }: Props) => {
  const { data: sitters, isLoading } = useQuery({
    queryKey: ["city-sitters-grid", city],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, first_name, avatar_url, city, role")
        .in("role", ["sitter", "both"])
        .ilike("city", `%${city}%`)
        .not("first_name", "is", null)
        .not("avatar_url", "is", null)
        .limit(6);
      if (error) return [] as SitterRow[];
      return (data || []) as SitterRow[];
    },
    enabled: !!city,
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) return null;

  const list = sitters ?? [];

  return (
    <section className="max-w-5xl mx-auto px-4 py-12 border-t border-border">
      <div className="mb-8">
        <h2 className="font-serif text-2xl md:text-3xl font-bold text-foreground mb-2">
          {list.length > 0
            ? `Gardiens vérifiés à ${city}`
            : `Soyez le premier gardien à ${city}`}
        </h2>
        <p className="text-muted-foreground">
          {list.length > 0
            ? "Profils publics, identités vérifiées manuellement par l'équipe Guardiens."
            : "Le réseau se construit. Rejoignez les premiers gardiens, l'accès est gratuit aujourd'hui, sans engagement."}
        </p>
      </div>

      {list.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 mb-8">
          {list.map((s) => (
            <Link
              key={s.id}
              to={`/gardiens/${s.id}`}
              className="group flex flex-col items-center text-center"
            >
              <TrustHaloAvatar
                verified
                avgRating={null}
                sitsCount={null}
                size="h-16 w-16"
              >
                {s.avatar_url ? (
                  <img
                    src={s.avatar_url}
                    alt={`${s.first_name} gardien à ${city}`}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full bg-muted flex items-center justify-center font-semibold text-muted-foreground">
                    {s.first_name?.[0]}
                  </div>
                )}
              </TrustHaloAvatar>
              <p className="mt-2 text-sm font-medium text-foreground group-hover:text-primary truncate w-full">
                {s.first_name}
              </p>
              <p className="text-xs text-muted-foreground truncate w-full">
                {s.city}
              </p>
            </Link>
          ))}
        </div>
      )}

      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-6 w-6 text-primary shrink-0" />
            <p className="text-sm text-foreground">
              {list.length > 0
                ? `Échangez avec un gardien de ${city} en quelques minutes.`
                : `Devenez gardien à ${city} et accédez aux annonces près de chez vous.`}
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            {list.length > 0 && (
              <Link to={citySlug ? `/search?ville=${citySlug}` : "/search"}>
                <Button variant="outline" size="sm" className="gap-2">
                  Voir tous les gardiens
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            )}
            <Link to="/inscription">
              <Button size="sm" className="gap-2">
                {list.length > 0 ? "Trouver mon gardien" : "Devenir gardien"}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </section>
  );
};

export default CitySittersGrid;
