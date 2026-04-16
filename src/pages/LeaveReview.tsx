import { useState, useEffect, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, ThumbsUp, ThumbsDown, CheckCircle2 } from "lucide-react";
import StarRating from "@/components/reviews/StarRating";
import { Helmet } from "react-helmet-async";

type ReviewDirection = "owner_to_sitter" | "sitter_to_owner";

const ownerCriteria = [
  { key: "animal_care_rating", label: "Soin des animaux" },
  { key: "communication_rating", label: "Communication pendant la garde" },
  { key: "housing_respect_rating", label: "Respect du logement" },
  { key: "reliability_rating", label: "Ponctualité / fiabilité" },
] as const;

const sitterCriteria = [
  { key: "listing_accuracy_rating", label: "Exactitude de l'annonce" },
  { key: "welcome_rating", label: "Accueil et passage de relais" },
  { key: "instructions_clarity_rating", label: "Clarté des consignes" },
  { key: "housing_condition_rating", label: "État du logement" },
] as const;

const LeaveReview = () => {
  const { sitId } = useParams<{ sitId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [sit, setSit] = useState<any>(null);
  const [reviewee, setReviewee] = useState<any>(null);
  const [alreadyReviewed, setAlreadyReviewed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [overallRating, setOverallRating] = useState(0);
  const [subRatings, setSubRatings] = useState<Record<string, number>>({});
  const [wouldRecommend, setWouldRecommend] = useState<boolean | null>(null);
  const [comment, setComment] = useState("");

  const [reviewDirection, setReviewDirection] = useState<ReviewDirection>("owner_to_sitter");

  useEffect(() => {
    if (!sitId || !user) return;

    const load = async () => {
      setLoading(true);
      setLoadError(null);

      const { data: sitData, error: sitError } = await supabase
        .from("sits")
        .select("id, status, title, user_id")
        .eq("id", sitId)
        .maybeSingle();

      if (sitError || !sitData) {
        setLoadError("Cette garde est introuvable.");
        setLoading(false);
        return;
      }

      setSit(sitData);

      if (sitData.status !== "completed") {
        setLoading(false);
        return;
      }

      const isOwner = sitData.user_id === user.id;
      const nextDirection: ReviewDirection = isOwner ? "owner_to_sitter" : "sitter_to_owner";
      setReviewDirection(nextDirection);

      let revieweeId = "";

      if (isOwner) {
        const { data: acceptedApplication, error: appError } = await supabase
          .from("applications")
          .select("sitter_id")
          .eq("sit_id", sitId)
          .eq("status", "accepted")
          .maybeSingle();

        if (appError || !acceptedApplication?.sitter_id) {
          setLoadError("Impossible de retrouver le gardien associé à cette garde.");
          setLoading(false);
          return;
        }

        revieweeId = acceptedApplication.sitter_id;
      } else {
        const { data: myAcceptedApplication, error: myAppError } = await supabase
          .from("applications")
          .select("sitter_id")
          .eq("sit_id", sitId)
          .eq("sitter_id", user.id)
          .eq("status", "accepted")
          .maybeSingle();

        if (myAppError || !myAcceptedApplication) {
          setLoadError("Vous ne pouvez laisser un avis que pour une garde que vous avez réellement effectuée.");
          setLoading(false);
          return;
        }

        revieweeId = sitData.user_id;
      }

      const [{ data: profile, error: profileError }, { data: existingReview }] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, first_name, avatar_url")
          .eq("id", revieweeId)
          .maybeSingle(),
        supabase
          .from("reviews")
          .select("id")
          .eq("sit_id", sitId)
          .eq("reviewer_id", user.id)
          .maybeSingle(),
      ]);

      if (profileError || !profile) {
        setLoadError("Impossible de charger la personne à évaluer.");
        setLoading(false);
        return;
      }

      setReviewee(profile);
      setAlreadyReviewed(!!existingReview);
      setLoading(false);
    };

    load();
  }, [sitId, user]);

  const isOwnerReview = reviewDirection === "owner_to_sitter";
  const criteria = isOwnerReview ? ownerCriteria : sitterCriteria;
  const dbReviewType = "garde";

  const intro = useMemo(() => {
    if (isOwnerReview) {
      return {
        title: "Votre retour sur le gardien",
        subtitle: "Dites en quoi cette garde avec ce gardien s'est bien passée — ou non.",
        recommendation: "Recommanderiez-vous ce gardien ?",
        placeholder: "Expliquez concrètement comment la garde s'est passée : échanges, soin des animaux, fiabilité, respect du logement…",
      };
    }

    return {
      title: "Votre retour sur le propriétaire",
      subtitle: "Partagez votre expérience chez ce propriétaire pour aider les prochains gardiens.",
      recommendation: "Recommanderiez-vous ce propriétaire ?",
      placeholder: "Décrivez l'expérience vécue : annonce fidèle, accueil, clarté des consignes, état du logement…",
    };
  }, [isOwnerReview]);

  const canSubmit = overallRating > 0 && comment.trim().length >= 50 && wouldRecommend !== null;

  const handleSubmit = async () => {
    if (!canSubmit || !user || !reviewee || !sitId) return;
    setSubmitting(true);

    const payload: Record<string, unknown> = {
      sit_id: sitId,
      reviewer_id: user.id,
      reviewee_id: reviewee.id,
      overall_rating: overallRating,
      comment: comment.trim(),
      would_recommend: wouldRecommend,
      review_type: dbReviewType,
      published: false,
    };

    criteria.forEach((criterion) => {
      if (subRatings[criterion.key]) payload[criterion.key] = subRatings[criterion.key];
    });

    const { error } = await supabase.from("reviews").insert(payload as any);

    if (error) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de soumettre l'avis.",
        variant: "destructive",
      });
      setSubmitting(false);
      return;
    }

    // Send email to the other party inviting them to leave their review
    try {
      const { data: revieweeProfile } = await supabase
        .from("profiles")
        .select("first_name")
        .eq("id", reviewee.id)
        .maybeSingle();

      const { data: reviewerProfile } = await supabase
        .from("profiles")
        .select("first_name")
        .eq("id", user.id)
        .maybeSingle();

      // Get reviewee's email via auth — we need to find it from the conversation or profile
      // The reviewee email is fetched from auth.users via edge function
      const revieweeEmail = await (async () => {
        // We can get email from the profiles table if available, otherwise skip
        const { data: authData } = await supabase.rpc("get_user_email_for_notification" as any, { target_user_id: reviewee.id });
        return authData as string | null;
      })().catch(() => null);

      if (revieweeEmail) {
        await supabase.functions.invoke("send-transactional-email", {
          body: {
            templateName: "review-received",
            recipientEmail: revieweeEmail,
            idempotencyKey: `review-received-${sitId}-${reviewee.id}`,
            templateData: {
              firstName: revieweeProfile?.first_name || "",
              reviewerName: reviewerProfile?.first_name || "",
              sitTitle: sit.title || "",
              sitId,
              overallRating,
            },
          },
        });
      }
    } catch (e) {
      // Non-blocking: don't prevent the review from being submitted
      console.warn("Email notification failed:", e);
    }

    const { data: conv } = await supabase
      .from("conversations")
      .select("id")
      .eq("sit_id", sitId)
      .or(`owner_id.eq.${user.id},sitter_id.eq.${user.id}`)
      .maybeSingle();

    if (conv) {
      await supabase.from("messages").insert({
        conversation_id: conv.id,
        sender_id: user.id,
        content: `⭐ ${reviewerProfile?.first_name || "Un membre"} a laissé un avis. ${wouldRecommend ? "Recommandation positive !" : ""}`,
        is_system: true,
      } as any);
    }

    toast({
      title: "Avis envoyé !",
      description: "Il sera publié quand les deux parties auront donné le leur.",
    });
    navigate(`/sits/${sitId}`);
  };

  if (loading) return <div className="p-6 text-muted-foreground">Chargement...</div>;

  if (loadError) {
    return (
      <div className="p-6 md:p-10 max-w-2xl mx-auto text-center space-y-4">
        <p className="text-lg font-heading font-semibold">Impossible de laisser cet avis</p>
        <p className="text-sm text-muted-foreground">{loadError}</p>
        <div className="flex justify-center gap-3">
          <Link to="/messages"><Button variant="outline">Retour à la messagerie</Button></Link>
          {sitId && <Link to={`/sits/${sitId}`}><Button>Voir la garde</Button></Link>}
        </div>
      </div>
    );
  }

  if (!sit || !reviewee) return <div className="p-6">Garde introuvable.</div>;

  if (sit.status !== "completed") {
    return (
      <div className="p-6 md:p-10 max-w-2xl mx-auto text-center">
        <p className="text-lg font-heading font-semibold mb-2">Garde non terminée</p>
        <p className="text-sm text-muted-foreground mb-4">Vous pourrez laisser un avis une fois la garde terminée.</p>
        <Link to={`/sits/${sitId}`}><Button variant="outline">Retour à la garde</Button></Link>
      </div>
    );
  }

  if (alreadyReviewed) {
    return (
      <div className="p-6 md:p-10 max-w-2xl mx-auto text-center">
        <p className="text-lg font-heading font-semibold mb-2">Avis déjà envoyé ✓</p>
        <p className="text-sm text-muted-foreground mb-4">Vous avez déjà laissé un avis pour cette garde.</p>
        <Link to={`/sits/${sitId}`}><Button variant="outline">Retour à la garde</Button></Link>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 max-w-2xl mx-auto animate-fade-in pb-32">
      <Helmet><meta name="robots" content="noindex, nofollow" /></Helmet>

      <Link to={`/sits/${sitId}`} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="h-4 w-4" /> Retour
      </Link>

      <h1 className="font-heading text-2xl font-bold mb-1">{intro.title}</h1>
      <p className="text-sm text-muted-foreground mb-6">{intro.subtitle}</p>

      <div className="rounded-2xl border border-border bg-muted/30 p-4 mb-8">
        <div className="flex items-center gap-3 mb-2">
          {reviewee.avatar_url ? (
            <img src={reviewee.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center font-heading font-bold">
              {reviewee.first_name?.charAt(0) || "?"}
            </div>
          )}
          <div>
            <p className="font-medium">{reviewee.first_name}</p>
            <p className="text-xs text-muted-foreground">{sit.title}</p>
          </div>
        </div>
        <div className="flex items-start gap-2 text-xs text-muted-foreground">
          <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <span>
            {isOwnerReview
              ? "Vous notez ici le gardien qui a réalisé la garde."
              : "Vous notez ici le propriétaire chez qui la garde a eu lieu."}
          </span>
        </div>
      </div>

      <div className="mb-6">
        <label className="text-sm font-medium mb-2 block">Note globale</label>
        <StarRating value={overallRating} onChange={setOverallRating} size="lg" />
      </div>

      <div className="space-y-4 mb-6">
        <label className="text-sm font-medium block">Détail par critère</label>
        {criteria.map((criterion) => (
          <div key={criterion.key} className="flex items-center justify-between gap-4">
            <span className="text-sm text-muted-foreground">{criterion.label}</span>
            <StarRating
              value={subRatings[criterion.key] || 0}
              onChange={(value) => setSubRatings((prev) => ({ ...prev, [criterion.key]: value }))}
              size="sm"
            />
          </div>
        ))}
      </div>

      <div className="mb-6">
        <label className="text-sm font-medium mb-2 block">{intro.recommendation}</label>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setWouldRecommend(true)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
              wouldRecommend === true
                ? "bg-accent text-primary border-primary/30"
                : "border-border text-muted-foreground hover:bg-accent"
            }`}
          >
            <ThumbsUp className="h-4 w-4" /> Oui
          </button>
          <button
            type="button"
            onClick={() => setWouldRecommend(false)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
              wouldRecommend === false
                ? "bg-destructive/10 border-destructive/30 text-destructive"
                : "border-border text-muted-foreground hover:bg-accent"
            }`}
          >
            <ThumbsDown className="h-4 w-4" /> Non
          </button>
        </div>
      </div>

      <div className="mb-6">
        <label className="text-sm font-medium mb-2 block">
          Commentaire <span className="text-muted-foreground font-normal">(min. 50 caractères)</span>
        </label>
        <Textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder={intro.placeholder}
          rows={6}
          className="text-sm"
        />
        <p className={`text-xs mt-1 ${comment.trim().length >= 50 ? "text-primary" : "text-muted-foreground"}`}>
          {comment.trim().length}/50 caractères minimum
        </p>
      </div>

      <div className="fixed bottom-0 left-0 right-0 md:left-64 bg-card border-t border-border p-4 z-40 md:pb-4 pb-20">
        <div className="max-w-2xl mx-auto">
          <Button className="w-full h-12 text-base font-semibold" onClick={handleSubmit} disabled={!canSubmit || submitting}>
            {submitting ? "Envoi..." : "Envoyer mon avis"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default LeaveReview;
