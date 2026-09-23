import { FormEvent, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { geocodeCity } from "@/lib/geocode";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/lib/analytics";

export interface HomeOrigin { lat: number; lng: number }

interface Counts { gardiens_count: number; helpers_count: number }

export function HomeProximitySearch({ onLocated }: { onLocated: (origin: HomeOrigin) => void }) {
  const [city, setCity] = useState("");
  const [counts, setCounts] = useState<Counts | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const value = city.trim().slice(0, 100);
    if (value.length < 2) return;
    setLoading(true);
    setMessage("");
    void trackEvent("home_city_submitted", { metadata: { city_length: value.length } });
    const geo = await geocodeCity(value, "France");
    if (!geo) {
      setCounts(null);
      setMessage("Précisez votre ville pour voir les membres disponibles autour de vous.");
      setLoading(false);
      return;
    }
    const origin = { lat: Number(geo.lat.toFixed(2)), lng: Number(geo.lng.toFixed(2)) };
    const { data, error } = await supabase.rpc("home_proximity_counts", {
      p_lat: origin.lat,
      p_lng: origin.lng,
    });
    const row = Array.isArray(data) ? data[0] : data;
    if (error || !row) {
      setMessage("Les disponibilités de votre secteur seront bientôt visibles.");
    } else {
      setCounts({ gardiens_count: Number(row.gardiens_count), helpers_count: Number(row.helpers_count) });
      onLocated(origin);
    }
    setLoading(false);
  };

  return (
    <div className="mt-4 max-w-md">
      <form onSubmit={submit} className="flex gap-2" aria-label="Disponibilités autour de votre ville">
        <Input
          value={city}
          onChange={(event) => setCity(event.target.value)}
          placeholder="Votre ville"
          aria-label="Votre ville"
          maxLength={100}
          className="h-11 border-primary-foreground/45 bg-background/90 text-foreground placeholder:text-muted-foreground"
        />
        <Button type="submit" variant="secondary" size="sm" className="h-11 bg-secondary px-5 text-secondary-foreground disabled:bg-secondary disabled:text-secondary-foreground disabled:opacity-60" disabled={loading || city.trim().length < 2}>
          {loading ? "Recherche" : "Voir"}
        </Button>
      </form>
      {counts && (
        <p className="mt-2 text-sm text-primary-foreground" aria-live="polite">
          {counts.gardiens_count} gardiens et {counts.helpers_count} personnes prêtes à aider à moins de 30 km
          {(counts.gardiens_count < 1 || counts.helpers_count < 1) && <span className="block">Soyez parmi les premiers de votre secteur.</span>}
        </p>
      )}
      {message && <p className="mt-2 text-sm text-primary-foreground" aria-live="polite">{message}</p>}
    </div>
  );
}