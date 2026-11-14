/**
 * Lot RCH6 puis RCH7 (14/11/2026, arène « page Recherche », décision 5) :
 * ligne propriétaire de /annonces pour un visiteur. Avec une ville, elle dit
 * combien de gardiens sont inscrits à moins de 30 km (count_eligible_sitters,
 * ouverte aux visiteurs, lot SEC2) ; sans chiffre lu, la phrase reste sans nombre.
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { geocodeCity } from "@/lib/geocode";
import { trackEvent } from "@/lib/analytics";

export const OWNER_LINE_RADIUS_KM = 30;

export function ownerLineText(city: string | null, count: number | null): string {
  if (city && typeof count === "number" && count > 0) {
    return `Vous partez bientôt ? ${count} gardien${count > 1 ? "s" : ""} inscrit${count > 1 ? "s" : ""} à moins de ${OWNER_LINE_RADIUS_KM} km de ${city}. Votre annonce leur part par email.`;
  }
  return "Vous partez bientôt ? Votre annonce part par email aux gardiens proches de chez vous.";
}

interface Props {
  city: string | null;
  href: string;
}

export default function OwnerVisitorLine({ city, href }: Props) {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    setCount(null);
    const place = (city || "").trim();
    if (!place) return;
    let cancelled = false;
    (async () => {
      try {
        const pt = await geocodeCity(place);
        if (!pt || cancelled) return;
        const { data, error } = await supabase.rpc("count_eligible_sitters", { p_lat: pt.lat, p_lng: pt.lng, p_radius_km: OWNER_LINE_RADIUS_KM });
        if (!cancelled && !error && typeof data === "number") setCount(data);
      } catch { /* phrase sans nombre */ }
    })();
    return () => { cancelled = true; };
  }, [city]);

  const label = city ? `Voir les gardiens à ${city}` : "Publier ma garde";
  return (
    <div className="my-8 flex flex-col sm:flex-row sm:items-center gap-3 rounded-2xl border border-border bg-card px-4 py-4 sm:px-5" data-testid="owner-visitor-line">
      <p className="flex-1 text-[14px] text-foreground">{ownerLineText(city, count)}</p>
      <Link
        to={href}
        onClick={() => { try { void trackEvent("owner_publish_bar_clicked", { source: "annonces", metadata: { with_city: !!city, count } }); } catch { /* mesure facultative */ } }}
        className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-full border border-primary px-5 text-sm font-semibold text-primary hover:bg-primary/5"
      >
        {label}
      </Link>
    </div>
  );
}
