import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, ShieldCheck } from "lucide-react";
import TrustHaloAvatar from "@/components/sitters/TrustHaloAvatar";
import { avatarImageUrl } from "@/lib/storageImage";
import { postalMatchesDepartment } from "@/lib/postalDepartment";
import { pickNearbySitters } from "@/lib/cityProximity";

interface Props {
  city: string;
  citySlug?: string;
  /**
   * Code département de la page (ex : "93", "974", "2A"). Filtre les
   * gardiens par code postal selon la règle de recalc_seo_city_page_counts
   * : postal absent conservé, 20xxx rattaché à 2A et 2B, DOM sur 3
   * caractères. Sans code résolu, aucun filtre (repli identique au SQL).
   */
  departmentCode?: string | null;
  /**
   * Coordonnées de la commune (seo_city_pages ou données statiques). Si
   * l'une est absente, la grille reste strictement résidente, comportement
   * historique inchangé.
   */
  cityLat?: number | null;
  cityLng?: number | null;
}

interface SitterRow {
  id: string;
  first_name: string | null;
  avatar_url: string | null;
  city: string | null;
  postal_code: string | null;
  identity_verified: boolean | null;
}

interface NearbyRow extends SitterRow {
  latitude_approx: number | null;
  longitude_approx: number | null;
  geographic_radius: number | null;
}

const GRID_SIZE = 6;

// Boîte englobante large (~250 km) : le rayon déclaré maximal observé est
// 200 km, la distance exacte est recalculée ensuite par pickNearbySitters.
const LAT_DELTA = 2.5;
const LNG_DELTA = 3.5;

/**
 * Affiche 3-6 gardiens du coin sur une page ville SEO.
 * RGPD : prénom + ville + avatar uniquement. Données déjà publiques sur /gardiens/:id.
 *
 * Complément de proximité (23/08/2026) : quand moins de 6 résidents, on
 * complète avec des gardiens dont le rayon déclaré couvre la commune, triés
 * par distance croissante, jamais plus que nécessaire pour atteindre 6. Ces
 * cartes portent le marqueur « Intervient dans le secteur » : un gardien de
 * proximité n'est jamais présenté comme habitant la commune.
 */
const CitySittersGrid = ({ city, citySlug, departmentCode, cityLat, cityLng }: Props) => {
  const { data: sitters, isLoading } = useQuery({
    queryKey: ["city-sitters-grid", city, departmentCode ?? ""],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("public_profiles")
        .select("id, first_name, avatar_url, city, postal_code, role, identity_verified")
        .in("role", ["sitter", "both"])
        .ilike("city", `%${city}%`)
        .not("first_name", "is", null)
        .not("avatar_url", "is", null)
        .limit(24);
      if (error) return [] as SitterRow[];
      return (data || []) as SitterRow[];
    },
    enabled: !!city,
    staleTime: 5 * 60 * 1000,
  });

  const hasCoords =
    typeof cityLat === "number" && typeof cityLng === "number";

  // Candidats de proximité : profils publics géocodés dans la boîte
  // englobante, enrichis du rayon déclaré (public_sitter_profiles).
  const { data: nearbyCandidates = [] } = useQuery({
    queryKey: ["city-nearby-sitters", city, cityLat, cityLng, departmentCode ?? ""],
    enabled: !!city && hasCoords,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data: profs, error } = await supabase
        .from("public_profiles")
        .select(
          "id, first_name, avatar_url, city, postal_code, role, identity_verified, latitude_approx, longitude_approx"
        )
        .in("role", ["sitter", "both"])
        .not("first_name", "is", null)
        .not("avatar_url", "is", null)
        .not("latitude_approx", "is", null)
        .not("longitude_approx", "is", null)
        .gte("latitude_approx", (cityLat as number) - LAT_DELTA)
        .lte("latitude_approx", (cityLat as number) + LAT_DELTA)
        .gte("longitude_approx", (cityLng as number) - LNG_DELTA)
        .lte("longitude_approx", (cityLng as number) + LNG_DELTA)
        .limit(400);
      if (error || !profs?.length) return [] as NearbyRow[];

      const ids = profs.map((p) => p.id as string);
      const { data: radii } = await supabase
        .from("public_sitter_profiles")
        .select("user_id, geographic_radius")
        .in("user_id", ids)
        .gt("geographic_radius", 0);
      const radiusById = new Map<string, number>(
        (radii ?? []).map((r) => [r.user_id as string, r.geographic_radius as number])
      );

      return profs.map((p) => ({
        ...(p as unknown as SitterRow),
        latitude_approx: p.latitude_approx as number | null,
        longitude_approx: p.longitude_approx as number | null,
        geographic_radius: radiusById.get(p.id as string) ?? null,
      })) as NearbyRow[];
    },
  });

  if (isLoading) return null;

  // Filtre départemental sur le code postal : élimine les homonymes hors
  // département (Saint-Denis du 93 vs Saint-Denis de La Réunion).
  const residents = (sitters ?? [])
    .filter((s) => postalMatchesDepartment(s.postal_code, departmentCode))
    .slice(0, GRID_SIZE);

  const residentIds = new Set(residents.map((r) => r.id));
  const nearby = hasCoords
    ? pickNearbySitters(nearbyCandidates, {
        city,
        departmentCode,
        cityLat: cityLat as number,
        cityLng: cityLng as number,
        excludeIds: residentIds,
        limit: GRID_SIZE - residents.length,
      })
    : [];

  const cards: Array<{ row: SitterRow; nearby: boolean }> = [
    ...residents.map((row) => ({ row, nearby: false })),
    ...nearby.map((row) => ({ row, nearby: true })),
  ];

  const hasResidents = residents.length > 0;
  const hasAny = cards.length > 0;

  return (
    <section className="max-w-5xl mx-auto px-4 py-12 border-t border-border">
      <div className="mb-8">
        <h2 className="font-serif text-2xl md:text-3xl font-bold text-foreground mb-2">
          {hasResidents
            ? `Gardiens inscrits à ${city}`
            : nearby.length > 0
              ? `Gardiens qui interviennent à ${city}`
              : `Soyez le premier gardien à ${city}`}
        </h2>
        <p className="text-muted-foreground">
          {hasResidents
            ? "Profils publics. L'écusson « Identité vérifiée » apparaît sur les profils dont la pièce d'identité a été validée."
            : nearby.length > 0
              ? `Ces gardiens n'habitent pas ${city} mais leur rayon d'intervention la couvre.`
              : "Le réseau se construit. Rejoignez les premiers gardiens, l'accès est gratuit aujourd'hui, sans engagement."}
        </p>
      </div>

      {hasAny && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 mb-8">
          {cards.map(({ row: s, nearby: isNearby }) => (
            <Link
              key={s.id}
              to={`/gardiens/${s.id}`}
              className="group flex flex-col items-center text-center"
            >
              <TrustHaloAvatar
                verified={s.identity_verified === true}
                avgRating={null}
                sitsCount={null}
                size="h-16 w-16"
              >
                {s.avatar_url ? (
                  <img
                    src={avatarImageUrl(s.avatar_url, 64)}
                    alt={
                      isNearby
                        ? `${s.first_name}, gardien qui intervient à ${city}`
                        : `${s.first_name} gardien à ${city}`
                    }
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
              {isNearby && (
                <p className="mt-0.5 text-[11px] leading-tight text-muted-foreground/80">
                  Intervient dans le secteur
                </p>
              )}
            </Link>
          ))}
        </div>
      )}

      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-6 w-6 text-primary shrink-0" />
            <p className="text-sm text-foreground">
              {hasResidents
                ? `Échangez avec un gardien de ${city} en quelques minutes.`
                : nearby.length > 0
                  ? `Échangez avec un gardien qui intervient à ${city} en quelques minutes.`
                  : `Devenez gardien à ${city} et accédez aux annonces près de chez vous.`}
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            {hasAny && (
              <Link to={citySlug ? `/search?ville=${citySlug}` : "/search"}>
                <Button variant="outline" size="sm" className="gap-2">
                  Voir tous les gardiens
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            )}
            <Link to="/inscription">
              <Button size="sm" className="gap-2">
                {hasAny ? "Trouver mon gardien" : "Devenir gardien"}
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
