import { FormEvent, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { geocodeCity } from "@/lib/geocode";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/lib/analytics";

/** Phrase du résultat : un seul chiffre, accordé, et un secteur vide dit avec envie. */
export function proximityLine(members: number): string {
  if (members < 1) return "Soyez parmi les premiers membres de votre secteur.";
  if (members === 1) return "1 membre inscrit à moins de 30 km de chez vous.";
  return `${members} membres inscrits à moins de 30 km de chez vous.`;
}

export interface HomeOrigin { lat: number; lng: number; city?: string | null }

/** Lot HOME1 : un seul chiffre, les membres inscrits dans le rayon. */
interface Counts { members: number }

export function HomeProximitySearch({ onLocated, tone = "dark" }: { onLocated: (origin: HomeOrigin) => void; tone?: "dark" | "light" }) {
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
    const origin = { lat: Number(geo.lat.toFixed(2)), lng: Number(geo.lng.toFixed(2)), city: value };
    // Le total des membres vient de home_members_nearby. Tant que cette
    // fonction manque en base, le plus grand des deux anciens compteurs sert
    // de minimum.
    const total = await (supabase.rpc as unknown as (fn: string, args: Record<string, number>) => Promise<{ data: unknown }>)("home_members_nearby", { p_lat: origin.lat, p_lng: origin.lng });
    let members: number | null = typeof total.data === "number" ? total.data : null;
    if (members === null) {
      const { data } = await supabase.rpc("home_proximity_counts", { p_lat: origin.lat, p_lng: origin.lng });
      const row = Array.isArray(data) ? data[0] : data;
      if (row) members = Math.max(Number(row.gardiens_count), Number(row.helpers_count));
    }
    if (members === null) {
      setMessage("Les disponibilités de votre secteur seront bientôt visibles.");
    } else {
      setCounts({ members });
      onLocated(origin);
    }
    setLoading(false);
  };

  return (
    <div className={tone === "light" ? "mt-1 w-full max-w-md" : "mt-2 max-w-md"}>
      <form onSubmit={submit} className="flex gap-2" aria-label="Disponibilités autour de votre ville">
        <Input
          value={city}
          onChange={(event) => setCity(event.target.value)}
          placeholder="Votre ville"
          aria-label="Votre ville"
          maxLength={100}
          className={tone === "light" ? "h-12 border-border bg-card text-base text-foreground placeholder:text-muted-foreground" : "h-12 border-primary-foreground/45 bg-background/90 text-base text-foreground placeholder:text-muted-foreground"}
        />
        <Button type="submit" variant="secondary" size="sm" className="h-12 bg-secondary px-5 text-secondary-foreground disabled:bg-secondary disabled:text-secondary-foreground disabled:opacity-60" disabled={loading || city.trim().length < 2}>
          {loading ? "Recherche" : "Voir"}
        </Button>
      </form>
      {counts && (
        <p className={tone === "light" ? "mt-3 text-base font-medium text-foreground" : "mt-3 w-fit rounded-xl bg-black/55 px-3 py-2 text-base font-medium text-primary-foreground"} aria-live="polite">
          {proximityLine(counts.members)}
        </p>
      )}
      {message && <p className={tone === "light" ? "mt-2 text-sm text-foreground" : "mt-2 w-fit rounded-xl bg-black/55 px-3 py-2 text-sm text-primary-foreground"} aria-live="polite">{message}</p>}
    </div>
  );
}