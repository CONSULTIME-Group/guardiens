import { useEffect, useMemo } from "react";
import { Circle, MapContainer, TileLayer, Tooltip, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import LeafletUnmountGuard from "@/components/shared/LeafletUnmountGuard";
import { MAP_TILE_ATTRIBUTION, MAP_TILE_URL, MAP_TILE_URL_WORLD } from "@/lib/mapTiles";
import { offsetApproximatePoint } from "@/lib/entraideMap";
import type { EntraideNeed, PublicHelper } from "./EntraideCards";

interface Point {
  id: string;
  lat: number;
  lng: number;
  label: string;
  kind: "need" | "helper";
}

interface Cluster extends Point {
  count: number;
}

const clusterPoints = (points: Point[], zoom: number): Cluster[] => {
  const precision = zoom >= 12 ? 100 : zoom >= 9 ? 25 : 7;
  const grouped = new Map<string, Cluster>();
  for (const point of points) {
    const key = `${Math.round(point.lat * precision)}:${Math.round(point.lng * precision)}:${point.kind}`;
    const current = grouped.get(key);
    if (current) {
      current.lat = (current.lat * current.count + point.lat) / (current.count + 1);
      current.lng = (current.lng * current.count + point.lng) / (current.count + 1);
      current.count += 1;
    } else {
      grouped.set(key, { ...point, count: 1 });
    }
  }
  return [...grouped.values()];
};

const FitPoints = ({ points, focus }: { points: Point[]; focus: [number, number] | null }) => {
  const map = useMap();
  useEffect(() => {
    if (focus) {
      map.setView(focus, 11);
      return;
    }
    if (points.length === 1) map.setView([points[0].lat, points[0].lng], 11);
    if (points.length > 1) map.fitBounds(points.map((point) => [point.lat, point.lng]), { padding: [28, 28], maxZoom: 11 });
  }, [focus, map, points]);
  return null;
};

const HubCircles = ({ points }: { points: Point[] }) => {
  const map = useMap();
  const clusters = useMemo(() => clusterPoints(points, map.getZoom()), [map, points]);
  return (
    <>
      {clusters.map((cluster) => (
        <Circle
          key={`${cluster.kind}-${cluster.id}`}
          center={[cluster.lat, cluster.lng]}
          radius={cluster.count > 1 ? 520 + cluster.count * 35 : 360}
          pathOptions={{
            color: cluster.kind === "need" ? "hsl(var(--primary))" : "hsl(var(--secondary))",
            fillColor: cluster.kind === "need" ? "hsl(var(--primary))" : "hsl(var(--secondary))",
            fillOpacity: 0.24,
            weight: 2,
          }}
        >
          <Tooltip>{cluster.count > 1 ? `${cluster.count} coups de main dans ce secteur` : cluster.label}</Tooltip>
        </Circle>
      ))}
    </>
  );
};

const EntraideMap = ({ needs, helpers, focus }: {
  needs: EntraideNeed[];
  helpers: PublicHelper[];
  focus: [number, number] | null;
}) => {
  const points = useMemo<Point[]>(() => [
    ...needs.flatMap((need) => need.latitude === null || need.longitude === null ? [] : [{
      id: need.id,
      ...offsetApproximatePoint(need.id, need.latitude, need.longitude),
      label: need.title,
      kind: "need" as const,
    }]),
    ...helpers.flatMap((helper) => helper.latitude_approx === null || helper.longitude_approx === null ? [] : [{
      id: helper.id,
      ...offsetApproximatePoint(helper.id, helper.latitude_approx, helper.longitude_approx),
      label: helper.first_name,
      kind: "helper" as const,
    }]),
  ], [helpers, needs]);

  if (points.length === 0 && !focus) {
    return <div className="flex h-[360px] items-center justify-center bg-muted text-sm text-muted-foreground">La carte se remplit avec les coups de main du coin.</div>;
  }

  return (
    <div className="h-[360px] overflow-hidden rounded-lg border border-border sm:h-[520px]" aria-label="Carte des besoins et des personnes disponibles">
      <MapContainer center={focus || [46.6, 2.4]} zoom={focus ? 11 : 6} className="h-full w-full" scrollWheelZoom>
        <LeafletUnmountGuard />
        <TileLayer url={focus ? MAP_TILE_URL : MAP_TILE_URL_WORLD} attribution={MAP_TILE_ATTRIBUTION} />
        <FitPoints points={points} focus={focus} />
        <HubCircles points={points} />
      </MapContainer>
    </div>
  );
};

export default EntraideMap;