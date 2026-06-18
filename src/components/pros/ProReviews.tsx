import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

type Review = {
  id: string;
  user_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  author_name?: string | null;
  author_avatar?: string | null;
};

function Stars({ value, onChange, size = "text-xl" }: { value: number; onChange?: (n: number) => void; size?: string }) {
  return (
    <div className={`inline-flex gap-0.5 ${size}`} role={onChange ? "radiogroup" : undefined} aria-label="Note">
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = n <= Math.round(value);
        const Star = (
          <span aria-hidden className={filled ? "text-amber-500" : "text-muted-foreground/40"}>
            ★
          </span>
        );
        return onChange ? (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            aria-label={`${n} étoile${n > 1 ? "s" : ""}`}
            className="leading-none hover:scale-110 transition"
          >
            {Star}
          </button>
        ) : (
          <span key={n} className="leading-none">{Star}</span>
        );
      })}
    </div>
  );
}

export default function ProReviews({
  proId,
  proName,
  ratingAvg,
  ratingCount,
  onRefresh,
}: {
  proId: string;
  proName: string;
  ratingAvg: number | null;
  ratingCount: number;
  onRefresh?: () => void;
}) {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [myReview, setMyReview] = useState<Review | null>(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("pro_reviews" as any)
      .select("id, user_id, rating, comment, created_at")
      .eq("pro_id", proId)
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(50);
    const list = (data as any as Review[]) ?? [];

    // récupère les profils (nom + avatar) en lot
    const ids = Array.from(new Set(list.map((r) => r.user_id)));
    if (ids.length > 0) {
      const { data: profs } = await (supabase
        .from("profiles") as any)
        .select("user_id, first_name, last_name, avatar_url")
        .in("user_id", ids);
      const map = new Map((profs ?? []).map((p: any) => [p.user_id, p]));
      list.forEach((r) => {
        const p = map.get(r.user_id);
        if (p) {
          r.author_name = [p.first_name, p.last_name].filter(Boolean).join(" ") || null;
          r.author_avatar = p.avatar_url ?? null;
        }
      });
    }

    setReviews(list);
    const mine = user ? list.find((r) => r.user_id === user.id) ?? null : null;
    setMyReview(mine);
    if (mine) {
      setRating(mine.rating);
      setComment(mine.comment ?? "");
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proId, user?.id]);

  const submit = async () => {
    if (!user) return;
    if (rating < 1) {
      toast.error("Sélectionnez une note");
      return;
    }
    setSubmitting(true);
    const payload = { pro_id: proId, user_id: user.id, rating, comment: comment.trim() || null };
    const { error } = await supabase
      .from("pro_reviews" as any)
      .upsert(payload as any, { onConflict: "pro_id,user_id" });
    setSubmitting(false);
    if (error) {
      toast.error("Impossible d'enregistrer votre avis");
      return;
    }
    toast.success(myReview ? "Avis mis à jour" : "Merci pour votre avis");
    await load();
    onRefresh?.();
  };

  const remove = async () => {
    if (!user || !myReview) return;
    if (!confirm("Supprimer votre avis ?")) return;
    const { error } = await supabase.from("pro_reviews" as any).delete().eq("id", myReview.id);
    if (error) {
      toast.error("Suppression impossible");
      return;
    }
    setMyReview(null);
    setRating(0);
    setComment("");
    await load();
    onRefresh?.();
  };

  return (
    <section className="mt-8" aria-labelledby="pro-reviews-heading">
      <div className="flex items-end justify-between flex-wrap gap-3 mb-4">
        <div>
          <h2 id="pro-reviews-heading" className="text-xl font-display font-bold">
            Avis de la communauté
          </h2>
          {ratingCount > 0 ? (
            <div className="flex items-center gap-2 mt-1">
              <Stars value={ratingAvg ?? 0} size="text-base" />
              <span className="text-sm text-muted-foreground">
                {Number(ratingAvg ?? 0).toFixed(1)} / 5 · {ratingCount} avis
              </span>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground mt-1">
              Aucun avis pour l'instant. Soyez la première personne à partager votre expérience.
            </p>
          )}
        </div>
      </div>

      {user ? (
        <Card className="mb-6">
          <CardContent className="p-5 space-y-3">
            <p className="text-sm font-medium">
              {myReview ? "Modifier votre avis" : `Donner votre avis sur ${proName}`}
            </p>
            <Stars value={rating} onChange={setRating} />
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Votre expérience, en quelques mots (facultatif)"
              rows={3}
              maxLength={1000}
            />
            <div className="flex gap-2">
              <Button onClick={submit} disabled={submitting || rating < 1}>
                {myReview ? "Mettre à jour" : "Publier"}
              </Button>
              {myReview && (
                <Button variant="ghost" onClick={remove} disabled={submitting}>
                  Supprimer
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="mb-6 bg-muted/30">
          <CardContent className="p-5 text-sm">
            <Link to="/connexion" className="underline font-medium">
              Connectez-vous
            </Link>{" "}
            pour laisser un avis vérifié.
          </CardContent>
        </Card>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Chargement des avis…</p>
      ) : reviews.length === 0 ? null : (
        <ul className="space-y-3">
          {reviews.map((r) => (
            <li key={r.id}>
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center gap-3 mb-2">
                    {r.author_avatar ? (
                      <img
                        src={r.author_avatar}
                        alt=""
                        className="w-9 h-9 rounded-full object-cover bg-muted"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-muted" aria-hidden />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {r.author_name ?? "Membre de la communauté"}
                      </p>
                      <div className="flex items-center gap-2">
                        <Stars value={r.rating} size="text-sm" />
                        <span className="text-xs text-muted-foreground">
                          {new Date(r.created_at).toLocaleDateString("fr-FR", {
                            year: "numeric",
                            month: "long",
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                  {r.comment && (
                    <p className="text-sm whitespace-pre-line">{r.comment}</p>
                  )}
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
