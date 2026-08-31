import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Scale } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface LiquiditySnapshot {
  window_days: number;
  active_listings: number;
  eligible_sitters: number;
  pending_applications: number;
  pending_oldest_days: number | null;
  response_count: number;
  response_median_hours: number | null;
  conversion_accepted: number;
  conversion_decided: number;
  generated_at: string;
}

/** En dessous de 5, un taux ou une médiane est du bruit : compte brut. */
const MIN_DENOMINATOR = 5;

const formatMedianHours = (hours: number): string =>
  hours < 48 ? `${Math.round(hours)} h` : `${(hours / 24).toFixed(1).replace(".", ",")} j`;

const plural = (n: number, one: string, many: string) => (n > 1 ? many : one);

interface Cell {
  label: string;
  value: string;
  sub: string;
  link: string;
}

/**
 * Bloc Liquidité : la place de marché fonctionne-t-elle ? Quatre indicateurs
 * sur 90 jours glissants, calculés par admin_liquidity_snapshot. Règle
 * d'affichage : jamais de taux ni de médiane sans son dénominateur, et
 * compte brut avec mention explicite si l'effectif est inférieur à 5.
 */
export const LiquidityBlock = () => {
  const { data, isLoading, error } = useQuery<LiquiditySnapshot>({
    queryKey: ["admin_liquidity_snapshot"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_liquidity_snapshot");
      if (error) throw error;
      return data as unknown as LiquiditySnapshot;
    },
    staleTime: 30_000,
  });

  const cells: Cell[] = [];
  if (data) {
    cells.push({
      label: "Annonces actives",
      value: String(data.active_listings),
      sub: `${data.eligible_sitters} ${plural(data.eligible_sitters, "gardien éligible", "gardiens éligibles")} à 100 km ou moins d'au moins une annonce`,
      link: "/admin/listings",
    });
    cells.push({
      label: "Candidatures en attente de réponse",
      value: String(data.pending_applications),
      sub:
        data.pending_applications > 0 && data.pending_oldest_days !== null
          ? `Plus ancienne : ${data.pending_oldest_days} j`
          : "Aucune candidature en souffrance",
      link: "/admin/listings",
    });
    if (data.response_count >= MIN_DENOMINATOR && data.response_median_hours !== null) {
      cells.push({
        label: "Délai médian de première réponse",
        value: formatMedianHours(data.response_median_hours),
        sub: `Sur ${data.response_count} ${plural(data.response_count, "candidature avec réponse", "candidatures avec réponse")}`,
        link: "/admin/sits-management",
      });
    } else {
      cells.push({
        label: "Délai médian de première réponse",
        value: "·",
        sub:
          data.response_count > 0
            ? `${data.response_count} ${plural(data.response_count, "candidature avec réponse", "candidatures avec réponse")}, effectif trop faible pour une médiane`
            : "Aucune réponse enregistrée sur la fenêtre",
        link: "/admin/sits-management",
      });
    }
    if (data.conversion_decided >= MIN_DENOMINATOR) {
      cells.push({
        label: "Conversion candidature vers garde confirmée",
        value: `${data.conversion_accepted} sur ${data.conversion_decided}`,
        sub: "Candidatures tranchées (acceptées ou rejetées)",
        link: "/admin/sits-management",
      });
    } else {
      cells.push({
        label: "Conversion candidature vers garde confirmée",
        value: String(data.conversion_accepted),
        sub: `Effectif trop faible pour un taux (${data.conversion_decided} ${plural(data.conversion_decided, "tranchée", "tranchées")})`,
        link: "/admin/sits-management",
      });
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-heading flex items-center gap-2">
          <Scale className="h-4 w-4 text-muted-foreground" aria-hidden />
          Liquidité de la place de marché
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Fenêtre glissante de {data?.window_days ?? 90} jours
          {data?.generated_at
            ? ` · relevé le ${new Date(data.generated_at).toLocaleString("fr-FR")}`
            : ""}
          . Gardiens éligibles : vivier actif complet, sans filtre d'identité ni de complétude.
        </p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <Skeleton className="h-20 rounded-lg" />
            <Skeleton className="h-20 rounded-lg" />
            <Skeleton className="h-20 rounded-lg" />
            <Skeleton className="h-20 rounded-lg" />
          </div>
        ) : error || !data ? (
          <p className="text-sm text-destructive">
            Chargement des indicateurs de liquidité impossible. Réessayez plus tard.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {cells.map((cell) => (
              <Link
                key={cell.label}
                to={cell.link}
                className="block rounded-lg border border-border p-3 hover:shadow-md transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <p className="text-xs text-muted-foreground">{cell.label}</p>
                <p className="text-2xl font-bold mt-1">{cell.value}</p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{cell.sub}</p>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
