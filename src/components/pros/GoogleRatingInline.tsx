import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  proId: string;
  placeId: string;
}

// Affiche uniquement la note moyenne Google + nombre d'avis, en inline.
// Pas de détail des avis (pas de contrainte d'attribution lourde).
export default function GoogleRatingInline({ proId, placeId }: Props) {
  const [rating, setRating] = useState<number | null>(null);
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!proId || !placeId) return;
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("get-google-reviews", {
          body: { pro_id: proId, place_id: placeId },
        });
        if (error) return;
        setRating((data as any).rating_avg ?? null);
        setCount((data as any).rating_count ?? 0);
      } catch {
        /* silencieux */
      }
    })();
  }, [proId, placeId]);

  if (rating == null || count === 0) return null;

  return (
    <span className="inline-flex items-center gap-1 text-sm rounded-md border border-border bg-muted/50 px-2 py-0.5">
      <span className="text-amber-500" aria-hidden>★</span>
      <span className="font-medium">{rating.toFixed(1)}</span>
      <span className="text-muted-foreground">({count} avis Google)</span>
    </span>
  );
}
