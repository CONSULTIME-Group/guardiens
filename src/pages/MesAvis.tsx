import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import StarRating from "@/components/reviews/StarRating";
import { Helmet } from "react-helmet-async";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ThumbsUp, Star, Inbox, Send, AlertTriangle, Clock, CheckCircle2, XCircle } from "lucide-react";
import { hydrateReviewers } from "@/lib/hydrateReviewers";
import DisputeReviewDialog from "@/components/reviews/DisputeReviewDialog";

type DisputeStatus = "pending" | "accepted" | "rejected";
interface DisputeInfo { status: DisputeStatus; }

const MesAvis = () => {
  const { user } = useAuth();
  const [received, setReceived] = useState<any[]>([]);
  const [given, setGiven] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [disputes, setDisputes] = useState<Record<string, DisputeInfo>>({});

  const loadAll = async () => {
    if (!user) return;
    setLoading(true);
    const [recRes, givRes, dispRes] = await Promise.all([
      supabase
        .from("reviews")
        .select("*")
        .eq("reviewee_id", user.id)
        .eq("published", true)
        .eq("moderation_status", "valide")
        .order("created_at", { ascending: false }),
      supabase
        .from("reviews")
        .select("*")
        .eq("reviewer_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("review_disputes")
        .select("review_id, status")
        .eq("disputer_id", user.id),
    ]);

    const enrichedReceived = await hydrateReviewers(recRes.data || [], { includeReviewee: true });
    const enrichedGiven = await hydrateReviewers(givRes.data || [], { includeReviewee: true });

    const dispMap: Record<string, DisputeInfo> = {};
    (dispRes.data || []).forEach((d: any) => {
      // garde le plus récent (pending > resolved)
      if (!dispMap[d.review_id] || d.status === "pending") {
        dispMap[d.review_id] = { status: d.status };
      }
    });

    setReceived(enrichedReceived);
    setGiven(enrichedGiven);
    setDisputes(dispMap);
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  if (!user) {
    return (
      <div className="p-6 max-w-2xl mx-auto text-center">
        <p>Veuillez vous connecter pour consulter vos avis.</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      <Helmet>
        <title>Mes avis — Guardiens</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>

      <header className="mb-6">
        <h1 className="font-heading text-2xl md:text-3xl font-bold text-foreground">Mes avis</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Retrouvez les avis que vous avez reçus et ceux que vous avez laissés.
        </p>
      </header>

      <Tabs defaultValue="received" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="received" className="gap-2">
            <Inbox className="h-4 w-4" />
            Reçus ({received.length})
          </TabsTrigger>
          <TabsTrigger value="given" className="gap-2">
            <Send className="h-4 w-4" />
            Laissés ({given.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="received">
          {loading ? (
            <p className="text-sm text-muted-foreground">Chargement…</p>
          ) : received.length === 0 ? (
            <EmptyMessage
              title="Aucun avis reçu pour le moment"
              subtitle="Vos avis apparaîtront ici dès qu'un membre en aura laissé un sur votre profil."
            />
          ) : (
            <ReviewsList reviews={received} mode="received" disputes={disputes} onDisputeChange={loadAll} />
          )}
        </TabsContent>

        <TabsContent value="given">
          {loading ? (
            <p className="text-sm text-muted-foreground">Chargement…</p>
          ) : given.length === 0 ? (
            <EmptyMessage
              title="Vous n'avez encore laissé aucun avis"
              subtitle="Après chaque garde terminée, vous pourrez évaluer l'autre partie depuis la fiche de la garde."
            />
          ) : (
            <ReviewsList reviews={given} mode="given" disputes={{}} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

const EmptyMessage = ({ title, subtitle }: { title: string; subtitle: string }) => (
  <div className="rounded-xl border border-border bg-card p-8 text-center">
    <Star className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
    <p className="font-heading font-semibold text-foreground mb-1">{title}</p>
    <p className="text-sm text-muted-foreground">{subtitle}</p>
  </div>
);

const ReviewsList = ({
  reviews,
  mode,
  disputes,
  onDisputeChange,
}: {
  reviews: any[];
  mode: "received" | "given";
  disputes: Record<string, DisputeInfo>;
  onDisputeChange?: () => void;
}) => {
  const [disputeReviewId, setDisputeReviewId] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      {reviews.map((r) => {
        const otherParty = mode === "received" ? r.reviewer : r.reviewee;
        const otherName = otherParty?.first_name || "Membre";
        const otherAvatar = otherParty?.avatar_url;
        const labelPrefix = mode === "received" ? "Par" : "Pour";
        const isPending = mode === "given" && !r.published;
        const dispute = disputes[r.id];
        const ageMs = Date.now() - new Date(r.created_at).getTime();
        const canDispute =
          mode === "received" &&
          !dispute &&
          ageMs < 30 * 24 * 60 * 60 * 1000;

        return (
          <div key={r.id} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-3 mb-2">
              {otherAvatar ? (
                <img src={otherAvatar} alt="" className="w-10 h-10 rounded-full object-cover" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-bold text-muted-foreground">
                  {otherName.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">
                  <span className="text-muted-foreground font-normal">{labelPrefix} </span>
                  {otherName}
                </p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(r.created_at), "d MMMM yyyy", { locale: fr })}
                  {r.review_type === "annulation" && (
                    <span className="ml-2 inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px]">
                      Annulation
                    </span>
                  )}
                  {isPending && (
                    <span className="ml-2 inline-flex items-center rounded-full bg-warning/10 text-warning px-2 py-0.5 text-[10px]">
                      En attente de publication
                    </span>
                  )}
                </p>
              </div>
              {r.overall_rating ? <StarRating value={r.overall_rating} readonly size="sm" /> : null}
            </div>

            {r.cancellation_reason && (
              <p className="text-sm text-foreground/80 italic mt-2">{r.cancellation_reason}</p>
            )}
            {r.comment && (
              <p className="text-sm text-foreground/80 whitespace-pre-line mt-2">{r.comment}</p>
            )}

            {r.would_recommend && (
              <div className="flex items-center gap-1 text-xs text-primary font-medium mt-2">
                <ThumbsUp className="h-3 w-3" /> Recommandé
              </div>
            )}

            {mode === "given" && isPending && (
              <p className="text-xs text-muted-foreground mt-3 italic">
                Cet avis sera publié dès que l'autre partie aura déposé le sien (système double-aveugle).
              </p>
            )}

            {/* Statut de contestation */}
            {dispute?.status === "pending" && (
              <div className="flex items-center gap-1.5 text-xs text-warning mt-3 bg-warning/5 rounded-md px-2.5 py-1.5">
                <Clock className="h-3.5 w-3.5" />
                Contestation en cours d'examen
              </div>
            )}
            {dispute?.status === "accepted" && (
              <div className="flex items-center gap-1.5 text-xs text-success mt-3 bg-success/5 rounded-md px-2.5 py-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Contestation acceptée — l'avis a été retiré
              </div>
            )}
            {dispute?.status === "rejected" && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-3 bg-muted/50 rounded-md px-2.5 py-1.5">
                <XCircle className="h-3.5 w-3.5" />
                Contestation refusée par la modération
              </div>
            )}

            <div className="flex items-center justify-between mt-3 gap-2 flex-wrap">
              {r.sit_id ? (
                <Link
                  to={`/sits/${r.sit_id}`}
                  className="text-xs text-primary hover:underline"
                >
                  Voir la garde concernée →
                </Link>
              ) : <span />}

              {canDispute && (
                <button
                  onClick={() => setDisputeReviewId(r.id)}
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors"
                >
                  <AlertTriangle className="h-3 w-3" />
                  Contester cet avis
                </button>
              )}
            </div>
          </div>
        );
      })}

      {disputeReviewId && (
        <DisputeReviewDialog
          open={!!disputeReviewId}
          onOpenChange={(o) => !o && setDisputeReviewId(null)}
          reviewId={disputeReviewId}
          onSubmitted={onDisputeChange}
        />
      )}
    </div>
  );
};

export default MesAvis;
