import { useEffect, useMemo, useState } from "react";
import { Circle, CircleMarker, MapContainer, Popup, TileLayer, Tooltip, useMap, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import LeafletUnmountGuard from "@/components/shared/LeafletUnmountGuard";
import { MAP_TILE_WORLD_ATTRIBUTION, MAP_TILE_WORLD_URL } from "@/lib/mapTiles";
import { offsetApproximatePoint } from "@/lib/entraideMap";
import { HelperCard, NeedCard, type EntraideNeed, type PublicHelper } from "./EntraideCards";

/** Onglet actif : il décide qui est un marqueur principal, qui est en fond. */
export type EntraideMapTab = "needs" | "helpers";

interface Point {
  id: string;
  lat: number;
  lng: number;
  label: string;
  kind: "need" | "helper";
  need?: EntraideNeed;
  helper?: PublicHelper;
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
      map.setView(focus, 12);
      return;
    }
    if (points.length === 1) map.setView([points[0].lat, points[0].lng], 11);
    if (points.length > 1) map.fitBounds(points.map((point) => [point.lat, point.lng]), { padding: [28, 28], maxZoom: 11 });
  }, [focus, map, points]);
  return null;
};

/** Besoins : pastilles terracotta regroupées, cliquables. */
const NeedCircles = ({ points }: { points: Point[] }) => {
  const map = useMap();
  const [zoom, setZoom] = useState(map.getZoom());
  useMapEvents({ zoomend: () => setZoom(map.getZoom()) });
  const clusters = useMemo(() => clusterPoints(points, zoom), [points, zoom]);
  return (
    <>
      {clusters.map((cluster) => (
        <Circle
          key={`need-${cluster.id}`}
          center={[cluster.lat, cluster.lng]}
          radius={cluster.count > 1 ? 520 + cluster.count * 35 : 360}
          pathOptions={{
            color: "hsl(var(--secondary))",
            fillColor: "hsl(var(--secondary))",
            fillOpacity: 0.24,
            weight: 2,
          }}
        >
          <Tooltip>{cluster.count > 1 ? `${cluster.count} besoins dans ce secteur` : cluster.label}</Tooltip>
          {cluster.count === 1 && cluster.need && (
            <Popup minWidth={280}>
              <NeedCard need={cluster.need} distance={null} showDistance={false} compact />
            </Popup>
          )}
        </Circle>
      ))}
    </>
  );
};

/** Personnes disponibles : petits points verts, cliquables. */
const HelperDots = ({ points }: { points: Point[] }) => (
  <>
    {points.map((point) => (
      <CircleMarker
        key={`helper-${point.id}`}
        center={[point.lat, point.lng]}
        radius={5}
        pathOptions={{ color: "hsl(var(--primary))", fillColor: "hsl(var(--primary))", fillOpacity: 0.75, weight: 1 }}
      >
        <Tooltip>{point.label}</Tooltip>
        {point.helper && (
          <Popup minWidth={280}>
            <HelperCard helper={point.helper} distance={null} showDistance={false} compact />
          </Popup>
        )}
      </CircleMarker>
    ))}
  </>
);

/** Légende fixe : mêmes couleurs quelle que soit la vue. */
const MapLegend = () => (
  <ul className="flex flex-wrap items-center gap-4 border-t border-border bg-card px-3 py-2 text-xs text-muted-foreground">
    <li className="flex items-center gap-2">
      <span aria-hidden="true" className="h-3 w-3 rounded-full bg-secondary" />
      Besoins
    </li>
    <li className="flex items-center gap-2">
      <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-primary" />
      Personnes disponibles
    </li>
  </ul>
);

const EntraideMap = ({ needs, helpers, focus }: {
  needs: EntraideNeed[];
  helpers: PublicHelper[];
  focus: [number, number] | null;
  tab?: EntraideMapTab;
}) => {
  const all = useMemo<{ needPoints: Point[]; helperPoints: Point[] }>(() => {
    const needPoints = needs.flatMap((need) => need.latitude === null || need.longitude === null ? [] : [{
      id: need.id,
      ...offsetApproximatePoint(need.id, need.latitude, need.longitude),
      label: need.title,
      kind: "need" as const,
      need,
    }]);
    const helperPoints = helpers.flatMap((helper) => helper.latitude_approx === null || helper.longitude_approx === null ? [] : [{
      id: helper.id,
      ...offsetApproximatePoint(helper.id, helper.latitude_approx, helper.longitude_approx),
      label: helper.first_name,
      kind: "helper" as const,
      helper,
    }]);
    return { needPoints, helperPoints };
  }, [helpers, needs]);

  const points = useMemo<Point[]>(() => [...all.needPoints, ...all.helperPoints], [all]);

  if (points.length === 0 && !focus) {
    return <div className="flex h-[360px] items-center justify-center bg-muted text-sm text-muted-foreground">La carte se remplit avec les coups de main du coin.</div>;
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border" aria-label="Carte des besoins et des personnes disponibles">
      <div className="h-[360px] sm:h-[520px]">
        <MapContainer center={focus || [46.6, 2.4]} zoom={focus ? 12 : 6} className="h-full w-full" scrollWheelZoom>
          <LeafletUnmountGuard />
          <TileLayer url={MAP_TILE_WORLD_URL} attribution={MAP_TILE_WORLD_ATTRIBUTION} />
          <FitPoints points={points} focus={focus} />
          <HelperDots points={all.helperPoints} />
          <NeedCircles points={all.needPoints} />
        </MapContainer>
      </div>
      <MapLegend />
    </div>
  );
};


export default EntraideMap;
