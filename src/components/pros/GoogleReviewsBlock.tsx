import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface GoogleReview {
  author_name: string;
  author_photo: string | null;
  author_uri: string | null;
  rating: number | null;
  text: string;
  relative_time: string;
}

interface Props {
  proId: string;
  placeId: string;
}

export default function GoogleReviewsBlock({ proId, placeId }: Props) {
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<GoogleReview[]>([]);
  const [ratingAvg, setRatingAvg] = useState<number | null>(null);
  const [ratingCount, setRatingCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!proId || !placeId) return;
    (async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke("get-google-reviews", {
          body: { pro_id: proId, place_id: placeId },
        });
        if (error) throw error;
        setReviews((data as any).reviews ?? []);
        setRatingAvg((data as any).rating_avg ?? null);
        setRatingCount((data as any).rating_count ?? 0);
      } catch (e: any) {
        setError(e?.message ?? "Erreur de chargement");
      } finally {
        setLoading(false);
      }
    })();
  }, [proId, placeId]);

  if (loading) return <Skeleton className="h-40 mt-6" />;
  if (error || reviews.length === 0) return null;

  return (
    <section className="mt-8" aria-labelledby="google-reviews-heading">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h2 id="google-reviews-heading" className="text-xl font-semibold">
          Avis Google
        </h2>
        {ratingAvg != null && (
          <p className="text-sm text-muted-foreground">
            <span className="text-amber-500" aria-hidden>★</span>{" "}
            <span className="font-medium text-foreground">{ratingAvg.toFixed(1)}</span>
            {" · "}
            {ratingCount} avis sur Google
          </p>
        )}
      </div>
      <div className="grid md:grid-cols-2 gap-3">
        {reviews.map((r, i) => (
          <Card key={i}>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center gap-2">
                {r.author_photo && (
                  <img
                    src={r.author_photo}
                    alt=""
                    className="w-8 h-8 rounded-full"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                )}
                <div className="min-w-0 flex-1">
                  {r.author_uri ? (
                    <a
                      href={r.author_uri}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      className="text-sm font-medium hover:underline truncate block"
                    >
                      {r.author_name}
                    </a>
                  ) : (
                    <p className="text-sm font-medium truncate">{r.author_name}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {r.rating != null && <span className="text-amber-500" aria-hidden>{"★".repeat(r.rating)}</span>}{" "}
                    {r.relative_time}
                  </p>
                </div>
              </div>
              {r.text && <p className="text-sm whitespace-pre-line line-clamp-6">{r.text}</p>}
            </CardContent>
          </Card>
        ))}
      </div>
      <p className="text-xs text-muted-foreground mt-2">
        Avis affichés depuis Google. Attribution obligatoire, 5 avis maximum par établissement.
      </p>
    </section>
  );
}
